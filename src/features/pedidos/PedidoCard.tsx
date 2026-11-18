import type { ReactNode } from 'react'
import { formatearPrecio, haceCuanto, minutosDesde } from '@/lib/formato'
import type { EstadoPedido, PedidoConItems } from '@/services/pedidos'

export const ETIQUETA_ESTADO: Record<EstadoPedido, string> = {
  pendiente: 'Pendiente',
  en_preparacion: 'En preparación',
  listo: 'Listo',
  entregado: 'Entregado',
  cancelado: 'Cancelado',
}

const COLOR_ESTADO: Record<EstadoPedido, string> = {
  pendiente: 'bg-amber-100 text-amber-900',
  en_preparacion: 'bg-sky-100 text-sky-900',
  listo: 'bg-emerald-100 text-emerald-900',
  entregado: 'bg-stone-100 text-stone-600',
  cancelado: 'bg-red-100 text-red-800',
}

export function EstadoBadge({ estado }: { estado: EstadoPedido }) {
  return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${COLOR_ESTADO[estado]}`}>{ETIQUETA_ESTADO[estado]}</span>
}

interface PedidoCardProps {
  pedido: PedidoConItems
  ahora: number
  /** Botones de acción (cambian según el rol y el estado). */
  acciones?: ReactNode
  /** Tipografía más grande (pantalla de cocina). */
  grande?: boolean
  mostrarTotal?: boolean
}

export function PedidoCard({ pedido, ahora, acciones, grande = false, mostrarTotal = true }: PedidoCardProps) {
  const demora = minutosDesde(pedido.created_at, ahora)
  const urgente = (pedido.estado === 'pendiente' || pedido.estado === 'en_preparacion') && demora >= 15
  return (
    <article className={`flex flex-col gap-3 rounded-xl bg-white p-4 shadow-sm ring-1 ${urgente ? 'ring-2 ring-red-400' : 'ring-stone-200'}`}>
      <header className="flex items-start justify-between gap-2">
        <div>
          <p className={`${grande ? 'text-2xl' : 'text-lg'} font-extrabold text-stone-900`}>Mesa {pedido.mesas?.numero ?? '?'}</p>
          <p className={`text-xs ${urgente ? 'font-semibold text-red-700' : 'text-stone-500'}`}>
            {haceCuanto(pedido.created_at, ahora)} · {pedido.origen === 'qr' ? 'Pedido por QR' : 'Cargado por mozo'}
          </p>
        </div>
        <EstadoBadge estado={pedido.estado} />
      </header>

      <ul className={`${grande ? 'text-lg' : 'text-sm'} flex flex-col gap-1`}>
        {pedido.pedido_items.map((i) => (
          <li key={i.id}>
            <span className="font-bold tabular-nums">{i.cantidad}×</span> {i.nombre_snapshot}
            {i.notas && <span className="block text-xs text-stone-500">↳ {i.notas}</span>}
          </li>
        ))}
      </ul>

      {pedido.notas && <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">📝 {pedido.notas}</p>}

      {(mostrarTotal || acciones) && (
        <footer className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-1">
          {mostrarTotal ? <p className="text-sm font-semibold tabular-nums text-stone-700">{formatearPrecio(pedido.total)}</p> : <span />}
          <div className="flex flex-wrap gap-2">{acciones}</div>
        </footer>
      )}
    </article>
  )
}
