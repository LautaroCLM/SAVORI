import { supabase } from '@/lib/supabase'

export type TablaRealtime = 'pedidos' | 'pedido_items' | 'mesas' | 'sesiones_mesa'
const TABLAS: TablaRealtime[] = ['pedidos', 'pedido_items', 'mesas', 'sesiones_mesa']

export interface EventoRealtime {
  tabla: TablaRealtime
  tipo: 'INSERT' | 'UPDATE' | 'DELETE'
  nuevo: Record<string, unknown>
}

/**
 * Escucha los cambios del restaurante (filtrados por restaurante_id; además Realtime aplica la RLS
 * del usuario). Devuelve la función para cancelar la suscripción.
 */
export function suscribirRestaurante(
  restauranteId: string,
  onEvento: (e: EventoRealtime) => void,
  onEstado: (estado: string) => void,
): () => void {
  const canal = supabase.channel(`restaurante-${restauranteId}`)
  for (const tabla of TABLAS) {
    canal.on('postgres_changes', { event: '*', schema: 'public', table: tabla, filter: `restaurante_id=eq.${restauranteId}` }, (payload) =>
      onEvento({ tabla, tipo: payload.eventType, nuevo: payload.new as Record<string, unknown> }),
    )
  }
  canal.subscribe((estado) => onEstado(estado))
  return () => {
    void supabase.removeChannel(canal)
  }
}
