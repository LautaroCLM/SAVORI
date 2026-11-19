import { ChevronDown } from 'lucide-react'
import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

const CONTROL =
  'w-full rounded-control border border-borde-fuerte bg-superficie px-3 text-base text-tinta shadow-control transition-[border-color,box-shadow] duration-150 outline-none placeholder:text-tinta-3 hover:border-tinta-3 focus:border-marca-600 focus:ring-4 focus:ring-marca-600/15 disabled:bg-superficie-2 disabled:text-tinta-3 aria-[invalid=true]:border-peligro-600'

function Envoltura({ etiqueta, id, ayuda, className, children }: { etiqueta: string; id?: string; ayuda?: ReactNode; className?: string; children: ReactNode }) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-sm font-semibold text-tinta">
        {etiqueta}
      </label>
      {children}
      {ayuda && <p className="text-xs leading-relaxed text-tinta-3">{ayuda}</p>}
    </div>
  )
}

type CampoProps = InputHTMLAttributes<HTMLInputElement> & { etiqueta: string; ayuda?: ReactNode; envoltura?: string }

export function Campo({ etiqueta, ayuda, id, className, envoltura, ...props }: CampoProps) {
  return (
    <Envoltura etiqueta={etiqueta} id={id} ayuda={ayuda} className={envoltura}>
      <input id={id} {...props} className={cn(CONTROL, 'h-11', className)} />
    </Envoltura>
  )
}

type AreaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & { etiqueta: string; ayuda?: ReactNode }

export function AreaTexto({ etiqueta, ayuda, id, className, rows = 2, ...props }: AreaProps) {
  return (
    <Envoltura etiqueta={etiqueta} id={id} ayuda={ayuda}>
      <textarea id={id} rows={rows} {...props} className={cn(CONTROL, 'resize-y py-2.5 leading-relaxed', className)} />
    </Envoltura>
  )
}

type SelectorProps = SelectHTMLAttributes<HTMLSelectElement> & { etiqueta?: string; ayuda?: ReactNode; envoltura?: string }

/** Select nativo (accesible y con el teclado del sistema) con el estilo de la app. */
export function Selector({ etiqueta, ayuda, id, className, envoltura, children, ...props }: SelectorProps) {
  const control = (
    <div className={cn('relative', !etiqueta && envoltura)}>
      <select id={id} {...props} className={cn(CONTROL, 'h-11 cursor-pointer appearance-none pr-10', className)}>
        {children}
      </select>
      <ChevronDown aria-hidden size={18} className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-tinta-3" />
    </div>
  )
  if (!etiqueta) return control
  return (
    <Envoltura etiqueta={etiqueta} id={id} ayuda={ayuda} className={envoltura}>
      {control}
    </Envoltura>
  )
}

type CasillaProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & { etiqueta: ReactNode; descripcion?: ReactNode }

export function Casilla({ etiqueta, descripcion, className, ...props }: CasillaProps) {
  return (
    <label className={cn('flex cursor-pointer items-start gap-3 text-sm', className)}>
      <input type="checkbox" {...props} className="mt-0.5 size-[18px] shrink-0 cursor-pointer accent-marca-600" />
      <span>
        <span className="font-semibold text-tinta">{etiqueta}</span>
        {descripcion && <span className="mt-0.5 block text-xs leading-relaxed text-tinta-3">{descripcion}</span>}
      </span>
    </label>
  )
}

/** Interruptor encendido/apagado (role="switch"): para estados que se aplican al instante, como "Disponible". */
export function Interruptor({ activo, onCambiar, etiqueta, mostrarEtiqueta = true, disabled }: { activo: boolean; onCambiar: (v: boolean) => void; etiqueta: string; mostrarEtiqueta?: boolean; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={activo}
      aria-label={mostrarEtiqueta ? undefined : etiqueta}
      disabled={disabled}
      onClick={() => onCambiar(!activo)}
      className="group inline-flex min-h-10 items-center gap-2.5 rounded-control text-sm font-semibold text-tinta-2 disabled:opacity-50"
    >
      <span className={cn('relative h-6 w-10 shrink-0 rounded-full transition-colors duration-200', activo ? 'bg-marca-600' : 'bg-borde-fuerte')}>
        <span
          className={cn(
            'absolute top-0.5 left-0.5 size-5 rounded-full bg-superficie shadow-control transition-transform duration-200 ease-[var(--ease-salida)]',
            activo && 'translate-x-4',
          )}
        />
      </span>
      {mostrarEtiqueta && etiqueta}
    </button>
  )
}
