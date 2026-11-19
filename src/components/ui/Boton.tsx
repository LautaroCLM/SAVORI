import type { ButtonHTMLAttributes, ComponentType } from 'react'
import { conRef, useIconoAnimado } from '@/components/iconos/useIconoAnimado'
import { cn } from '@/lib/utils'
import { Spinner } from './Pantallas'

/** Cualquier icono: animado (lucide-animated) o estático (lucide-react). */
export type IconoComponente = ComponentType<{ size?: number; className?: string }>

type Variante = 'primario' | 'secundario' | 'fantasma' | 'peligro'
type Tamano = 'sm' | 'md' | 'lg'

const VARIANTES: Record<Variante, string> = {
  primario: 'bg-marca-600 text-white hover:bg-marca-700 active:bg-marca-800 disabled:bg-marca-600/50',
  secundario:
    'border border-borde-fuerte bg-superficie text-tinta shadow-control hover:bg-superficie-2 active:bg-borde disabled:text-tinta-3 disabled:hover:bg-superficie',
  fantasma: 'text-tinta-2 hover:bg-superficie-2 hover:text-tinta active:bg-borde disabled:text-tinta-3',
  peligro: 'bg-peligro-600 text-white hover:bg-peligro-500 active:bg-peligro-600 disabled:bg-peligro-600/50',
}
const TAMANOS: Record<Tamano, { caja: string; icono: number; texto: string }> = {
  sm: { caja: 'h-10 px-3 gap-1.5', icono: 16, texto: 'text-sm' },
  md: { caja: 'h-11 px-4 gap-2', icono: 18, texto: 'text-sm' },
  lg: { caja: 'h-12 px-5 gap-2', icono: 20, texto: 'text-base' },
}

export type BotonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variante?: Variante
  tamano?: Tamano
  /** Icono a la izquierda del texto (se anima al pasar, enfocar o tocar el botón). */
  icono?: IconoComponente
  cargando?: boolean
}

/** Las mismas clases de un botón, para enlaces que se ven como botón (`<Link>` de navegación). */
export function estiloBoton(variante: Variante = 'primario', tamano: Tamano = 'md', className?: string): string {
  const t = TAMANOS[tamano]
  return cn('inline-flex shrink-0 items-center justify-center rounded-control font-semibold whitespace-nowrap transition-colors duration-150', t.caja, t.texto, VARIANTES[variante], className)
}

export function Boton({ variante = 'primario', tamano = 'md', icono: Icono, cargando, disabled, className, children, ...props }: BotonProps) {
  const { ref, disparadores } = useIconoAnimado()
  const t = TAMANOS[tamano]
  const sobreColor = variante === 'primario' || variante === 'peligro'
  return (
    <button
      {...disparadores}
      {...props}
      disabled={disabled || cargando}
      aria-busy={cargando || undefined}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-control font-semibold whitespace-nowrap transition-[background-color,color,transform] duration-150 select-none active:scale-[0.98] disabled:cursor-not-allowed disabled:active:scale-100',
        t.caja,
        t.texto,
        VARIANTES[variante],
        className,
      )}
    >
      {cargando ? (
        <Spinner className={cn('size-4', sobreColor && 'border-white/40 border-t-white')} />
      ) : Icono ? (
        <span className="icono -ml-0.5 flex" aria-hidden>
          <Icono {...conRef(ref)} size={t.icono} />
        </span>
      ) : null}
      {children}
    </button>
  )
}

/** Botón de solo icono (acciones de fila, cerrar). La etiqueta es obligatoria para lectores de pantalla. */
export function BotonIcono({
  icono: Icono,
  etiqueta,
  tono = 'neutro',
  className,
  ...props
}: Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & { icono: IconoComponente; etiqueta: string; tono?: 'neutro' | 'peligro' }) {
  const { ref, disparadores } = useIconoAnimado()
  return (
    <button
      type="button"
      aria-label={etiqueta}
      title={etiqueta}
      {...disparadores}
      {...props}
      className={cn(
        'inline-flex size-10 shrink-0 items-center justify-center rounded-control transition-[background-color,color,transform] duration-150 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40',
        tono === 'peligro' ? 'text-tinta-2 hover:bg-peligro-50 hover:text-peligro-600' : 'text-tinta-2 hover:bg-superficie-2 hover:text-tinta',
        className,
      )}
    >
      <span className="icono flex" aria-hidden>
        <Icono {...conRef(ref)} size={18} />
      </span>
    </button>
  )
}
