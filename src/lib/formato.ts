const formatoPrecio = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
})

/** 16500 → "$ 16.500" */
export function formatearPrecio(valor: number | string): string {
  return formatoPrecio.format(Number(valor))
}

const formatoFechaHora = new Intl.DateTimeFormat('es-AR', {
  dateStyle: 'short',
  timeStyle: 'short',
  timeZone: 'America/Argentina/Buenos_Aires',
})

export function formatearFechaHora(fecha: string | Date): string {
  return formatoFechaHora.format(typeof fecha === 'string' ? new Date(fecha) : fecha)
}

/** "hace 3 min", "hace 1 h 20 min". Para medir cuánto lleva esperando un pedido. */
export function haceCuanto(desde: string | Date, ahora: number = Date.now()): string {
  const min = Math.max(0, Math.floor((ahora - new Date(desde).getTime()) / 60_000))
  if (min < 1) return 'recién'
  if (min < 60) return `hace ${min} min`
  const h = Math.floor(min / 60)
  return `hace ${h} h${min % 60 ? ` ${min % 60} min` : ''}`
}

/** Minutos transcurridos desde una fecha. */
export function minutosDesde(desde: string | Date, ahora: number = Date.now()): number {
  return Math.max(0, Math.floor((ahora - new Date(desde).getTime()) / 60_000))
}
