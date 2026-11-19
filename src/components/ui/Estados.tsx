import { CircleAlert, CircleCheck, Info } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export type Tono = 'neutro' | 'marca' | 'exito' | 'peligro' | 'carbon'

const TONO_INSIGNIA: Record<Tono, string> = {
  neutro: 'bg-superficie-2 text-tinta-2',
  marca: 'bg-marca-50 text-marca-700',
  exito: 'bg-exito-50 text-exito-600',
  peligro: 'bg-peligro-50 text-peligro-600',
  carbon: 'bg-carbon text-white',
}
const TONO_PUNTO: Record<Tono, string> = {
  neutro: 'bg-tinta-3',
  marca: 'bg-marca-500',
  exito: 'bg-exito-500',
  peligro: 'bg-peligro-500',
  carbon: 'bg-carbon',
}

/**
 * El punto de Savori: el lenguaje de estado del sistema. Naranja = algo está pasando ahora.
 * `vivo` late tres veces para llamar la atención y se detiene (nunca un movimiento infinito).
 */
export function Punto({ tono = 'marca', vivo, className }: { tono?: Tono; vivo?: boolean; className?: string }) {
  return <span aria-hidden className={cn('inline-block size-2 shrink-0 rounded-full', TONO_PUNTO[tono], vivo && 'motion-safe:animate-latido', className)} />
}

/** Etiqueta de estado corta. Con `punto` lleva el punto de Savori delante. */
export function Insignia({ tono = 'neutro', punto, children, className }: { tono?: Tono; punto?: boolean; children: ReactNode; className?: string }) {
  return (
    <span className={cn('inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs leading-none font-semibold', TONO_INSIGNIA[tono], className)}>
      {punto && <Punto tono={tono === 'carbon' ? 'marca' : tono} className="size-1.5" />}
      {children}
    </span>
  )
}

const TONO_AVISO = {
  error: { caja: 'border-peligro-500/25 bg-peligro-50 text-peligro-600', Icono: CircleAlert },
  exito: { caja: 'border-exito-500/25 bg-exito-50 text-exito-600', Icono: CircleCheck },
  info: { caja: 'border-marca-500/25 bg-marca-50 text-marca-800', Icono: Info },
} as const

/** Mensaje dentro de la página o de un formulario: el problema y, si hay, la salida. */
export function Aviso({ tono = 'error', titulo, children, accion, className }: { tono?: keyof typeof TONO_AVISO; titulo?: ReactNode; children?: ReactNode; accion?: ReactNode; className?: string }) {
  const { caja, Icono } = TONO_AVISO[tono]
  return (
    <div role={tono === 'error' ? 'alert' : 'status'} className={cn('flex items-start gap-3 rounded-control border px-3.5 py-3 text-sm', caja, className)}>
      <Icono aria-hidden size={18} className="mt-px shrink-0" />
      <div className="min-w-0 flex-1 leading-relaxed">
        {titulo && <p className="font-semibold">{titulo}</p>}
        {children && <div className={cn(titulo ? 'mt-0.5' : undefined, 'text-tinta-2')}>{children}</div>}
      </div>
      {accion}
    </div>
  )
}
