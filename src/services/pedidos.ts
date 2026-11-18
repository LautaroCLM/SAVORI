import { supabase } from '@/lib/supabase'
import type { Database, Json } from '@/types/database'

export type EstadoPedido = Database['public']['Enums']['estado_pedido']
export type MetodoPago = Database['public']['Enums']['metodo_pago']

export interface ItemPedido {
  id: string
  nombre_snapshot: string
  precio_unitario: number
  cantidad: number
  notas: string | null
}

export interface PedidoConItems {
  id: string
  mesa_id: string
  sesion_id: string | null
  origen: 'qr' | 'mozo'
  estado: EstadoPedido
  total: number
  notas: string | null
  created_at: string
  mesas: { numero: number } | null
  pedido_items: ItemPedido[]
}

export interface SesionAbierta {
  id: string
  mesa_id: string
  abierta_at: string
  total: number
}

const SELECT =
  'id, mesa_id, sesion_id, origen, estado, total, notas, created_at, mesas(numero), pedido_items(id, nombre_snapshot, precio_unitario, cantidad, notas)'

export const ESTADOS_ACTIVOS: EstadoPedido[] = ['pendiente', 'en_preparacion', 'listo']

export async function listarPedidosActivos(): Promise<PedidoConItems[]> {
  const { data, error } = await supabase
    .from('pedidos')
    .select(SELECT)
    .in('estado', ESTADOS_ACTIVOS)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data as unknown as PedidoConItems[]
}

/** Pedidos entregados desde las 00:00 de hoy (hora local del navegador). */
export async function listarPedidosEntregadosHoy(): Promise<PedidoConItems[]> {
  const desde = new Date()
  desde.setHours(0, 0, 0, 0)
  const { data, error } = await supabase
    .from('pedidos')
    .select(SELECT)
    .eq('estado', 'entregado')
    .gte('created_at', desde.toISOString())
    .order('created_at', { ascending: false })
    .limit(100)
  if (error) throw error
  return data as unknown as PedidoConItems[]
}

export async function listarPedidosDeSesion(sesionId: string): Promise<PedidoConItems[]> {
  const { data, error } = await supabase
    .from('pedidos')
    .select(SELECT)
    .eq('sesion_id', sesionId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data as unknown as PedidoConItems[]
}

export async function cambiarEstadoPedido(id: string, estado: EstadoPedido): Promise<void> {
  const { error } = await supabase.from('pedidos').update({ estado }).eq('id', id)
  if (error) throw error
}

export interface ItemNuevo {
  producto_id: string
  cantidad: number
}

/** El mozo carga un pedido. Los precios los toma el servidor de la base. */
export async function crearPedidoMozo(mesaId: string, items: ItemNuevo[], notas: string): Promise<void> {
  const { error } = await supabase.rpc('crear_pedido_mozo', {
    p_mesa_id: mesaId,
    p_items: items as unknown as Json,
    p_notas: notas.trim() || undefined,
  })
  if (error) throw error
}

export async function listarSesionesAbiertas(): Promise<SesionAbierta[]> {
  const { data, error } = await supabase
    .from('sesiones_mesa')
    .select('id, mesa_id, abierta_at, total')
    .is('cerrada_at', null)
  if (error) throw error
  return data as SesionAbierta[]
}

/** Cierra la cuenta abierta de la mesa: calcula el total y deja la mesa libre (triggers en la base). */
export async function cerrarCuenta(mesaId: string, metodo: MetodoPago): Promise<void> {
  const { error } = await supabase
    .from('sesiones_mesa')
    .update({ cerrada_at: new Date().toISOString(), metodo_pago: metodo })
    .eq('mesa_id', mesaId)
    .is('cerrada_at', null)
  if (error) throw error
}
