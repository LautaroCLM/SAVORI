import { supabase } from '@/lib/supabase'
import type { Tables, TablesInsert, TablesUpdate } from '@/types/database'

export type Categoria = Tables<'categorias'>
export type Producto = Tables<'productos'>

// --- Categorías -------------------------------------------------------------

export async function listarCategorias(): Promise<Categoria[]> {
  const { data, error } = await supabase.from('categorias').select('*').order('orden').order('nombre')
  if (error) throw error
  return data
}

export async function crearCategoria(datos: TablesInsert<'categorias'>): Promise<void> {
  const { error } = await supabase.from('categorias').insert(datos)
  if (error) throw error
}

export async function actualizarCategoria(id: string, cambios: TablesUpdate<'categorias'>): Promise<void> {
  const { error } = await supabase.from('categorias').update(cambios).eq('id', id)
  if (error) throw error
}

/** Falla (23503) si la categoría todavía tiene productos. */
export async function eliminarCategoria(id: string): Promise<void> {
  const { error } = await supabase.from('categorias').delete().eq('id', id)
  if (error) throw error
}

// --- Productos --------------------------------------------------------------

export async function listarProductos(): Promise<Producto[]> {
  const { data, error } = await supabase.from('productos').select('*').order('orden').order('nombre')
  if (error) throw error
  return data
}

export async function crearProducto(datos: TablesInsert<'productos'>): Promise<void> {
  const { error } = await supabase.from('productos').insert(datos)
  if (error) throw error
}

export async function actualizarProducto(id: string, cambios: TablesUpdate<'productos'>): Promise<void> {
  const { error } = await supabase.from('productos').update(cambios).eq('id', id)
  if (error) throw error
}

export async function eliminarProducto(id: string): Promise<void> {
  const { error } = await supabase.from('productos').delete().eq('id', id)
  if (error) throw error
}
