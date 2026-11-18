import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database'

export type MetodoPago = Database['public']['Enums']['metodo_pago']
export type Agrupacion = 'dia' | 'semana' | 'mes'

export interface PuntoGanancia {
  periodo: string // YYYY-MM-DD (inicio del día, semana o mes)
  pedidos: number
  unidades: number
  ingresos: number
  costos: number
  ganancia: number
}

export interface ProductoVendido {
  nombre: string
  unidades: number
  ingresos: number
  ganancia: number
}

/** Ganancias de pedidos ENTREGADOS entre dos fechas (YYYY-MM-DD, inclusive), agrupadas. Solo admin. */
export async function resumenGanancias(desde: string, hasta: string, agrupar: Agrupacion): Promise<PuntoGanancia[]> {
  const { data, error } = await supabase.rpc('resumen_ganancias', { p_desde: desde, p_hasta: hasta, p_agrupar: agrupar })
  if (error) throw error
  return data as unknown as PuntoGanancia[]
}

export async function productosMasVendidos(desde: string, hasta: string, limite = 10): Promise<ProductoVendido[]> {
  const { data, error } = await supabase.rpc('productos_mas_vendidos', { p_desde: desde, p_hasta: hasta, p_limite: limite })
  if (error) throw error
  return data as unknown as ProductoVendido[]
}

export interface CobroPorMetodo {
  metodo: MetodoPago | null
  total: number
  cuentas: number
}

/** Cuentas cerradas en el rango (según el día local del navegador), sumadas por medio de pago. */
export async function cobrosPorMetodo(desde: string, hasta: string): Promise<CobroPorMetodo[]> {
  const ini = new Date(`${desde}T00:00:00`)
  const fin = new Date(`${hasta}T00:00:00`)
  fin.setDate(fin.getDate() + 1)
  const { data, error } = await supabase
    .from('sesiones_mesa')
    .select('total, metodo_pago')
    .not('cerrada_at', 'is', null)
    .gte('cerrada_at', ini.toISOString())
    .lt('cerrada_at', fin.toISOString())
  if (error) throw error
  const acumulado = new Map<MetodoPago | null, CobroPorMetodo>()
  for (const s of data) {
    const fila = acumulado.get(s.metodo_pago) ?? { metodo: s.metodo_pago, total: 0, cuentas: 0 }
    fila.total += Number(s.total)
    fila.cuentas += 1
    acumulado.set(s.metodo_pago, fila)
  }
  return [...acumulado.values()].sort((a, b) => b.total - a.total)
}
