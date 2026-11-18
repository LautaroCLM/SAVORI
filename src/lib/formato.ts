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
