import { describe, expect, it, vi } from 'vitest'
import { Cola, almacenLocal, esErrorDeRedGenerico, type Almacen, type Operacion, type TipoOperacion } from './cola'

function almacenEnMemoria(inicial: Operacion[] = []): Almacen & { datos: Operacion[] } {
  const a = {
    datos: inicial,
    leer: () => a.datos,
    guardar: (ops: Operacion[]) => {
      a.datos = ops
    },
  }
  return a
}

const errorDeRed = () => Object.assign(new Error('TypeError: Failed to fetch'), { name: 'TypeError' })
const errorDeNegocio = (msg = 'SIN_STOCK') => Object.assign(new Error(msg), { code: 'P0001' })

function crearCola(ejecutores: Partial<Record<TipoOperacion, (p: never) => Promise<void>>> = {}, almacen = almacenEnMemoria()) {
  let n = 0
  const base = {
    'pedido.crear': vi.fn(async () => {}),
    'pedido.estado': vi.fn(async () => {}),
    'cuenta.cerrar': vi.fn(async () => {}),
    'mesa.estado': vi.fn(async () => {}),
  }
  const cola = new Cola(almacen, {
    ejecutores: { ...base, ...ejecutores } as never,
    esErrorDeRed: esErrorDeRedGenerico,
    mensajeDeError: (e) => (e instanceof Error ? e.message : 'error'),
    generarId: () => `op-${++n}`,
    ahora: () => 1000 + n,
  })
  return { cola, almacen, base }
}

