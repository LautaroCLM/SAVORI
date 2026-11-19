import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      role="status"
      aria-label="Cargando"
      className={cn('inline-block size-6 animate-spin rounded-full border-2 border-borde-fuerte border-t-marca-600', className)}
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

/** Carga dentro de una sección (no de toda la pantalla). */
export function CargandoSeccion() {
  return (
    <div className="flex justify-center py-20">
      <Spinner className="size-8" />
    </div>
  )
}
