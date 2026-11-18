import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database'

export type Rol = Database['public']['Enums']['rol_usuario']

export interface ContextoUsuario {
  usuario_id: string
  nombre: string
  rol: Rol
  perfil_activo: boolean
  restaurante_id: string
  restaurante_nombre: string
  restaurante_activo: boolean
}

export async function iniciarSesion(email: string, password: string): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
  if (error) throw error
}

export async function cerrarSesion(): Promise<void> {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export async function obtenerSesion(): Promise<Session | null> {
  const { data } = await supabase.auth.getSession()
  return data.session
}

/** Se suscribe a cambios de sesión. Devuelve la función para desuscribirse. */
export function escucharSesion(callback: (session: Session | null) => void): () => void {
  const { data } = supabase.auth.onAuthStateChange((_evento, session) => callback(session))
  return () => data.subscription.unsubscribe()
}

/** Perfil + restaurante del usuario logueado (null si no tiene perfil asignado). */
export async function obtenerContexto(): Promise<ContextoUsuario | null> {
  const { data, error } = await supabase.rpc('mi_contexto')
  if (error) throw error
  return (data as ContextoUsuario | null) ?? null
}
