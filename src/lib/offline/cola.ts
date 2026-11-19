/**
 * Cola de operaciones pendientes (modo offline).
 *
 * Principios:
 *  - Supabase es la única fuente de verdad: la cola solo guarda lo que el usuario hizo sin conexión
 *    y lo reenvía, EN ORDEN, cuando vuelve internet.
 *  - Un error de red NO descarta la operación (se reintenta). Un error "de negocio" (el servidor la
 *    rechazó: sin stock, pedido cancelado, permisos…) la marca como fallida para que el usuario decida.
 *  - Las operaciones deben ser idempotentes (ver `crear_pedido_mozo` con id propio): si la respuesta
 *    se pierde y se reintenta, no se duplica nada.
 *  - Sin dependencias de React ni del navegador: el almacenamiento se inyecta (así se testea).
 */

export type TipoOperacion = 'pedido.crear' | 'pedido.estado' | 'cuenta.cerrar' | 'mesa.estado'

export interface Operacion {
  id: string
  tipo: TipoOperacion
  payload: unknown
  /** Texto para mostrar al usuario ("Pedido mesa 5: 2× Milanesa"). */
  descripcion: string
  creadaEn: number
  intentos: number
  estado: 'pendiente' | 'error'
  error?: string
}

export interface Almacen {
  leer(): Operacion[]
  guardar(operaciones: Operacion[]): void
}

export type Ejecutor = (payload: never) => Promise<void>

export interface OpcionesCola {
  ejecutores: Record<TipoOperacion, Ejecutor>
  /** ¿El error es de conectividad (reintentable) o una respuesta del servidor? */
  esErrorDeRed: (error: unknown) => boolean
  /** Mensaje legible de un error (para mostrar en una operación fallida). */
  mensajeDeError: (error: unknown) => string
  generarId?: () => string
  ahora?: () => number
}

export interface ResultadoProceso {
  enviadas: number
  fallidas: number
  /** Se cortó por un error de red: quedan pendientes para el próximo intento. */
  sinConexion: boolean
}

/** Heurística para errores de conectividad de fetch / supabase-js / PostgREST. */
export function esErrorDeRedGenerico(error: unknown): boolean {
  if (error == null) return false
  const e = error as { message?: unknown; status?: unknown; code?: unknown; name?: unknown }
  const mensaje = typeof e.message === 'string' ? e.message : String(error)
  if (/failed to fetch|networkerror|network request failed|load failed|fetch failed|timeout|timed out|offline|jwt expired/i.test(mensaje)) {
    return true
  }
  if (e.name === 'AbortError') return true // (un TypeError suelto es un bug, no la red: ya lo cubre el mensaje de fetch)
  if (typeof e.status === 'number' && (e.status === 0 || e.status === 502 || e.status === 503 || e.status === 504)) return true
  if (e.code === 'PGRST000' || e.code === 'PGRST001' || e.code === 'PGRST301') return true // sin conexión a la base / JWT vencido
  return false
}

export class Cola {
  private operaciones: Operacion[]
  private oyentes = new Set<() => void>()
  private terminados = new Set<(r: ResultadoProceso) => void>()
  private procesando: Promise<ResultadoProceso> | null = null
  private readonly generarId: () => string
  private readonly ahora: () => number

  private readonly almacen: Almacen
  private readonly opciones: OpcionesCola

  constructor(almacen: Almacen, opciones: OpcionesCola) {
    this.almacen = almacen
    this.opciones = opciones
    this.operaciones = almacen.leer()
    this.generarId = opciones.generarId ?? (() => crypto.randomUUID())
    this.ahora = opciones.ahora ?? (() => Date.now())
  }

  // --- Lectura -----------------------------------------------------------------

  listar(): readonly Operacion[] {
    return this.operaciones
  }

  pendientes(): Operacion[] {
    return this.operaciones.filter((o) => o.estado === 'pendiente')
  }

  conError(): Operacion[] {
    return this.operaciones.filter((o) => o.estado === 'error')
  }

  hayPendientes(): boolean {
    return this.operaciones.some((o) => o.estado === 'pendiente')
  }

  get sincronizando(): boolean {
    return this.procesando !== null
  }

  // --- Suscripción (para useSyncExternalStore) -----------------------------------

  suscribir = (oyente: () => void): (() => void) => {
    this.oyentes.add(oyente)
    return () => {
      this.oyentes.delete(oyente)
    }
  }

