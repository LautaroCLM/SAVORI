import type { ComponentType, HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** Encabezado de cada pantalla: título, una línea de contexto y las acciones principales a la derecha. */
export function EncabezadoPagina({ titulo, descripcion, acciones, children }: { titulo: string; descripcion?: ReactNode; acciones?: ReactNode; children?: ReactNode }) {
  return (
    <header className="mb-6 flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          <h1 className="text-[1.75rem] leading-tight font-bold tracking-[-0.02em] text-tinta">{titulo}</h1>
          {descripcion && <p className="mt-1 max-w-[65ch] text-sm leading-relaxed text-tinta-2">{descripcion}</p>}
        </div>
        {acciones && <div className="flex flex-wrap items-center gap-2">{acciones}</div>}
      </div>
      {children}
    </header>
  )
}

type TarjetaProps = HTMLAttributes<HTMLElement> & {
  titulo?: ReactNode
  descripcion?: ReactNode
  acciones?: ReactNode
  /** Sin relleno interno (para listas que llegan al borde). */
  sinRelleno?: boolean
}

/** Superficie blanca con borde fino. Nunca anidar una tarjeta dentro de otra. */
export function Tarjeta({ titulo, descripcion, acciones, sinRelleno, className, children, ...props }: TarjetaProps) {
  const conEncabezado = titulo || acciones
  return (
    <section {...props} className={cn('rounded-tarjeta border border-borde bg-superficie', className)}>
      {conEncabezado && (
        <div className={cn('flex flex-wrap items-start justify-between gap-3', sinRelleno ? 'border-b border-borde px-5 py-4' : 'px-5 pt-5')}>
          <div className="min-w-0">
            {titulo && <h2 className="text-base font-bold text-tinta">{titulo}</h2>}
            {descripcion && <p className="mt-0.5 text-sm text-tinta-2">{descripcion}</p>}
          </div>
          {acciones && <div className="flex items-center gap-2">{acciones}</div>}
        </div>
      )}
      <div className={cn(!sinRelleno && (conEncabezado ? 'px-5 pt-4 pb-5' : 'p-5'))}>{children}</div>
    </section>
  )
}

/** Estado vacío: qué falta y qué hacer, con la acción a mano. */
export function EstadoVacio({ icono: Icono, titulo, descripcion, accion, className }: { icono?: ComponentType<{ size?: number; className?: string }>; titulo: string; descripcion?: ReactNode; accion?: ReactNode; className?: string }) {
  return (
    <div className={cn('flex flex-col items-center rounded-tarjeta border border-dashed border-borde-fuerte bg-superficie px-6 py-12 text-center', className)}>
      {Icono && (
        <span className="mb-4 flex size-12 items-center justify-center rounded-full bg-superficie-2 text-tinta-2">
          <Icono size={22} />
        </span>
      )}
      <p className="text-base font-bold text-tinta">{titulo}</p>
      {descripcion && <p className="mt-1 max-w-[46ch] text-sm leading-relaxed text-tinta-2">{descripcion}</p>}
      {accion && <div className="mt-5">{accion}</div>}
    </div>
  )
}
