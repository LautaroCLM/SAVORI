/** Traduce errores de Supabase / RPC a mensajes para mostrar en pantalla. */
const MENSAJES: Record<string, string> = {
  // Auth
  'Invalid login credentials': 'Email o contraseña incorrectos.',
  'Email not confirmed': 'El email todavía no fue confirmado.',
  // crear_pedido_qr
  QR_INVALIDO: 'Este QR no es válido o el local no está disponible.',
  ITEMS_INVALIDOS: 'El pedido tiene datos inválidos.',
  PRODUCTO_NO_DISPONIBLE: 'Algún producto ya no está disponible. Actualizá la carta.',
  SIN_STOCK: 'No hay stock suficiente de algún producto.',
  DEMASIADOS_PEDIDOS: 'Hiciste muchos pedidos seguidos. Esperá unos minutos o llamá al mozo.',
}

export function mensajeDeError(error: unknown): string {
  if (!navigator.onLine) return 'Sin conexión. Revisá internet e intentá de nuevo.'
  const mensaje =
    error && typeof error === 'object' && 'message' in error ? String((error as { message: unknown }).message) : ''
  if (MENSAJES[mensaje]) return MENSAJES[mensaje]
  if (mensaje.includes('Failed to fetch')) return 'No se pudo conectar con el servidor.'
  if (mensaje.includes('row-level security') || mensaje.includes('permission denied')) {
    return 'No tenés permisos para esta acción.'
  }
  return 'Ocurrió un error inesperado. Intentá de nuevo.'
}
