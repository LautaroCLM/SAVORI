import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { reproducirAviso } from '@/lib/sonido'
import { suscribirRestaurante, type TablaRealtime } from '@/services/realtime'

const CLAVES: Record<TablaRealtime, string[]> = {
  pedidos: ['pedidos', 'sesiones', 'productos', 'movimientos'],
  pedido_items: ['pedidos', 'productos', 'movimientos'],
  mesas: ['mesas'],
  sesiones_mesa: ['sesiones', 'pedidos'],
}

/**
 * Mantiene al dashboard sincronizado: ante cualquier cambio del restaurante invalida las consultas
 * afectadas (agrupadas en 150 ms, porque un pedido dispara varios eventos seguidos). Si la conexión
 * se cae y vuelve, resincroniza todo. Suena un aviso cuando entra un pedido nuevo.
 */
export function useRealtimeRestaurante(restauranteId: string) {
  const queryClient = useQueryClient()

  useEffect(() => {
    const pendientes = new Set<string>()
    let timer: ReturnType<typeof setTimeout> | undefined
    const invalidar = (claves: string[]) => {
      claves.forEach((c) => pendientes.add(c))
      clearTimeout(timer)
      timer = setTimeout(() => {
        pendientes.forEach((c) => void queryClient.invalidateQueries({ queryKey: [c] }))
        pendientes.clear()
      }, 150)
    }

    let conectadoAntes = false
    const cancelar = suscribirRestaurante(
      restauranteId,
      (e) => {
        invalidar(CLAVES[e.tabla])
        if (e.tabla === 'pedidos' && e.tipo === 'INSERT') reproducirAviso()
      },
      (estado) => {
        if (estado === 'SUBSCRIBED') {
          if (conectadoAntes) invalidar(['pedidos', 'sesiones', 'mesas']) // se reconectó: recuperar lo perdido
          conectadoAntes = true
        }
      },
    )
    return () => {
      clearTimeout(timer)
      cancelar()
    }
  }, [restauranteId, queryClient])
}
