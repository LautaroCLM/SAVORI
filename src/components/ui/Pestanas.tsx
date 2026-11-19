import { useRef, type KeyboardEvent, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

export interface OpcionPestana<V extends string> {
  valor: V
  etiqueta: ReactNode
  /** Número a la derecha (pedidos activos, etc.). */
  contador?: number
}

/**
 * Control segmentado accesible (patrón WAI-ARIA Tabs): flechas izquierda/derecha, Inicio y Fin
 * mueven la selección; solo la pestaña activa entra en el orden de tabulación.
 */
export function Pestanas<V extends string>({
  opciones,
  valor,
  onCambiar,
  etiqueta,
  className,
}: {
  opciones: OpcionPestana<V>[]
  valor: V
  onCambiar: (v: V) => void
  etiqueta: string
  className?: string
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([])

  function teclado(e: KeyboardEvent, i: number) {
    const ultimo = opciones.length - 1
    const destino = e.key === 'ArrowRight' ? (i === ultimo ? 0 : i + 1) : e.key === 'ArrowLeft' ? (i === 0 ? ultimo : i - 1) : e.key === 'Home' ? 0 : e.key === 'End' ? ultimo : null
    if (destino === null) return
    e.preventDefault()
    onCambiar(opciones[destino].valor)
    refs.current[destino]?.focus()
  }

  return (
    <div role="tablist" aria-label={etiqueta} className={cn('inline-flex max-w-full gap-1 overflow-x-auto rounded-tarjeta bg-superficie-2 p-1', className)}>
      {opciones.map((o, i) => {
        const activa = o.valor === valor
        return (
          <button
            key={o.valor}
            ref={(el) => {
              refs.current[i] = el
            }}
            role="tab"
            type="button"
            aria-selected={activa}
            tabIndex={activa ? 0 : -1}
            onClick={() => onCambiar(o.valor)}
            onKeyDown={(e) => teclado(e, i)}
            className={cn(
              'inline-flex h-10 shrink-0 items-center gap-2 rounded-control px-3.5 text-sm font-semibold whitespace-nowrap transition-[background-color,color,box-shadow] duration-150',
              activa ? 'bg-superficie text-tinta shadow-control' : 'text-tinta-2 hover:text-tinta',
            )}
          >
            {o.etiqueta}
            {o.contador !== undefined && (
              <span className={cn('cifras min-w-5 rounded-full px-1.5 py-0.5 text-center text-xs leading-none', activa ? 'bg-marca-600 text-white' : 'bg-borde text-tinta-2')}>
                {o.contador}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
