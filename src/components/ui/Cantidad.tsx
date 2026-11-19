import { Minus, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  cantidad: number
  nombre: string
  onCambiar: (delta: number) => void
  /** Máximo permitido (por stock). */
  tope?: number
  /**
   * `pastilla`: carta del cliente. En 0 muestra "Agregar"; con unidades, una pastilla naranja − n +.
   * `bordes`: carga interna del mozo, siempre visible.
   */
  variante?: 'pastilla' | 'bordes'
  className?: string
}

/** Selector de cantidad con objetivos táctiles de 44 px. */
export function ControlCantidad({ cantidad, nombre, onCambiar, tope = 50, variante = 'bordes', className }: Props) {
  if (variante === 'pastilla') {
    if (cantidad === 0) {
      return (
        <button
          type="button"
          onClick={() => onCambiar(1)}
          aria-label={`Agregar ${nombre}`}
          disabled={tope <= 0}
          className={cn(
            'inline-flex h-11 items-center gap-1.5 rounded-full border border-marca-600 px-4 text-sm font-bold text-marca-700 transition-[background-color,transform] duration-150 hover:bg-marca-50 active:scale-[0.97] disabled:border-borde disabled:text-tinta-3',
            className,
          )}
        >
          <Plus aria-hidden size={16} strokeWidth={2.25} />
          Agregar
        </button>
      )
    }
    return (
      <div className={cn('inline-flex h-11 items-center rounded-full bg-marca-600 text-white', className)}>
        <button type="button" onClick={() => onCambiar(-1)} aria-label={`Quitar ${nombre}`} className="grid size-11 place-items-center rounded-full transition-colors hover:bg-marca-700 active:bg-marca-800">
          <Minus aria-hidden size={18} strokeWidth={2.25} />
        </button>
        <span className="cifras w-6 text-center text-base font-bold" aria-live="polite">
          {cantidad}
        </span>
        <button type="button" onClick={() => onCambiar(1)} disabled={cantidad >= tope} aria-label={`Agregar otro ${nombre}`} className="grid size-11 place-items-center rounded-full transition-colors hover:bg-marca-700 active:bg-marca-800 disabled:opacity-40">
          <Plus aria-hidden size={18} strokeWidth={2.25} />
        </button>
      </div>
    )
  }

  const boton =
    'grid size-10 place-items-center rounded-control border border-borde-fuerte bg-superficie text-tinta transition-[background-color,transform] duration-150 hover:bg-superficie-2 active:scale-95 disabled:pointer-events-none disabled:opacity-35'
  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      <button type="button" onClick={() => onCambiar(-1)} disabled={cantidad === 0} aria-label={`Quitar ${nombre}`} className={boton}>
        <Minus aria-hidden size={16} />
      </button>
      <span className={cn('cifras w-7 text-center font-bold', cantidad > 0 ? 'text-marca-700' : 'text-tinta-3')} aria-live="polite">
        {cantidad}
      </span>
      <button type="button" onClick={() => onCambiar(1)} disabled={cantidad >= tope} aria-label={`Agregar ${nombre}`} className={cn(boton, cantidad > 0 && 'border-marca-600 text-marca-700')}>
        <Plus aria-hidden size={16} />
      </button>
    </div>
  )
}
