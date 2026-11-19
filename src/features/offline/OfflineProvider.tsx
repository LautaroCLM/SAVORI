import { createContext, useCallback, useContext, useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { Operacion } from '@/lib/offline/cola'
import { crearColaDeUsuario, establecerColaActiva } from '@/services/offline'

interface EstadoOffline {
  pendientes: Operacion[]
  conError: Operacion[]
  sincronizando: boolean
  /** Cantidad enviada en el último ciclo (para el aviso "se enviaron N"). 0 = nada para mostrar. */
  recienEnviadas: number
  enviarAhora: () => void
  reintentar: (id: string) => void
  descartar: (id: string) => void
  dismissEnviadas: () => void
}

const Contexto = createContext<EstadoOffline | null>(null)
const SIN_OPERACIONES: readonly Operacion[] = []

const INTERVALO_REINTENTO_MS = 15_000

/**
 * Mantiene viva la cola de operaciones del usuario: la activa para los servicios, reintenta cuando
 * vuelve la conexión (evento `online`) y cada 15 s mientras haya pendientes, y refresca los datos
 * después de cada envío exitoso (Supabase sigue siendo la fuente de verdad).
 */
export function OfflineProvider({ usuarioId, children }: { usuarioId: string; children: ReactNode }) {
  const queryClient = useQueryClient()
  const cola = useMemo(() => crearColaDeUsuario(usuarioId), [usuarioId])
  const [recienEnviadas, setRecienEnviadas] = useState(0)

  const operaciones = useSyncExternalStore(cola.suscribir, () => cola.listar(), () => SIN_OPERACIONES)
  const sincronizando = useSyncExternalStore(cola.suscribir, () => cola.sincronizando, () => false)

  useEffect(() => {
    establecerColaActiva(cola)
    const intentar = () => {
      if (navigator.onLine && cola.hayPendientes()) void cola.procesar()
    }
    const cancelarAviso = cola.alTerminar((r) => {
      if (r.enviadas > 0) setRecienEnviadas(r.enviadas)
      // Se haya enviado o rechazado algo, lo que vale es lo del servidor: se descarta lo que se mostró "por adelantado"
      if (r.enviadas > 0 || r.fallidas > 0) void queryClient.invalidateQueries()
    })
    intentar()
    window.addEventListener('online', intentar)
    const timer = setInterval(intentar, INTERVALO_REINTENTO_MS)
    return () => {
      window.removeEventListener('online', intentar)
      clearInterval(timer)
      cancelarAviso()
      establecerColaActiva(null)
    }
  }, [cola, queryClient])

  // El aviso de "se enviaron N" se oculta solo
  useEffect(() => {
    if (recienEnviadas === 0) return
    const t = setTimeout(() => setRecienEnviadas(0), 6000)
    return () => clearTimeout(t)
  }, [recienEnviadas])

  const enviarAhora = useCallback(() => void cola.procesar(), [cola])
  const reintentar = useCallback((id: string) => { cola.reintentar(id); void cola.procesar() }, [cola])
  const descartar = useCallback((id: string) => cola.descartar(id), [cola])
  const dismissEnviadas = useCallback(() => setRecienEnviadas(0), [])

  const valor = useMemo<EstadoOffline>(
    () => ({
      pendientes: operaciones.filter((o) => o.estado === 'pendiente'),
      conError: operaciones.filter((o) => o.estado === 'error'),
      sincronizando,
      recienEnviadas,
      enviarAhora,
      reintentar,
      descartar,
      dismissEnviadas,
    }),
    [operaciones, sincronizando, recienEnviadas, enviarAhora, reintentar, descartar, dismissEnviadas],
  )

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useOffline(): EstadoOffline {
  const v = useContext(Contexto)
  if (!v) throw new Error('useOffline() se usó fuera de <OfflineProvider>')
  return v
}
