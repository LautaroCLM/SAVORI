import { useMemo, useState, type FormEvent } from 'react'
import { Modal } from '@/components/Modal'
import { Boton } from '@/components/ui'
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
    <Modal abierto={abierto} onCerrar={onCerrar} titulo={mesaFija ? `Nuevo pedido · Mesa ${mesaFija.numero}` : 'Nuevo pedido'} ancho="max-w-2xl">
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

  return (
    <form onSubmit={enviar} className="flex flex-col gap-4">
      {!mesaFija && (
        <label className="flex flex-col gap-1.5 text-sm font-medium text-stone-700">
          Mesa
          <select value={mesaId} onChange={(e) => setMesaId(e.target.value)} className="h-11 rounded-lg border border-stone-300 bg-white px-3 text-base outline-none focus:border-marca-600">
            {mesas.map((m) => (
              <option key={m.id} value={m.id}>Mesa {m.numero}{m.estado === 'ocupada' ? ' (ocupada)' : ''}</option>
            ))}
          </select>
        </label>
      )}

      <div className="max-h-[45dvh] overflow-y-auto rounded-xl border border-stone-200">
        {grupos.length === 0 && <p className="p-6 text-center text-sm text-stone-500">No hay productos disponibles. Cargalos en la sección Carta.</p>}
        {grupos.map((g) => (
          <section key={g.categoria.id}>
            <h3 className="sticky top-0 bg-stone-50 px-4 py-2 text-xs font-bold tracking-wide text-stone-500 uppercase">{g.categoria.nombre}</h3>
            <ul className="divide-y divide-stone-100">
              {g.productos.map((p) => {
                const c = cantidades[p.id] ?? 0
                const tope = p.controla_stock ? Math.min(50, p.stock_actual) : 50
                return (
                  <li key={p.id} className="flex items-center gap-3 px-4 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{p.nombre}</p>
                      <p className="text-xs text-stone-500 tabular-nums">{formatearPrecio(p.precio)}{p.controla_stock && <span className={p.stock_actual <= 0 ? ' font-semibold text-red-700' : ''}> · {p.stock_actual <= 0 ? 'sin stock' : `quedan ${p.stock_actual}`}</span>}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => cambiar(p.id, -1)} disabled={c === 0} aria-label={`Quitar ${p.nombre}`} className="size-9 rounded-lg border border-stone-300 text-lg leading-none hover:bg-stone-100 disabled:opacity-30">−</button>
                      <span className="w-6 text-center font-semibold tabular-nums">{c}</span>
                      <button type="button" onClick={() => cambiar(p.id, 1)} disabled={c >= tope} aria-label={`Agregar ${p.nombre}`} className="size-9 rounded-lg border border-stone-300 text-lg leading-none hover:bg-stone-100 disabled:opacity-30">+</button>
                    </div>
                  </li>
                )
              })}
            </ul>
          </section>
        ))}
      </div>

      <label className="flex flex-col gap-1.5 text-sm font-medium text-stone-700">
        Notas del pedido (opcional)
        <input value={notas} onChange={(e) => setNotas(e.target.value)} maxLength={300} placeholder="Ej: sin sal, para compartir" className="h-11 rounded-lg border border-stone-300 bg-white px-3 text-base outline-none focus:border-marca-600" />
      </label>

      {crear.isError && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{mensajeDeError(crear.error)}</p>}

      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-stone-600">Total estimado: <b className="tabular-nums">{formatearPrecio(total)}</b></p>
        <Boton type="submit" cargando={crear.isPending} disabled={items.length === 0 || !mesaId}>Enviar a cocina</Boton>
      </div>
    </form>
  )
}
