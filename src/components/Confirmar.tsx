import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'
import { Modal } from './Modal'
import { Boton } from './ui/Boton'

export interface PedidoConfirmacion {
  titulo: string
  /** Qué va a pasar, en concreto (la consecuencia, no "¿estás seguro?"). */
  mensaje: ReactNode
  /** Texto del botón que confirma: el nombre de la acción ("Eliminar mesa", "Cerrar cuenta"). */
  confirmar: string
  cancelar?: string
  tono?: 'normal' | 'peligro'
}

type Confirmar = (pedido: PedidoConfirmacion) => Promise<boolean>

const Contexto = createContext<Confirmar | null>(null)

/** Reemplaza `window.confirm`: mismo uso (`if (await confirmar({...}))`), pero con el diseño de la app. */
export function ProveedorConfirmacion({ children }: { children: ReactNode }) {
  const [pedido, setPedido] = useState<PedidoConfirmacion | null>(null)
  const resolver = useRef<((v: boolean) => void) | null>(null)

  const confirmar = useCallback<Confirmar>((p) => {
    resolver.current?.(false) // si había otra abierta, se cancela
    setPedido(p)
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve
    })
  }, [])

  const responder = (valor: boolean) => {
    resolver.current?.(valor)
    resolver.current = null
    setPedido(null)
  }

  return (
    <Contexto.Provider value={confirmar}>
      {children}
      <Modal abierto={pedido !== null} onCerrar={() => responder(false)} titulo={pedido?.titulo ?? ''} ancho="max-w-md">
        {pedido && (
          <div className="flex flex-col gap-6">
            <div className="text-sm leading-relaxed text-tinta-2">{pedido.mensaje}</div>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Boton variante="secundario" onClick={() => responder(false)} autoFocus>
                {pedido.cancelar ?? 'Cancelar'}
              </Boton>
              <Boton variante={pedido.tono === 'peligro' ? 'peligro' : 'primario'} onClick={() => responder(true)}>
                {pedido.confirmar}
              </Boton>
            </div>
          </div>
        )}
      </Modal>
    </Contexto.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useConfirmar(): Confirmar {
  const c = useContext(Contexto)
  if (!c) throw new Error('useConfirmar() se usó fuera de <ProveedorConfirmacion>')
  return c
}
