import { useState } from 'react'
import { Modal } from '@/components/Modal'
import { Boton, Spinner } from '@/components/ui'
import { formatearPrecio } from '@/lib/formato'
import { mensajeDeError } from '@/lib/errores'
import { EstadoBadge } from '@/features/pedidos/PedidoCard'
import { useMutacionesPedidos, usePedidosDeSesion, useSesionesAbiertas } from '@/features/pedidos/usePedidos'
import type { MetodoPago } from '@/services/pedidos'
import type { Mesa } from '@/services/mesas'
import { useMutacionesMesas } from './useMesasAdmin'

const METODOS: { valor: MetodoPago; etiqueta: string }[] = [
  { valor: 'efectivo', etiqueta: 'Efectivo' },
  { valor: 'debito', etiqueta: 'Tarjeta de débito' },
  { valor: 'credito', etiqueta: 'Tarjeta de crédito' },
  { valor: 'transferencia', etiqueta: 'Transferencia' },
  { valor: 'mercadopago', etiqueta: 'Mercado Pago' },
  { valor: 'otro', etiqueta: 'Otro' },
]

interface Props {
  mesa: Mesa | null
  onCerrar: () => void
  onNuevoPedido: (mesa: Mesa) => void
  onVerQr: (mesa: Mesa) => void
}

/** Detalle de una mesa en servicio: cuenta abierta, pedidos, cobro y estado manual. */
export function MesaPanel({ mesa, onCerrar, onNuevoPedido, onVerQr }: Props) {
  return (
    <Modal abierto={mesa !== null} onCerrar={onCerrar} titulo={mesa ? `Mesa ${mesa.numero}` : ''} ancho="max-w-xl">
      {mesa && <Contenido mesa={mesa} onCerrar={onCerrar} onNuevoPedido={onNuevoPedido} onVerQr={onVerQr} />}
    </Modal>
  )
}

function Contenido({ mesa, onCerrar, onNuevoPedido, onVerQr }: { mesa: Mesa; onCerrar: () => void; onNuevoPedido: (m: Mesa) => void; onVerQr: (m: Mesa) => void }) {
  const sesiones = useSesionesAbiertas()
  const sesion = sesiones.data?.find((s) => s.mesa_id === mesa.id) ?? null
  const pedidos = usePedidosDeSesion(sesion?.id ?? null)
  const { cerrarCuenta, cambiarEstado } = useMutacionesPedidos()
  const { actualizarMesa } = useMutacionesMesas()
  const [metodo, setMetodo] = useState<MetodoPago>('efectivo')

  const vigentes = (pedidos.data ?? []).filter((p) => p.estado !== 'cancelado')
  const total = vigentes.reduce((s, p) => s + p.total, 0)
  const sinEntregar = vigentes.filter((p) => p.estado !== 'entregado').length
  const ocupada = mesa.estado === 'ocupada'

  function cobrar() {
    const aviso = sinEntregar > 0 ? `Hay ${sinEntregar} pedido(s) sin entregar. ` : ''
    if (window.confirm(`${aviso}¿Cerrar la cuenta de la mesa ${mesa.numero} por ${formatearPrecio(total)} (${METODOS.find((m) => m.valor === metodo)?.etiqueta})?`)) {
      cerrarCuenta.mutate({ mesaId: mesa.id, metodo }, { onSuccess: onCerrar })
    }
  }

  const error = cerrarCuenta.error ?? cambiarEstado.error ?? actualizarMesa.error

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <span className={`rounded-full px-3 py-1 text-sm font-semibold ${ocupada ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'}`}>{ocupada ? 'Ocupada' : 'Libre'}</span>
        <span className="text-sm text-stone-500">{mesa.capacidad} personas</span>
        <button onClick={() => onVerQr(mesa)} className="ml-auto text-sm text-stone-500 underline hover:text-stone-800">Ver QR</button>
      </div>

      {sesiones.isPending || (sesion && pedidos.isPending) ? (
        <div className="flex justify-center py-6"><Spinner /></div>
      ) : sesion ? (
        <section>
          <h3 className="mb-2 text-xs font-bold tracking-wide text-stone-500 uppercase">Cuenta abierta</h3>
          {vigentes.length === 0 ? (
            <p className="rounded-lg bg-stone-50 p-4 text-sm text-stone-500">Todavía no hay pedidos en esta cuenta.</p>
          ) : (
            <ul className="divide-y divide-stone-100 rounded-xl border border-stone-200">
              {vigentes.map((p) => (
                <li key={p.id} className="flex flex-col gap-1 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <EstadoBadge estado={p.estado} />
                    <span className="text-sm font-semibold tabular-nums">{formatearPrecio(p.total)}</span>
                  </div>
                  <p className="text-sm text-stone-700">{p.pedido_items.map((i) => `${i.cantidad}× ${i.nombre_snapshot}`).join(', ')}</p>
                  {p.estado === 'listo' && (
                    <div>
                      <Boton className="mt-1 h-9" onClick={() => cambiarEstado.mutate({ id: p.id, estado: 'entregado' })}>Marcar entregado</Boton>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 flex items-center justify-between text-base font-bold">
            <span>Total</span>
            <span className="tabular-nums">{formatearPrecio(total)}</span>
          </p>
        </section>
      ) : (
        <p className="rounded-lg bg-stone-50 p-4 text-sm text-stone-500">{ocupada ? 'La mesa está marcada como ocupada, pero no tiene una cuenta abierta.' : 'La mesa está libre.'}</p>
      )}

      {error != null && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{mensajeDeError(error)}</p>}

      <div className="flex flex-col gap-3 border-t border-stone-100 pt-4">
        <Boton onClick={() => onNuevoPedido(mesa)}>+ Nuevo pedido</Boton>

        {sesion && (
          <div className="flex flex-wrap items-end gap-2">
            <label className="flex min-w-40 flex-1 flex-col gap-1 text-xs font-medium text-stone-600">
              Medio de pago
              <select value={metodo} onChange={(e) => setMetodo(e.target.value as MetodoPago)} className="h-11 rounded-lg border border-stone-300 bg-white px-3 text-sm outline-none focus:border-marca-600">
                {METODOS.map((m) => (
                  <option key={m.valor} value={m.valor}>{m.etiqueta}</option>
                ))}
              </select>
            </label>
            <Boton variante="secundario" onClick={cobrar} cargando={cerrarCuenta.isPending}>Cerrar cuenta</Boton>
          </div>
        )}

        {!sesion && (
          <Boton variante="secundario" cargando={actualizarMesa.isPending} onClick={() => actualizarMesa.mutate({ id: mesa.id, cambios: { estado: ocupada ? 'libre' : 'ocupada' } })}>
            Marcar como {ocupada ? 'libre' : 'ocupada'}
          </Boton>
        )}
      </div>
    </div>
  )
}
