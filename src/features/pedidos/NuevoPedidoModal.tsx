import { useMemo, useState, type FormEvent } from 'react'
import { Modal } from '@/components/Modal'
import { Aviso, Boton, CargandoSeccion, Campo, ControlCantidad, Selector } from '@/components/ui'
import { IconoEnviar } from '@/components/iconos'
import { formatearPrecio } from '@/lib/formato'
import { mensajeDeError } from '@/lib/errores'
import { useCategorias, useProductos } from '@/features/carta/useCartaAdmin'
import type { Mesa } from '@/services/mesas'
import { useMutacionesPedidos } from './usePedidos'

interface Props {
  abierto: boolean
  onCerrar: () => void
  mesas: Mesa[]
  /** Si se indica, la mesa viene fija (se abrió desde el mapa). */
  mesaFija?: Mesa | null
}

/** Carga de un pedido por el mozo: elegir mesa, cantidades por producto y notas. */
export function NuevoPedidoModal({ abierto, onCerrar, mesas, mesaFija }: Props) {
  return (
    <Modal abierto={abierto} onCerrar={onCerrar} titulo="Nuevo pedido" descripcion={mesaFija ? `Mesa ${mesaFija.numero}` : 'Elegí la mesa y los productos'} ancho="max-w-2xl">
      {abierto && <Formulario onCerrar={onCerrar} mesas={mesas} mesaFija={mesaFija ?? null} />}
    </Modal>
  )
}

function Formulario({ onCerrar, mesas, mesaFija }: { onCerrar: () => void; mesas: Mesa[]; mesaFija: Mesa | null }) {
  const categorias = useCategorias()
  const productos = useProductos()
  const { crear } = useMutacionesPedidos()
  const [mesaId, setMesaId] = useState(mesaFija?.id ?? mesas[0]?.id ?? '')
  const [cantidades, setCantidades] = useState<Record<string, number>>({})
  const [notas, setNotas] = useState('')

  const grupos = useMemo(() => {
    const cats = categorias.data ?? []
    const prods = (productos.data ?? []).filter((p) => p.disponible)
    return cats.map((c) => ({ categoria: c, productos: prods.filter((p) => p.categoria_id === c.id) })).filter((g) => g.productos.length > 0)
  }, [categorias.data, productos.data])

  const items = Object.entries(cantidades).filter(([, c]) => c > 0).map(([producto_id, cantidad]) => ({ producto_id, cantidad }))
  const total = items.reduce((suma, i) => suma + (productos.data?.find((p) => p.id === i.producto_id)?.precio ?? 0) * i.cantidad, 0)

  function cambiar(id: string, delta: number) {
    setCantidades((prev) => ({ ...prev, [id]: Math.max(0, Math.min(50, (prev[id] ?? 0) + delta)) }))
  }

  function enviar(e: FormEvent) {
    e.preventDefault()
    if (items.length === 0 || !mesaId) return
    crear.mutate({ mesaId, items, notas }, { onSuccess: onCerrar })
  }

  const cargando = categorias.isPending || productos.isPending

  return (
    <form onSubmit={enviar} className="flex flex-col gap-5">
      {!mesaFija && (
        <Selector etiqueta="Mesa" id="np-mesa" value={mesaId} onChange={(e) => setMesaId(e.target.value)}>
          {mesas.map((m) => (
            <option key={m.id} value={m.id}>
              Mesa {m.numero}
              {m.estado === 'ocupada' ? ' (ocupada)' : ''}
            </option>
          ))}
        </Selector>
      )}

      <div className="max-h-[45dvh] overflow-y-auto rounded-control border border-borde">
        {cargando && <CargandoSeccion />}
        {!cargando && grupos.length === 0 && <p className="p-6 text-center text-sm text-tinta-2">No hay productos disponibles. Cargalos en la sección Carta.</p>}
        {grupos.map((g) => (
          <section key={g.categoria.id}>
            <h3 className="sticky top-0 z-[1] border-b border-borde bg-superficie-2 px-4 py-2 text-sm font-bold text-tinta-2">{g.categoria.nombre}</h3>
            <ul className="divide-y divide-borde">
              {g.productos.map((p) => {
                const c = cantidades[p.id] ?? 0
                const tope = p.controla_stock ? Math.min(50, p.stock_actual) : 50
                return (
                  <li key={p.id} className={c > 0 ? 'flex items-center gap-3 bg-marca-50/60 px-4 py-2' : 'flex items-center gap-3 px-4 py-2'}>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{p.nombre}</p>
                      <p className="cifras text-xs text-tinta-3">
                        {formatearPrecio(p.precio)}
                        {p.controla_stock && <span className={p.stock_actual <= 0 ? 'font-semibold text-peligro-600' : ''}> · {p.stock_actual <= 0 ? 'sin stock' : `quedan ${p.stock_actual}`}</span>}
                      </p>
                    </div>
                    <ControlCantidad cantidad={c} nombre={p.nombre} tope={tope} onCambiar={(d) => cambiar(p.id, d)} />
                  </li>
                )
              })}
            </ul>
          </section>
        ))}
      </div>

      <Campo etiqueta="Notas del pedido" id="np-notas" value={notas} onChange={(e) => setNotas(e.target.value)} maxLength={300} placeholder="Opcional · Ej: sin sal, para compartir" />

      {crear.isError && <Aviso>{mensajeDeError(crear.error)}</Aviso>}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-borde pt-4">
        <p className="text-sm text-tinta-2">
          {items.length > 0 ? `${items.reduce((s, i) => s + i.cantidad, 0)} productos · ` : ''}
          Total <b className="cifras text-lg text-tinta">{formatearPrecio(total)}</b>
        </p>
        <Boton type="submit" icono={IconoEnviar} cargando={crear.isPending} disabled={items.length === 0 || !mesaId}>
          Enviar a cocina
        </Boton>
      </div>
    </form>
  )
}
