import { supabase } from '@/lib/supabase'
import type { Tables, TablesInsert, TablesUpdate } from '@/types/database'

export type Salon = Tables<'salones'>
export type Mesa = Tables<'mesas'>

export async function listarSalones(): Promise<Salon[]> {
  const { data, error } = await supabase.from('salones').select('*').order('orden').order('nombre')
  if (error) throw error
  return data
}

export async function crearSalon(datos: TablesInsert<'salones'>): Promise<void> {
  const { error } = await supabase.from('salones').insert(datos)
  if (error) throw error
}

export async function actualizarSalon(id: string, cambios: TablesUpdate<'salones'>): Promise<void> {
  const { error } = await supabase.from('salones').update(cambios).eq('id', id)
  if (error) throw error
}

/** Borra también las mesas del salón (cascade). Falla si alguna mesa tiene pedidos. */
export async function eliminarSalon(id: string): Promise<void> {
  const { error } = await supabase.from('salones').delete().eq('id', id)
  if (error) throw error
}

export async function listarMesas(): Promise<Mesa[]> {
  const { data, error } = await supabase.from('mesas').select('*').order('numero')
  if (error) throw error
  return data
}

export async function crearMesa(datos: TablesInsert<'mesas'>): Promise<void> {
  const { error } = await supabase.from('mesas').insert(datos)
  if (error) throw error
}

export async function actualizarMesa(id: string, cambios: TablesUpdate<'mesas'>): Promise<void> {
  const { error } = await supabase.from('mesas').update(cambios).eq('id', id)
  if (error) throw error
}

/** Falla (23503) si la mesa tiene pedidos. */
export async function eliminarMesa(id: string): Promise<void> {
  const { error } = await supabase.from('mesas').delete().eq('id', id)
  if (error) throw error
}

/** Invalida el QR impreso anterior y devuelve el token nuevo. Solo admin. */
export async function regenerarQrMesa(id: string): Promise<string> {
  const { data, error } = await supabase.rpc('regenerar_qr_mesa', { p_mesa_id: id })
  if (error) throw error
  return data
}

/** URL pública que se codifica en el QR de una mesa. */
export function urlCartaDeMesa(qrToken: string): string {
  return `${window.location.origin}/m/${qrToken}`
}