describe('Cola de operaciones offline', () => {
  it('encola y persiste en el almacén', () => {
    const { cola, almacen } = crearCola()
    const op = cola.encolar('pedido.estado', { id: 'p1', estado: 'listo' }, 'Pedido mesa 5 → Listo')
    expect(op).toMatchObject({ id: 'op-1', estado: 'pendiente', intentos: 0 })
    expect(cola.pendientes()).toHaveLength(1)
    expect(almacen.datos).toHaveLength(1)
  })

  it('retoma lo que quedó guardado (por ejemplo tras cerrar la app)', () => {
    const previa: Operacion = { id: 'x', tipo: 'pedido.estado', payload: {}, descripcion: 'd', creadaEn: 1, intentos: 0, estado: 'pendiente' }
    const { cola } = crearCola({}, almacenEnMemoria([previa]))
    expect(cola.pendientes().map((o) => o.id)).toEqual(['x'])
  })

  it('envía en orden FIFO y vacía la cola', async () => {
    const orden: string[] = []
    const { cola } = crearCola({
      'pedido.crear': async (p: never) => void orden.push(`crear:${(p as { id: string }).id}`),
      'pedido.estado': async (p: never) => void orden.push(`estado:${(p as { id: string }).id}`),
      'cuenta.cerrar': async (p: never) => void orden.push(`cuenta:${(p as { id: string }).id}`),
    })
    cola.encolar('pedido.crear', { id: 'a' }, '1')
    cola.encolar('pedido.estado', { id: 'b' }, '2')
    cola.encolar('cuenta.cerrar', { id: 'c' }, '3')
    const r = await cola.procesar()
    expect(orden).toEqual(['crear:a', 'estado:b', 'cuenta:c'])
    expect(r).toEqual({ enviadas: 3, fallidas: 0, sinConexion: false })
    expect(cola.listar()).toHaveLength(0)
  })

  it('un error de red NO descarta la operación y frena el resto (el orden importa)', async () => {
    const llamadas: string[] = []
    const { cola } = crearCola({
      'pedido.crear': async () => {
        llamadas.push('crear')
        throw errorDeRed()
      },
      'pedido.estado': async () => void llamadas.push('estado'),
    })
    cola.encolar('pedido.crear', {}, 'primero')
    cola.encolar('pedido.estado', {}, 'segundo')
    const r = await cola.procesar()
    expect(r).toMatchObject({ enviadas: 0, sinConexion: true })
    expect(llamadas).toEqual(['crear']) // la segunda no se adelantó
    expect(cola.pendientes()).toHaveLength(2)
    expect(cola.pendientes()[0].intentos).toBe(1)
  })

  it('al volver la conexión se reintenta y se completa', async () => {
    let conectado = false
    const crear = vi.fn(async () => {
      if (!conectado) throw errorDeRed()
    })
    const { cola } = crearCola({ 'pedido.crear': crear })
    cola.encolar('pedido.crear', {}, 'pedido')
    expect((await cola.procesar()).sinConexion).toBe(true)
    conectado = true
    expect(await cola.procesar()).toMatchObject({ enviadas: 1, sinConexion: false })
    expect(cola.listar()).toHaveLength(0)
    expect(crear).toHaveBeenCalledTimes(2)
  })

  it('un rechazo del servidor marca la operación con error y sigue con las demás', async () => {
    const { cola, base } = crearCola({
      'pedido.crear': async () => {
        throw errorDeNegocio('SIN_STOCK')
      },
    })
    cola.encolar('pedido.crear', {}, 'sin stock')
    cola.encolar('pedido.estado', {}, 'esta sí se envía')
    const r = await cola.procesar()
    expect(r).toEqual({ enviadas: 1, fallidas: 1, sinConexion: false })
    expect(base['pedido.estado']).toHaveBeenCalledTimes(1)
    expect(cola.conError()).toHaveLength(1)
    expect(cola.conError()[0]).toMatchObject({ estado: 'error', error: 'SIN_STOCK', intentos: 1 })
    expect(cola.hayPendientes()).toBe(false)
  })

  it('las operaciones con error no se reenvían solas, pero se pueden reintentar o descartar', async () => {
    let falla = true
    const crear = vi.fn(async () => {
      if (falla) throw errorDeNegocio()
    })
    const { cola } = crearCola({ 'pedido.crear': crear })
    const op = cola.encolar('pedido.crear', {}, 'x')
    await cola.procesar()
    await cola.procesar() // no debe volver a intentarla
    expect(crear).toHaveBeenCalledTimes(1)

    falla = false
    cola.reintentar(op.id)
    expect(cola.pendientes()).toHaveLength(1)
    await cola.procesar()
    expect(cola.listar()).toHaveLength(0)

    const otra = cola.encolar('pedido.crear', {}, 'y')
    cola.descartar(otra.id)
    expect(cola.listar()).toHaveLength(0)
  })

  it('nunca corren dos procesos a la vez (evita enviar dos veces)', async () => {
    let enVuelo = 0
    let maximo = 0
    const lenta = vi.fn(async () => {
      enVuelo += 1
      maximo = Math.max(maximo, enVuelo)
      await new Promise((r) => setTimeout(r, 10))
      enVuelo -= 1
    })
    const { cola } = crearCola({ 'pedido.estado': lenta })
    cola.encolar('pedido.estado', {}, 'a')
    cola.encolar('pedido.estado', {}, 'b')
    const [r1, r2] = await Promise.all([cola.procesar(), cola.procesar()])
    expect(r1).toBe(r2) // el mismo proceso
    expect(maximo).toBe(1)
    expect(lenta).toHaveBeenCalledTimes(2)
  })

  it('una operación encolada mientras se procesa se envía en el mismo ciclo', async () => {
    let yaEncolo = false
    const { cola, base } = crearCola({
      'pedido.estado': async () => {
        if (!yaEncolo) {
          yaEncolo = true
          cola.encolar('cuenta.cerrar', {}, 'tarde')
        }
      },
    })
    cola.encolar('pedido.estado', {}, 'primera')
    await cola.procesar()
    expect(base['cuenta.cerrar']).toHaveBeenCalledTimes(1)
    expect(cola.listar()).toHaveLength(0)
  })

  it('avisa a los suscriptores en cada cambio y se puede cancelar la suscripción', async () => {
    const { cola } = crearCola()
    const oyente = vi.fn()
    const cancelar = cola.suscribir(oyente)
    cola.encolar('pedido.estado', {}, 'a')
    expect(oyente).toHaveBeenCalled()
    const llamadas = oyente.mock.calls.length
    cancelar()
    cola.encolar('pedido.estado', {}, 'b')
    expect(oyente.mock.calls.length).toBe(llamadas)
  })

  it('cambia la referencia de listar() en cada cambio (necesario para useSyncExternalStore)', () => {
    const { cola } = crearCola()
    const antes = cola.listar()
    cola.encolar('pedido.estado', {}, 'a')
    expect(cola.listar()).not.toBe(antes)
  })
})

