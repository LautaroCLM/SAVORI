import { supabase } from '@/lib/supabase'

export interface ProductoCarta {
  id: string
  nombre: string
  descripcion: string | null
  precio: number
  imagen_url: string | null
}

export interface CategoriaCarta {
  id: string
  nombre: string
  productos: ProductoCarta[]
}

export interface CartaPublica {
  restaurante: { nombre: string }
  mesa: { numero: number }
  categorias: CategoriaCarta[]
}

/** Carta pública de la mesa del QR. `null` = token inválido o local suspendido. */
export async function obtenerCarta(token: string): Promise<CartaPublica | null> {
  const { data, error } = await supabase.rpc('obtener_carta', { p_token: token })
  if (error) throw error
  return (data as unknown as CartaPublica | null) ?? null
}
