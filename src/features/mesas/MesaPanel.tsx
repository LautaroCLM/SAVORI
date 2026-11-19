import { useState } from 'react'
import { QrCode } from 'lucide-react'
import { Modal } from '@/components/Modal'
import { useConfirmar } from '@/components/Confirmar'
import { Aviso, Boton, Insignia, Selector, Spinner } from '@/components/ui'
import { IconoAgregar, IconoCobrar, IconoEntregado } from '@/components/iconos'
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
    <Modal
      abierto={mesa !== null}
      onCerrar={onCerrar}
      titulo={mesa ? `Mesa ${mesa.numero}` : ''}
      descripcion={mesa ? `${mesa.capacidad} personas` : undefined}
      ancho="max-w-xl"
    >
      {mesa && <Contenido mesa={mesa} onCerrar={onCerrar} onNuevoPedido={onNuevoPedido} onVerQr={onVerQr} />}
    </Modal>
  )
}

function Contenido({ mesa, onCerrar, onNuevoPedido, onVerQr }: { mesa: Mesa; onCerrar: () => void; onNuevoPedido: (m: Mesa) => void; onVerQr: (m: Mesa) => void }) {
  const sesiones = useSesionesAbiertas()
  const sesion = sesiones.data?.find((s) => s.mesa_id === mesa.id) ?? null
  const pedidos = usePedidosDeSesion(sesion?.id ?? null)
  const { cerrarCuenta, cambiarEstado } = useMutacionesPedidos()
  const { estadoMesa } = useMutacionesMesas()
  const confirmar = useConfirmar()
  const [metodo, setMetodo] = useState<MetodoPago>('efectivo')

  const vigentes = (pedidos.data ?? []).filter((p) => p.estado !== 'cancelado')
  const total = vigentes.reduce((s, p) => s + p.total, 0)
  const sinEntregar = vigentes.filter((p) => p.estado !== 'entregado').length
  const ocupada = mesa.estado === 'ocupada'

  async function cobrar() {
    const etiquetaMetodo = METODOS.find((m) => m.valor === metodo)?.etiqueta
    const ok = await confirmar({
      titulo: `Cobrar ${formatearPrecio(total)}`,
      mensaje: (
        <>
          Se cierra la cuenta de la mesa {mesa.numero} con <b className="font-semibold text-tinta">{etiquetaMetodo}</b> y la mesa queda libre.
          {sinEntregar > 0 && <span className="mt-2 block font-semibold text-marca-700">Atención: hay {sinEntregar} pedido(s) sin entregar.</span>}
        </>
      ),
      confirmar: 'Cerrar cuenta',
    })
    if (ok) cerrarCuenta.mutate({ mesaId: mesa.id, metodo }, { onSuccess: onCerrar })
  }

  const error = cerrarCuenta.error ?? cambiarEstado.error ?? estadoMesa.error

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-3">
        <Insignia tono={ocupada ? 'marca' : 'exito'} punto>
          {ocupada ? 'Ocupada' : 'Libre'}
        </Insignia>
        <Boton variante="fantasma" tamano="sm" icono={QrCode} onClick={() => onVerQr(mesa)}>
          Ver QR
        </Boton>
      </div>

      {sesiones.isPending || (sesion && pedidos.isPending) ? (
        <div className="flex justify-center py-6">
          <Spinner />
        </div>
      ) : sesion ? (
        <section aria-label="Cuenta abierta">
          {vigentes.length === 0 ? (
            <p className="rounded-control bg-superficie-2 p-4 text-sm text-tinta-2">La cuenta está abierta pero todavía no tiene pedidos.</p>
          ) : (
            <ul className="divide-y divide-borde overflow-hidden rounded-control border border-borde">
              {vigentes.map((p) => (
                <li key={p.id} className="flex flex-col gap-2 p-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <EstadoBadge estado={p.estado} />
                    <span className="cifras text-sm font-bold">{formatearPrecio(p.total)}</span>
                  </div>
                  <p className="text-sm text-tinta-2">{p.pedido_items.map((i) => `${i.cantidad}× ${i.nombre_snapshot}`).join(' · ')}</p>
                  {p.estado === 'listo' && (
                    <div>
                      <Boton tamano="sm" icono={IconoEntregado} onClick={() => cambiarEstado.mutate({ id: p.id, estado: 'entregado' })}>
                        Marcar entregado
                      </Boton>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
          <p className="mt-4 flex items-baseline justify-between">
            <span className="text-sm font-semibold text-tinta-2">Total de la cuenta</span>
            <span className="cifras text-2xl font-bold tracking-[-0.02em]">{formatearPrecio(total)}</span>
          </p>
        </section>
      ) : (
        <p className="rounded-control bg-superficie-2 p-4 text-sm text-tinta-2">{ocupada ? 'La mesa está marcada como ocupada, pero no tiene una cuenta abierta.' : 'La mesa está libre. Cargá un pedido para abrir la cuenta.'}</p>
      )}

      {error != null && <Aviso>{mensajeDeError(error)}</Aviso>}

      <div className="flex flex-col gap-3 border-t border-borde pt-5">
        <Boton icono={IconoAgregar} variante={sesion ? 'secundario' : 'primario'} onClick={() => onNuevoPedido(mesa)}>
          Nuevo pedido
        </Boton>

        {sesion && (
          <div className="flex flex-wrap items-end gap-2">
            <Selector etiqueta="Medio de pago" id="medio-pago" value={metodo} onChange={(e) => setMetodo(e.target.value as MetodoPago)} envoltura="min-w-44 flex-1">
              {METODOS.map((m) => (
                <option key={m.valor} value={m.valor}>
                  {m.etiqueta}
                </option>
              ))}
            </Selector>
            <Boton icono={IconoCobrar} onClick={cobrar} cargando={cerrarCuenta.isPending}>
              Cobrar
            </Boton>
          </div>
        )}

        {!sesion && (
          <Boton variante="fantasma" cargando={estadoMesa.isPending} onClick={() => estadoMesa.mutate({ id: mesa.id, estado: ocupada ? 'libre' : 'ocupada' })}>
            Marcar como {ocupada ? 'libre' : 'ocupada'}
          </Boton>
        )}
      </div>
    </div>
  )
}
