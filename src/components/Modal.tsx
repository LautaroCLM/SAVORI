import { useEffect, useRef, type ReactNode } from 'react'

interface ModalProps {
  abierto: boolean
  onCerrar: () => void
  titulo: string
  children: ReactNode
  /** Ancho máximo del cuadro (clase Tailwind). */
  ancho?: string
}

/** Diálogo modal sobre `<dialog>` nativo: foco atrapado, Esc para cerrar y clic afuera. */
export function Modal({ abierto, onCerrar, titulo, children, ancho = 'max-w-lg' }: ModalProps) {
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
      className={`m-auto w-[calc(100%-2rem)] ${ancho} rounded-2xl bg-white p-0 text-stone-900 shadow-xl backdrop:bg-stone-900/50 print:hidden`}
    >
      {abierto && (
        <div className="p-6">
          <div className="mb-5 flex items-start justify-between gap-4">
            <h2 className="text-lg font-bold">{titulo}</h2>
            <button
              type="button"
              onClick={onCerrar}
              aria-label="Cerrar"
              className="-m-1 rounded-lg p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="size-5" aria-hidden>
                <path d="M6 6l12 12M18 6 6 18" />
              </svg>
            </button>
          </div>
          {children}
        </div>
      )}
    </dialog>
  )
}
