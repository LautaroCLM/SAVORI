import { supabase } from '@/lib/supabase'
import type { Rol } from './auth'

export async function crearMiRestaurante(nombreRestaurante: string, miNombre: string): Promise<void> {
  const { error } = await supabase.rpc('crear_mi_restaurante', {
    p_nombre_restaurante: nombreRestaurante,
    p_mi_nombre: miNombre,
  })
  if (error) throw error
}

export async function unirmeConCodigo(codigo: string, miNombre: string): Promise<void> {
  const { error } = await supabase.rpc('unirme_con_codigo', { p_codigo: codigo, p_mi_nombre: miNombre })
  if (error) throw error
}

export interface Invitacion {
  id: string
  codigo: string
  rol: Rol
  expira_at: string
  revocada: boolean
  usada_por: string | null
  usada_at: string | null
  created_at: string
}

export async function listarInvitaciones(): Promise<Invitacion[]> {
  const { data, error } = await supabase
    .from('invitaciones')
    .select('id, codigo, rol, expira_at, revocada, usada_por, usada_at, created_at')
    .order('created_at', { ascending: false })
    .limit(50)
  if (error) throw error
  return data
}

export async function generarInvitacion(rol: Rol): Promise<string> {
  const { data, error } = await supabase.rpc('generar_invitacion', { p_rol: rol })
  if (error) throw error
  return data
}

export async function revocarInvitacion(id: string): Promise<void> {
  const { error } = await supabase.from('invitaciones').update({ revocada: true }).eq('id', id)
  if (error) throw error
}

export interface Miembro {
  id: string
  nombre: string
  rol: Rol
  activo: boolean
}

export async function listarEquipo(): Promise<Miembro[]> {
  const { data, error } = await supabase.from('perfiles').select('id, nombre, rol, activo').order('created_at')
  if (error) throw error
  return data
}

export async function actualizarMiembro(id: string, cambios: Partial<Pick<Miembro, 'rol' | 'activo'>>): Promise<void> {
  const { error } = await supabase.from('perfiles').update(cambios).eq('id', id)
  if (error) throw error
}
