import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react'

export function Spinner({ className = '' }: { className?: string }) {
  return (
    <span
      role="status"
      aria-label="Cargando"
      className={`inline-block size-6 animate-spin rounded-full border-2 border-stone-300 border-t-marca-600 ${className}`}
    />
  )
}

export function PantallaCentrada({ children }: { children: ReactNode }) {
  return <div className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">{children}</div>
}

export function PantallaCargando() {
  return (
    <PantallaCentrada>
      <Spinner className="size-8" />
    </PantallaCentrada>
  )
}

type BotonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variante?: 'primario' | 'secundario'
  cargando?: boolean
}

export function Boton({ variante = 'primario', cargando, disabled, className = '', children, ...props }: BotonProps) {
  const estilos =
    variante === 'primario'
      ? 'bg-marca-600 text-white hover:bg-marca-700 disabled:bg-marca-600/60'
      : 'border border-stone-300 bg-white text-stone-700 hover:bg-stone-100'
  return (
    <button
      {...props}
      disabled={disabled || cargando}
      className={`inline-flex h-11 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marca-600 disabled:cursor-not-allowed ${estilos} ${className}`}
    >
      {cargando && <Spinner className="size-4 border-white/40 border-t-white" />}
      {children}
    </button>
  )
}

type CampoProps = InputHTMLAttributes<HTMLInputElement> & { etiqueta: string }

export function Campo({ etiqueta, id, className = '', ...props }: CampoProps) {
  return (
    <label htmlFor={id} className="flex flex-col gap-1.5 text-left text-sm font-medium text-stone-700">
      {etiqueta}
      <input
        id={id}
        {...props}
        className={`h-11 rounded-lg border border-stone-300 bg-white px-3 text-base text-stone-900 outline-none transition focus:border-marca-600 focus:ring-2 focus:ring-marca-600/20 ${className}`}
      />
    </label>
  )
}

/** Placeholder de los módulos que se implementan en fases siguientes. */
export function PantallaPendiente({ titulo, fase, descripcion }: { titulo: string; fase: number; descripcion: string }) {
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-bold text-stone-900">{titulo}</h1>
      <div className="mt-6 rounded-xl border border-dashed border-stone-300 bg-white p-8 text-center">
        <p className="text-xs font-semibold tracking-wider text-marca-600 uppercase">Próximamente · Fase {fase}</p>
        <p className="mt-2 text-stone-600">{descripcion}</p>
      </div>
    </div>
  )
}
