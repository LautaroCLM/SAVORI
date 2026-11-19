import { supabase } from '@/lib/supabase'
import { ejecutarOEncolar, registrarEjecutor, type ResultadoOperacion } from './offline'
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

// --- Operaciones de servicio (funcionan sin conexión: ver services/offline.ts) -------------------

async function enviarCambioEstado({ id, estado }: { id: string; estado: EstadoPedido }): Promise<void> {
  const { error } = await supabase.from('pedidos').update({ estado }).eq('id', id)
  if (error) throw error
}
registrarEjecutor('pedido.estado', enviarCambioEstado)

/** Cambia el estado de un pedido. Sin conexión queda en cola y se aplica al volver. */
export function cambiarEstadoPedido(id: string, estado: EstadoPedido, descripcion: string): Promise<ResultadoOperacion> {
  return ejecutarOEncolar('pedido.estado', { id, estado }, descripcion)
}

export interface ItemNuevo {
  producto_id: string
  cantidad: number
}

interface PayloadPedidoMozo {
  /** Generado en el cliente: reintentar el envío no duplica el pedido (idempotente en la base). */
  id: string
  mesaId: string
  items: ItemNuevo[]
  notas: string
}

async function enviarPedidoMozo({ id, mesaId, items, notas }: PayloadPedidoMozo): Promise<void> {
  const { error } = await supabase.rpc('crear_pedido_mozo', {
    p_mesa_id: mesaId,
    p_items: items as unknown as Json,
    p_notas: notas.trim() || undefined,
    p_id: id,
  })
  if (error) throw error
}
registrarEjecutor('pedido.crear', enviarPedidoMozo)

/** El mozo carga un pedido. Los precios los toma el servidor. Sin conexión queda en cola. */
export function crearPedidoMozo(mesaId: string, items: ItemNuevo[], notas: string, descripcion: string): Promise<ResultadoOperacion> {
  return ejecutarOEncolar('pedido.crear', { id: crypto.randomUUID(), mesaId, items, notas }, descripcion)
}

export async function listarSesionesAbiertas(): Promise<SesionAbierta[]> {
  const { data, error } = await supabase
    .from('sesiones_mesa')
    .select('id, mesa_id, abierta_at, total')
    .is('cerrada_at', null)
  if (error) throw error
  return data as SesionAbierta[]
}

interface PayloadCuenta {
  mesaId: string
  metodo: MetodoPago
  /** Momento real del cobro (aunque se sincronice después). */
  cerradaAt: string
}

async function enviarCierreCuenta({ mesaId, metodo, cerradaAt }: PayloadCuenta): Promise<void> {
  const { error } = await supabase
    .from('sesiones_mesa')
    .update({ cerrada_at: cerradaAt, metodo_pago: metodo })
    .eq('mesa_id', mesaId)
    .is('cerrada_at', null) // si ya estaba cerrada, no hace nada (idempotente)
  if (error) throw error
}
registrarEjecutor('cuenta.cerrar', enviarCierreCuenta)

/** Cierra la cuenta abierta de la mesa: calcula el total y deja la mesa libre (triggers en la base). */
export function cerrarCuenta(mesaId: string, metodo: MetodoPago, descripcion: string): Promise<ResultadoOperacion> {
  return ejecutarOEncolar('cuenta.cerrar', { mesaId, metodo, cerradaAt: new Date().toISOString() }, descripcion)
}
