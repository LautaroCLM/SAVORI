import type { ReactNode } from 'react'
import { CornerDownRight, Flame, NotebookPen, QrCode, Timer, UserRound } from 'lucide-react'
import { Insignia, type Tono } from '@/components/ui'
import { formatearPrecio, haceCuanto, minutosDesde } from '@/lib/formato'
import { cn } from '@/lib/utils'
import type { EstadoPedido, PedidoConItems } from '@/services/pedidos'

export const ETIQUETA_ESTADO: Record<EstadoPedido, string> = {
  pendiente: 'Pendiente',
  en_preparacion: 'En preparación',
  listo: 'Listo',
  entregado: 'Entregado',
  cancelado: 'Cancelado',
}

/** Naranja = espera que alguien actúe; verde = listo; gris = en curso o cerrado; rojo = cancelado. */
const TONO_ESTADO: Record<EstadoPedido, Tono> = {
  pendiente: 'marca',
  en_preparacion: 'neutro',
  listo: 'exito',
  entregado: 'neutro',
  cancelado: 'peligro',
}

export function EstadoBadge({ estado }: { estado: EstadoPedido }) {
  return (
    <Insignia tono={TONO_ESTADO[estado]} punto={estado !== 'entregado' && estado !== 'cancelado'}>
      {ETIQUETA_ESTADO[estado]}
    </Insignia>
  )
}

interface PedidoCardProps {
  pedido: PedidoConItems
  ahora: number
  /** Botones de acción (cambian según el rol y el estado). */
  acciones?: ReactNode
  /** Tipografía más grande (pantalla de cocina, mirada a distancia). */
  grande?: boolean
  mostrarTotal?: boolean
}

/** La comanda: mesa, cuánto hace, qué pidieron y qué hacer. */
export function PedidoCard({ pedido, ahora, acciones, grande = false, mostrarTotal = true }: PedidoCardProps) {
  const demora = minutosDesde(pedido.created_at, ahora)
  const urgente = (pedido.estado === 'pendiente' || pedido.estado === 'en_preparacion') && demora >= 15
  const Origen = pedido.origen === 'qr' ? QrCode : UserRound
  return (
    <article className={cn('flex flex-col gap-4 rounded-tarjeta border bg-superficie p-4 motion-safe:animate-entrar', urgente ? 'border-peligro-500' : 'border-borde')}>
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={cn('cifras leading-none font-bold tracking-[-0.02em] text-tinta', grande ? 'text-3xl' : 'text-xl')}>Mesa {pedido.mesas?.numero ?? '?'}</p>
          <p className={cn('cifras mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1', grande ? 'text-sm' : 'text-xs', urgente ? 'font-semibold text-peligro-600' : 'text-tinta-3')}>
            <span className="inline-flex items-center gap-1">
              {urgente ? <Flame aria-hidden size={grande ? 15 : 13} /> : <Timer aria-hidden size={grande ? 15 : 13} />}
              {haceCuanto(pedido.created_at, ahora)}
            </span>
            <span className="inline-flex items-center gap-1 text-tinta-3">
              <Origen aria-hidden size={grande ? 15 : 13} />
              {pedido.origen === 'qr' ? 'Por QR' : 'Mozo'}
            </span>
          </p>
        </div>
        <EstadoBadge estado={pedido.estado} />
      </header>

      <ul className={cn('flex flex-col gap-1.5', grande ? 'text-lg' : 'text-sm')}>
        {pedido.pedido_items.map((i) => (
          <li key={i.id} className="leading-snug">
            <span className="cifras mr-1.5 inline-block min-w-6 font-bold text-marca-700">{i.cantidad}×</span>
            <span className="font-medium text-tinta">{i.nombre_snapshot}</span>
            {i.notas && (
              <span className="mt-0.5 flex items-center gap-1 pl-8 text-xs text-tinta-2">
                <CornerDownRight aria-hidden size={12} /> {i.notas}
              </span>
            )}
          </li>
        ))}
      </ul>

      {pedido.notas && (
        <p className="flex items-start gap-2 rounded-control bg-marca-50 px-3 py-2 text-sm text-marca-800">
          <NotebookPen aria-hidden size={15} className="mt-0.5 shrink-0" />
          {pedido.notas}
        </p>
      )}

      {(mostrarTotal || acciones) && (
        <footer className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-borde pt-3">
          {mostrarTotal ? <p className="cifras text-base font-bold text-tinta">{formatearPrecio(pedido.total)}</p> : <span />}
          <div className="flex flex-wrap gap-2">{acciones}</div>
        </footer>
      )}
    </article>
  )
}
