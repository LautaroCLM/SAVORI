/**
 * Pruebas de seguridad multi-restaurante contra la base LOCAL (`npx supabase start`).
 * Comando: `npm run test:rls`.
 *
 * Crea un segundo restaurante ("B") con su admin y ataca los datos del restaurante de demo ("A")
 * por la API, igual que lo haría alguien con una cuenta propia y malas intenciones. También prueba
 * roles dentro de un mismo restaurante, usuarios desactivados, restaurante suspendido y el acceso
 * anónimo de la carta por QR. Al terminar borra todo lo que creó.
 */
import { execSync } from 'node:child_process'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

// --- Entorno local ---------------------------------------------------------------
function entornoLocal(): Record<string, string> {
  let salida: string
  try {
    salida = execSync('npx supabase status -o env', { stdio: ['ignore', 'pipe', 'ignore'] }).toString()
  } catch {
    throw new Error('Supabase local no está corriendo. Levantalo con `npx supabase start`.')
  }
  return Object.fromEntries(
    salida
      .split('\n')
      .filter((l) => l.includes('='))
      .map((l) => {
        const i = l.indexOf('=')
        return [l.slice(0, i), l.slice(i + 1).replace(/^"|"$/g, '')]
      }),
  )
}

const env = entornoLocal()
const URL_API = env.API_URL
if (!/^http:\/\/(127\.0\.0\.1|localhost)/.test(URL_API)) throw new Error('Estas pruebas solo corren contra Supabase LOCAL')

const opciones = { auth: { persistSession: false, autoRefreshToken: false } }
/** Cliente con privilegios totales: solo para preparar datos y verificar el estado real. */
const servicio = createClient(URL_API, env.SERVICE_ROLE_KEY, opciones)
const anonimo = createClient(URL_API, env.ANON_KEY, opciones)

async function sesion(email: string, clave = 'demo1234'): Promise<SupabaseClient> {
  const c = createClient(URL_API, env.ANON_KEY, opciones)
  const { error } = await c.auth.signInWithPassword({ email, password: clave })
  if (error) throw new Error(`No se pudo iniciar sesión como ${email}: ${error.message}`)
  return c
}

// --- Datos del restaurante de demo (A), del seed ---------------------------------
const RESTO_A = '10000000-0000-4000-a000-000000000001'
// resumen_ganancias acepta hasta ~3 años: los últimos 1000 días cubren todas las ventas de demo
const dia = (offset: number) => new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10)
const RANGO = { p_desde: dia(-1000), p_hasta: dia(1), p_agrupar: 'mes' }
const sufijo = Date.now().toString(36)
const EMAIL_B = `admin-b-${sufijo}@prueba.test`
const CLAVE_B = `Prueba-${sufijo}-x9`

let adminA: SupabaseClient
let mozoA: SupabaseClient
let cocinaA: SupabaseClient
let adminB: SupabaseClient
let usuarioB = ''
let restoB = ''

// Una muestra de cada cosa del restaurante A
let productoA: { id: string; precio: number; nombre: string }
let categoriaA: string
let mesaA: { id: string; qr_token: string }
let perfilMozoA: string

beforeAll(async () => {
  adminA = await sesion('admin@demo.test')
  mozoA = await sesion('mozo@demo.test')
  cocinaA = await sesion('cocina@demo.test')

  const { data: p } = await servicio.from('productos').select('id, precio, nombre, categoria_id').eq('restaurante_id', RESTO_A).limit(1).single()
  productoA = p!
  categoriaA = p!.categoria_id
  const { data: m } = await servicio.from('mesas').select('id, qr_token').eq('restaurante_id', RESTO_A).limit(1).single()
  mesaA = m!
  const { data: pf } = await servicio.from('perfiles').select('id').eq('restaurante_id', RESTO_A).eq('rol', 'mozo').limit(1).single()
  perfilMozoA = pf!.id

  // Restaurante B: un usuario nuevo crea el suyo, como en el onboarding real
  const { data: creado, error } = await servicio.auth.admin.createUser({ email: EMAIL_B, password: CLAVE_B, email_confirm: true })
  if (error) throw error
  usuarioB = creado.user.id
  adminB = await sesion(EMAIL_B, CLAVE_B)
  const { data: id, error: e2 } = await adminB.rpc('crear_mi_restaurante', { p_nombre_restaurante: 'Restaurante B (prueba)', p_mi_nombre: 'Admin B' })
  if (e2) throw e2
  restoB = id as string
}, 60_000)

afterAll(async () => {
  // Si una prueba falla es porque el ataque FUNCIONÓ y cambió datos de A: se deshace acá,
  // para que un agujero de seguridad no deje rota la base de demo.
  await servicio.from('restaurantes').update({ activo: true }).eq('id', RESTO_A)
  await servicio.from('perfiles').update({ activo: true, rol: 'mozo' }).eq('id', perfilMozoA)
  if (productoA) await servicio.from('productos').update({ precio: productoA.precio }).eq('id', productoA.id)
  await servicio.from('productos').delete().eq('restaurante_id', RESTO_A).eq('nombre', 'Intruso')
  if (restoB) await servicio.from('restaurantes').delete().eq('id', restoB)
  if (usuarioB) await servicio.auth.admin.deleteUser(usuarioB)
})

