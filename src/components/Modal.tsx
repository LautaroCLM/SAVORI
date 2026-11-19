import { useEffect, useRef, type ReactNode } from 'react'
import { IconoCerrar } from '@/components/iconos'
import { BotonIcono } from '@/components/ui/Boton'
import { cn } from '@/lib/utils'

interface ModalProps {
  abierto: boolean
  onCerrar: () => void
  titulo: string
  /** Una línea de contexto bajo el título. */
  descripcion?: ReactNode
  children: ReactNode
  /** Ancho máximo del cuadro (clase Tailwind). */
  ancho?: string
}

/** Diálogo modal sobre `<dialog>` nativo: foco atrapado, Esc para cerrar, clic afuera y transición suave. */
export function Modal({ abierto, onCerrar, titulo, descripcion, children, ancho = 'max-w-lg' }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (abierto && !dialog.open) dialog.showModal()
    if (!abierto && dialog.open) dialog.close()
  }, [abierto])

  return (
    <dialog
      ref={ref}
      onClose={onCerrar}
      onClick={(e) => {
        if (e.target === ref.current) onCerrar()
      }}
      className={cn('m-auto w-[calc(100%-2rem)] rounded-tarjeta border border-borde bg-superficie p-0 text-tinta shadow-flotante print:hidden', ancho)}
    >
      {abierto && (
        <div className="p-6">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 className="text-lg leading-snug font-bold tracking-[-0.01em]">{titulo}</h2>
              {descripcion && <p className="mt-1 text-sm leading-relaxed text-tinta-2">{descripcion}</p>}
            </div>
            <BotonIcono icono={IconoCerrar} etiqueta="Cerrar" onClick={onCerrar} className="-mt-1.5 -mr-2" />
          </div>
          {children}
        </div>
      )}
    </dialog>
  )
}
