import horizontalClaro from '../../brand/svg/savori-horizontal.svg'
import horizontalOscuro from '../../brand/svg/savori-horizontal-dark.svg'
import simboloClaro from '../../brand/svg/savori-symbol.svg'
import simboloOscuro from '../../brand/svg/savori-symbol-dark.svg'

const FUENTES = {
  horizontal: { claro: horizontalClaro, oscuro: horizontalOscuro },
  simbolo: { claro: simboloClaro, oscuro: simboloOscuro },
} as const

interface LogoProps {
  variante?: 'horizontal' | 'simbolo'
  /** `claro` = para fondos claros · `oscuro` = para fondos oscuros (nunca mezclar: el punto desaparece). */
  tema?: 'claro' | 'oscuro'
  /** Definí la altura con una clase (ej. `h-8`); el ancho es automático. */
  className?: string
}

/** Logo de Savori. Los SVG viven en `brand/svg/` (única fuente de verdad, ver brand/BRAND.md). */
export function Logo({ variante = 'horizontal', tema = 'claro', className = 'h-8' }: LogoProps) {
  return <img src={FUENTES[variante][tema]} alt="Savori" draggable={false} className={`${className} w-auto select-none`} />
}