// --- 1. Un restaurante no ve los datos de otro -----------------------------------
describe('Aislamiento: el admin de B no ve nada de A', () => {
  const tablas = ['restaurantes', 'perfiles', 'salones', 'mesas', 'categorias', 'productos', 'sesiones_mesa', 'pedidos', 'pedido_items', 'movimientos_stock', 'invitaciones'] as const

  for (const tabla of tablas) {
    it(`${tabla}: ninguna fila de A`, async () => {
      const columna = tabla === 'restaurantes' ? 'id' : 'restaurante_id'
      const { data, error } = await adminB.from(tabla).select('*').eq(columna, RESTO_A)
      expect(error).toBeNull()
      expect(data).toEqual([])
    })
  }

  it('sin filtro, solo ve su propio restaurante', async () => {
    const { data } = await adminB.from('restaurantes').select('id')
    expect(data).toEqual([{ id: restoB }])
  })
})

// --- 2. Ni puede modificarlos ----------------------------------------------------
describe('Aislamiento: el admin de B no modifica nada de A', () => {
  it('no cambia el precio de un producto de A', async () => {
    await adminB.from('productos').update({ precio: 1 }).eq('id', productoA.id)
    const { data } = await servicio.from('productos').select('precio').eq('id', productoA.id).single()
    expect(Number(data!.precio)).toBe(Number(productoA.precio))
  })

  it('no borra una categoría de A', async () => {
    await adminB.from('categorias').delete().eq('id', categoriaA)
    const { count } = await servicio.from('categorias').select('id', { count: 'exact', head: true }).eq('id', categoriaA)
    expect(count).toBe(1)
  })

  it('no puede crear un producto dentro de A', async () => {
    const { data: antes } = await servicio.from('productos').select('id').eq('restaurante_id', RESTO_A)
    await adminB.from('productos').insert({ restaurante_id: RESTO_A, categoria_id: categoriaA, nombre: 'Intruso', precio: 1 })
    const { data: despues } = await servicio.from('productos').select('id').eq('restaurante_id', RESTO_A)
    expect(despues!.length).toBe(antes!.length)
  })

  it('no puede cambiarle el rol a un empleado de A', async () => {
    await adminB.from('perfiles').update({ rol: 'admin' }).eq('id', perfilMozoA)
    const { data } = await servicio.from('perfiles').select('rol').eq('id', perfilMozoA).single()
    expect(data!.rol).toBe('mozo')
  })

  it('no puede regenerar el QR de una mesa de A', async () => {
    const { error } = await adminB.rpc('regenerar_qr_mesa', { p_mesa_id: mesaA.id })
    expect(error).not.toBeNull()
    const { data } = await servicio.from('mesas').select('qr_token').eq('id', mesaA.id).single()
    expect(data!.qr_token).toBe(mesaA.qr_token)
  })

  it('no puede mover el stock de un producto de A', async () => {
    const { error } = await adminB.rpc('registrar_movimiento_stock', { p_producto_id: productoA.id, p_tipo: 'entrada', p_cantidad: 5 })
    expect(error).not.toBeNull()
  })

  it('no puede cargar un pedido en una mesa de A', async () => {
    const { error } = await adminB.rpc('crear_pedido_mozo', { p_mesa_id: mesaA.id, p_items: [{ producto_id: productoA.id, cantidad: 1 }] })
    expect(error).not.toBeNull()
  })

  it('las ganancias de B no incluyen ventas de A', async () => {
    const { data, error } = await adminB.rpc('resumen_ganancias', RANGO)
    expect(error).toBeNull()
    const totales = JSON.stringify(data)
    const { data: deA } = await adminA.rpc('resumen_ganancias', RANGO)
    expect(JSON.stringify(deA)).not.toBe(totales)
    expect(totales).not.toMatch(/[1-9]/) // B no tiene ventas: todo en cero
  })
})