  /** Avisa cada vez que termina un ciclo de envío (para refrescar los datos y mostrar el resultado). */
  alTerminar = (fn: (r: ResultadoProceso) => void): (() => void) => {
    this.terminados.add(fn)
    return () => {
      this.terminados.delete(fn)
    }
  }

  private cambio() {
    this.operaciones = [...this.operaciones] // nueva referencia: los snapshots cambian
    this.almacen.guardar(this.operaciones)
    this.oyentes.forEach((o) => o())
  }

  // --- Escritura ----------------------------------------------------------------

  encolar(tipo: TipoOperacion, payload: unknown, descripcion: string): Operacion {
    const op: Operacion = { id: this.generarId(), tipo, payload, descripcion, creadaEn: this.ahora(), intentos: 0, estado: 'pendiente' }
    this.operaciones = [...this.operaciones, op]
    this.cambio()
    return op
  }

  /** Descarta una operación (el usuario decide no reenviarla). */
  descartar(id: string): void {
    this.operaciones = this.operaciones.filter((o) => o.id !== id)
    this.cambio()
  }

  /** Vuelve a poner en cola una operación fallida. */
  reintentar(id: string): void {
    this.operaciones = this.operaciones.map((o) => (o.id === id ? { ...o, estado: 'pendiente', error: undefined } : o))
    this.cambio()
  }

  // --- Proceso ------------------------------------------------------------------

  /**
   * Envía las pendientes, una por una y en orden de creación. Si ya hay un proceso en curso devuelve
   * ese mismo (nunca corren dos a la vez: duplicaría envíos).
   */
  procesar(): Promise<ResultadoProceso> {
    if (this.procesando) return this.procesando
    this.procesando = this.correr()
      .then((r) => {
        this.terminados.forEach((fn) => fn(r))
        return r
      })
      .finally(() => {
        this.procesando = null
        this.cambio() // refresca el flag `sincronizando`
      })
    this.oyentes.forEach((o) => o())
    return this.procesando
  }

  private async correr(): Promise<ResultadoProceso> {
    const resultado: ResultadoProceso = { enviadas: 0, fallidas: 0, sinConexion: false }
    // Las que se encolen mientras se procesa también se envían en este mismo ciclo.
    for (;;) {
      const siguiente = this.operaciones.find((o) => o.estado === 'pendiente')
      if (!siguiente) break
      const ejecutor = this.opciones.ejecutores[siguiente.tipo] as ((p: unknown) => Promise<void>) | undefined
      if (!ejecutor) {
        // Tipo desconocido (por ejemplo, de una versión vieja): no se reintenta para siempre
        this.operaciones = this.operaciones.map((o) => (o.id === siguiente.id ? { ...o, estado: 'error', error: 'Operación desconocida' } : o))
        resultado.fallidas += 1
        this.cambio()
        continue
      }
      try {
        await ejecutor(siguiente.payload)
        this.operaciones = this.operaciones.filter((o) => o.id !== siguiente.id)
        resultado.enviadas += 1
      } catch (error) {
        if (this.opciones.esErrorDeRed(error)) {
          this.operaciones = this.operaciones.map((o) => (o.id === siguiente.id ? { ...o, intentos: o.intentos + 1 } : o))
          this.cambio()
          resultado.sinConexion = true
          break // el orden importa: no se salta una operación para enviar las siguientes
        }
        this.operaciones = this.operaciones.map((o) =>
          o.id === siguiente.id ? { ...o, intentos: o.intentos + 1, estado: 'error', error: this.opciones.mensajeDeError(error) } : o,
        )
        resultado.fallidas += 1
      }
      this.cambio()
    }
    return resultado
  }
}

// --- Almacenamiento en localStorage (un archivo por usuario) -----------------------

export function almacenLocal(clave: string, storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>): Almacen {
  return {
    leer() {
      try {
        const crudo = storage.getItem(clave)
        const datos: unknown = crudo ? JSON.parse(crudo) : []
        return Array.isArray(datos) ? (datos as Operacion[]) : []
      } catch {
        return []
      }
    },
    guardar(operaciones) {
      try {
        if (operaciones.length === 0) storage.removeItem(clave)
        else storage.setItem(clave, JSON.stringify(operaciones))
      } catch {
        /* sin espacio o almacenamiento bloqueado: la cola sigue funcionando en memoria */
      }
    },
  }
}
