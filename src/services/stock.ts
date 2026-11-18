import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database'
import type { Producto } from './carta'

export type TipoMovimiento = Database['public']['Enums']['tipo_movimiento_stock']

export interface Movimiento {
  id: string
  tipo: TipoMovimiento
  cantidad: number
  motivo: string | null
  created_at: string
  productos: { nombre: string } | null
}

export type EstadoStock = 'agotado' | 'bajo' | 'ok'

/** Agotado (0), bajo (en o por debajo del mínimo) u ok. Solo tiene sentido si el producto controla stock. */
export function estadoStock(p: Pick<Producto, 'stock_actual' | 'stock_minimo'>): EstadoStock {
  if (p.stock_actual <= 0) return 'agotado'
  if (p.stock_actual <= p.stock_minimo) return 'bajo'
  return 'ok'
}

export async function listarMovimientos(limite = 100): Promise<Movimiento[]> {
  const { data, error } = await supabase
    .from('movimientos_stock')
    .select('id, tipo, cantidad, motivo, created_at, productos(nombre)')
    .order('created_at', { ascending: false })
    .limit(limite)
  if (error) throw error
  return data as unknown as Movimiento[]
}

/** Entrada (compra), salida (merma) o ajuste (conteo físico). Devuelve el stock resultante. */
export async function registrarMovimiento(productoId: string, tipo: TipoMovimiento, cantidad: number, motivo: string): Promise<number> {
  const { data, error } = await supabase.rpc('registrar_movimiento_stock', {
    p_producto_id: productoId,
    p_tipo: tipo,
    p_cantidad: cantidad,
    p_motivo: motivo.trim() || undefined,
  })
  if (error) throw error
  return data
}

export async function configurarStock(productoId: string, cambios: { controla_stock: boolean; stock_minimo: number }): Promise<void> {
  const { error } = await supabase.from('productos').update(cambios).eq('id', productoId)
  if (error) throw error
}