// --- 3. Roles dentro del mismo restaurante ---------------------------------------
describe('Roles dentro de A', () => {
  it('un mozo no puede cambiar precios', async () => {
    await mozoA.from('productos').update({ precio: 1 }).eq('id', productoA.id)
    const { data } = await servicio.from('productos').select('precio').eq('id', productoA.id).single()
    expect(Number(data!.precio)).toBe(Number(productoA.precio))
  })

  it('un mozo no puede ascenderse a admin', async () => {
    const { data: yo } = await mozoA.auth.getUser()
    await mozoA.from('perfiles').update({ rol: 'admin' }).eq('id', yo.user!.id)
    const { data } = await servicio.from('perfiles').select('rol').eq('id', yo.user!.id).single()
    expect(data!.rol).toBe('mozo')
  })

  it('cocina no puede cargar pedidos', async () => {
    const { error } = await cocinaA.rpc('crear_pedido_mozo', { p_mesa_id: mesaA.id, p_items: [{ producto_id: productoA.id, cantidad: 1 }] })
    expect(error).not.toBeNull()
  })

  it('un mozo no ve invitaciones ni ganancias', async () => {
    const { data } = await mozoA.from('invitaciones').select('id')
    expect(data).toEqual([])
    const { error } = await mozoA.rpc('resumen_ganancias', RANGO)
    expect(error).not.toBeNull()
  })

  it('un mozo no puede generar invitaciones', async () => {
    const { error } = await mozoA.rpc('generar_invitacion', { p_rol: 'admin' })
    expect(error).not.toBeNull()
  })
})

// --- 4. Cuentas desactivadas o suspendidas ---------------------------------------
describe('Cuentas desactivadas o suspendidas', () => {
  it('un empleado desactivado deja de ver datos aunque su sesión siga abierta', async () => {
    await servicio.from('perfiles').update({ activo: false }).eq('id', perfilMozoA)
    try {
      const { data } = await mozoA.from('productos').select('id')
      expect(data).toEqual([])
      const { error } = await mozoA.rpc('crear_pedido_mozo', { p_mesa_id: mesaA.id, p_items: [{ producto_id: productoA.id, cantidad: 1 }] })
      expect(error).not.toBeNull()
    } finally {
      await servicio.from('perfiles').update({ activo: true }).eq('id', perfilMozoA)
    }
  })

  it('con el restaurante suspendido, ni su admin ve datos y su carta QR deja de funcionar', async () => {
    await servicio.from('restaurantes').update({ activo: false }).eq('id', RESTO_A)
    try {
      const { data } = await adminA.from('productos').select('id')
      expect(data).toEqual([])
      const { data: carta } = await anonimo.rpc('obtener_carta', { p_token: mesaA.qr_token })
      expect(carta).toBeNull()
    } finally {
      await servicio.from('restaurantes').update({ activo: true }).eq('id', RESTO_A)
    }
  })

  it('alguien que ya tiene restaurante no puede crear otro ni unirse a otro', async () => {
    const { error } = await adminB.rpc('crear_mi_restaurante', { p_nombre_restaurante: 'Otro', p_mi_nombre: 'X' })
    expect(error).not.toBeNull()
    const { data: codigo } = await adminA.rpc('generar_invitacion', { p_rol: 'admin' })
    const { error: e2 } = await adminB.rpc('unirme_con_codigo', { p_codigo: codigo as string, p_mi_nombre: 'Intruso' })
    expect(e2).not.toBeNull()
    await servicio.from('invitaciones').delete().eq('codigo', codigo as string)
  })
})

// --- 5. Acceso anónimo (clientes con el QR) --------------------------------------
describe('Acceso anónimo', () => {
  const tablas = ['restaurantes', 'perfiles', 'mesas', 'productos', 'pedidos', 'invitaciones', 'movimientos_stock'] as const
  for (const tabla of tablas) {
    it(`no lee la tabla ${tabla}`, async () => {
      const { data } = await anonimo.from(tabla).select('*').limit(1)
      expect(data ?? []).toEqual([])
    })
  }

  it('con un token válido ve la carta, sin costos ni stock', async () => {
    const { data } = await anonimo.rpc('obtener_carta', { p_token: mesaA.qr_token })
    expect(data).not.toBeNull()
    const texto = JSON.stringify(data)
    expect(texto).not.toMatch(/"costo"|"stock_actual"|"stock_minimo"/)
  })

  it('con un token inventado no ve nada', async () => {
    const { data } = await anonimo.rpc('obtener_carta', { p_token: 'token-inventado-123' })
    expect(data).toBeNull()
  })

  it('no puede pedir con el QR de A un producto de otro restaurante', async () => {
    const { data: catB } = await servicio.from('categorias').insert({ restaurante_id: restoB, nombre: 'Cat B' }).select('id').single()
    const { data: prodB } = await servicio.from('productos').insert({ restaurante_id: restoB, categoria_id: catB!.id, nombre: 'Prod B', precio: 1 }).select('id').single()
    const { error } = await anonimo.rpc('crear_pedido_qr', { p_token: mesaA.qr_token, p_items: [{ producto_id: prodB!.id, cantidad: 1 }] })
    expect(error).not.toBeNull()
  })

  it('no puede ejecutar funciones internas', async () => {
    for (const [fn, args] of [
      ['mi_contexto', {}],
      ['generar_invitacion', { p_rol: 'admin' }],
      ['resumen_ganancias', RANGO],
      ['regenerar_qr_mesa', { p_mesa_id: mesaA.id }],
    ] as const) {
      const { error } = await anonimo.rpc(fn, args)
      expect(error, fn).not.toBeNull()
    }
  })
})
