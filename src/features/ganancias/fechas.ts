import type { Agrupacion } from '@/services/ganancias'

/** Fecha local como YYYY-MM-DD (sin pasar por UTC, para no correr el día). */
export function aISO(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dia = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${dia}`
}

export function deISO(iso: string): Date {
  const [a, m, d] = iso.split('-').map(Number)
  return new Date(a, m - 1, d)
}

export function sumarDias(d: Date, n: number): Date {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

/** Lunes de la semana de `d` (igual criterio que `date_trunc('week')` de Postgres). */
export function inicioSemana(d: Date): Date {
  const dia = (d.getDay() + 6) % 7
  return sumarDias(d, -dia)
}

export type Preset = 'hoy' | '7d' | '30d' | 'mes' | 'mes-pasado' | 'custom'

export function rangoDePreset(p: Exclude<Preset, 'custom'>, hoy = new Date()): { desde: string; hasta: string } {
  const h = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())
  switch (p) {
    case 'hoy':
      return { desde: aISO(h), hasta: aISO(h) }
    case '7d':
      return { desde: aISO(sumarDias(h, -6)), hasta: aISO(h) }
    case '30d':
      return { desde: aISO(sumarDias(h, -29)), hasta: aISO(h) }
    case 'mes':
      return { desde: aISO(new Date(h.getFullYear(), h.getMonth(), 1)), hasta: aISO(h) }
    case 'mes-pasado':
      return { desde: aISO(new Date(h.getFullYear(), h.getMonth() - 1, 1)), hasta: aISO(new Date(h.getFullYear(), h.getMonth(), 0)) }
  }
}

/** Agrupación sugerida según el largo del rango. */
export function agrupacionAuto(desde: string, hasta: string): Agrupacion {
  const dias = Math.round((deISO(hasta).getTime() - deISO(desde).getTime()) / 86_400_000) + 1
  return dias <= 35 ? 'dia' : dias <= 140 ? 'semana' : 'mes'
}

/** Períodos (inicio de día/semana/mes) que cubre el rango, para dibujar también los que no tuvieron ventas. */
export function periodosDelRango(desde: string, hasta: string, agrupar: Agrupacion): string[] {
  const fin = deISO(hasta)
  const lista: string[] = []
  let cursor = deISO(desde)
  if (agrupar === 'semana') cursor = inicioSemana(cursor)
  if (agrupar === 'mes') cursor = new Date(cursor.getFullYear(), cursor.getMonth(), 1)
  while (cursor <= fin && lista.length < 400) {
    lista.push(aISO(cursor))
    cursor = agrupar === 'dia' ? sumarDias(cursor, 1) : agrupar === 'semana' ? sumarDias(cursor, 7) : new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1)
  }
  return lista
}

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

export function etiquetaPeriodo(iso: string, agrupar: Agrupacion): string {
  const d = deISO(iso)
  if (agrupar === 'mes') return `${MESES[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`
  const base = `${d.getDate()}/${d.getMonth() + 1}`
  return agrupar === 'semana' ? `Sem. ${base}` : base
}

/** El período inmediatamente anterior, del mismo largo (para comparar). */
export function rangoAnterior(desde: string, hasta: string): { desde: string; hasta: string } {
  const dias = Math.round((deISO(hasta).getTime() - deISO(desde).getTime()) / 86_400_000) + 1
  const fin = sumarDias(deISO(desde), -1)
  return { desde: aISO(sumarDias(fin, -(dias - 1))), hasta: aISO(fin) }
}

/** "10 nov" o "10 nov – 18 nov". */
export function etiquetaRango(desde: string, hasta: string): string {
  const f = (iso: string) => {
    const d = deISO(iso)
    return `${d.getDate()} ${MESES[d.getMonth()]}`
  }
  return desde === hasta ? f(desde) : `${f(desde)} – ${f(hasta)}`
}

/** Etiqueta larga para el tooltip: "lunes 10 nov", "semana del 10 nov", "noviembre 2026". */
export function etiquetaPeriodoLarga(iso: string, agrupar: Agrupacion): string {
  const d = deISO(iso)
  if (agrupar === 'mes') return d.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })
  if (agrupar === 'semana') return `Semana del ${d.getDate()} ${MESES[d.getMonth()]}`
  return d.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'short' })
}
