import { Cola, almacenLocal, esErrorDeRedGenerico, type Ejecutor, type TipoOperacion } from '@/lib/offline/cola'
import { mensajeDeError } from '@/lib/errores'

/**
 * Punto único del modo offline para la capa de servicios.
 *
 * Los servicios de operaciones "de servicio" (cambiar estado de un pedido, cargar un pedido, cerrar
 * una cuenta, marcar una mesa) llaman a `ejecutarOEncolar`: si hay conexión se envía en el acto; si no
 * (o si falla la red) se guarda en la cola local y se reenvía, en orden, al volver internet.
 * Los componentes y hooks no cambian: solo ven si la operación quedó `encolada`.
 */

const ejecutores: Partial<Record<TipoOperacion, Ejecutor>> = {}

/** Cada servicio registra cómo se envía realmente su operación al servidor. */
export function registrarEjecutor<P>(tipo: TipoOperacion, ejecutor: (payload: P) => Promise<void>): void {
  ejecutores[tipo] = ejecutor as Ejecutor
}

let colaActiva: Cola | null = null

/** Crea la cola del usuario (una por usuario, guardada en este dispositivo). No la activa. */
export function crearColaDeUsuario(usuarioId: string): Cola {
  return new Cola(almacenLocal(`savori:cola:${usuarioId}`, localStorage), {
    ejecutores: ejecutores as Record<TipoOperacion, Ejecutor>,
    esErrorDeRed: esErrorDeRedGenerico,
    mensajeDeError,
  })
}

/** Define la cola a la que se encolan las operaciones (la del usuario logueado) o `null` al salir. */
export function establecerColaActiva(cola: Cola | null): void {
  colaActiva = cola
}

export function colaActual(): Cola | null {
  return colaActiva
}

export interface ResultadoOperacion {
  /** `true` = quedó en la cola (sin conexión o con envíos pendientes por delante). */
  encolado: boolean
}

/**
 * Envía la operación o la encola.
 *  - Sin conexión → se encola.
 *  - Con conexión pero con operaciones pendientes por delante → se encola (para no adelantarse: el orden importa).
 *  - Con conexión → se envía; si falla por la red, se encola. Si el servidor la rechaza, el error se propaga.
 */
export async function ejecutarOEncolar<P>(tipo: TipoOperacion, payload: P, descripcion: string): Promise<ResultadoOperacion> {
  const ejecutor = ejecutores[tipo] as ((p: P) => Promise<void>) | undefined
  if (!ejecutor) throw new Error(`No hay ejecutor para ${tipo}`)

  const cola = colaActiva
  if (!cola) {
    await ejecutor(payload) // sin sesión activa (no debería pasar en el dashboard): envío directo
    return { encolado: false }
  }

  if (!navigator.onLine || cola.hayPendientes()) {
    cola.encolar(tipo, payload, descripcion)
    if (navigator.onLine) void cola.procesar()
    return { encolado: true }
  }

  try {
    await ejecutor(payload)
    return { encolado: false }
  } catch (error) {
    if (esErrorDeRedGenerico(error)) {
      cola.encolar(tipo, payload, descripcion)
      return { encolado: true }
    }
    throw error
  }
}
