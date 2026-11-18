import { supabase } from '@/lib/supabase'
import type { Json } from '@/types/database'

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

export interface PedidoCreado {
  pedido_id: string
  total: number
}

/**
 * El cliente envía su pedido desde la carta del QR. El servidor valida el token y los productos y toma
 * los precios de la base: lo que mande el cliente como precio se ignora.
 */
export async function crearPedidoQr(token: string, items: { producto_id: string; cantidad: number }[], notas: string): Promise<PedidoCreado> {
  const { data, error } = await supabase.rpc('crear_pedido_qr', {
    p_token: token,
    p_items: items as unknown as Json,
    p_notas: notas.trim() || undefined,
  })
  if (error) throw error
  return data as unknown as PedidoCreado
}