describe('Cola: casos límite', () => {
  it('un tipo de operación desconocido se marca con error (no se reintenta para siempre)', async () => {
    const { cola } = crearCola()
    const desconocida: Operacion = { id: 'z', tipo: 'otra.cosa' as never, payload: {}, descripcion: 'x', creadaEn: 1, intentos: 0, estado: 'pendiente' }
    const c2 = new Cola(almacenEnMemoria([desconocida]), { ejecutores: {} as never, esErrorDeRed: esErrorDeRedGenerico, mensajeDeError: () => 'e' })
    const r = await c2.procesar()
    expect(r.fallidas).toBe(1)
    expect(c2.conError()[0].error).toBe('Operación desconocida')
    expect(cola.listar()).toHaveLength(0)
  })

  it('un bug (TypeError que no es de red) no se reintenta eternamente', async () => {
    const { cola } = crearCola({
      'pedido.estado': async () => {
        throw new TypeError("Cannot read properties of undefined (reading 'x')")
      },
    })
    cola.encolar('pedido.estado', {}, 'a')
    const r = await cola.procesar()
    expect(r).toMatchObject({ fallidas: 1, sinConexion: false })
  })
})

describe('esErrorDeRedGenerico', () => {
  it.each([
    ['fetch caído', new TypeError('Failed to fetch')],
    ['mensaje de supabase-js', { message: 'TypeError: Failed to fetch', code: '' }],
    ['timeout', { message: 'Request timeout' }],
    ['502', { message: 'Bad gateway', status: 502 }],
    ['JWT vencido (se renueva al reconectar)', { message: 'JWT expired', code: 'PGRST301' }],
    ['sin conexión a la base', { message: 'x', code: 'PGRST000' }],
  ])('es de red: %s', (_n, e) => expect(esErrorDeRedGenerico(e)).toBe(true))

  it.each([
    ['sin stock', { message: 'SIN_STOCK', code: 'P0001' }],
    ['permisos', { message: 'new row violates row-level security policy', code: '42501' }],
    ['unicidad', { message: 'duplicate key', code: '23505' }],
    ['nada', null],
  ])('NO es de red: %s', (_n, e) => expect(esErrorDeRedGenerico(e)).toBe(false))
})

describe('almacenLocal', () => {
  const storageFalso = () => {
    const m = new Map<string, string>()
    return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k), m }
  }

  it('guarda, lee y borra la clave cuando la cola queda vacía', () => {
    const s = storageFalso()
    const a = almacenLocal('cola:u1', s)
    const op: Operacion = { id: '1', tipo: 'pedido.estado', payload: {}, descripcion: 'd', creadaEn: 1, intentos: 0, estado: 'pendiente' }
    a.guardar([op])
    expect(a.leer()).toEqual([op])
    a.guardar([])
    expect(s.m.has('cola:u1')).toBe(false)
  })

  it('tolera datos corruptos', () => {
    const s = storageFalso()
    s.setItem('cola:u1', '{no es json')
    expect(almacenLocal('cola:u1', s).leer()).toEqual([])
    s.setItem('cola:u1', '{"a":1}')
    expect(almacenLocal('cola:u1', s).leer()).toEqual([])
  })

  it('cada usuario tiene su propia cola', () => {
    const s = storageFalso()
    const op: Operacion = { id: '1', tipo: 'pedido.estado', payload: {}, descripcion: 'd', creadaEn: 1, intentos: 0, estado: 'pendiente' }
    almacenLocal('cola:u1', s).guardar([op])
    expect(almacenLocal('cola:u2', s).leer()).toEqual([])
  })
})
