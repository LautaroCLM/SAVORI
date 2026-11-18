import { useMemo, useState, type FormEvent } from 'react'
import { Modal } from '@/components/Modal'
import { Boton, Campo, Spinner } from '@/components/ui'
import { formatearFechaHora } from '@/lib/formato'
import { mensajeDeError } from '@/lib/errores'
import { useCategorias, useProductos } from '@/features/carta/useCartaAdmin'
import type { Producto } from '@/services/carta'
import { estadoStock, type EstadoStock, type TipoMovimiento } from '@/services/stock'
import { useMovimientos, useMutacionesStock } from './useStock'

const ESTILO_ESTADO: Record<EstadoStock, { texto: string; clase: string }> = {
  agotado: { texto: 'Agotado', clase: 'bg-red-100 text-red-800' },
  bajo: { texto: 'Stock bajo', clase: 'bg-amber-100 text-amber-900' },
  ok: { texto: 'OK', clase: 'bg-emerald-100 text-emerald-800' },
}

const TIPOS: { valor: Extract<TipoMovimiento, 'entrada' | 'salida' | 'ajuste'>; etiqueta: string; ayuda: string }[] = [
  { valor: 'entrada', etiqueta: 'Entrada', ayuda: 'Compra o reposición: suma al stock.' },
  { valor: 'salida', etiqueta: 'Salida', ayuda: 'Merma, rotura o consumo interno: resta del stock.' },
  { valor: 'ajuste', etiqueta: 'Conteo', ayuda: 'Indicá cuántas unidades hay realmente: se corrige la diferencia.' },
]

const ETIQUETA_MOVIMIENTO: Record<TipoMovimiento, string> = { entrada: 'Entrada', salida: 'Salida', ajuste: 'Ajuste', venta: 'Venta' }

const num = (n: number) => new Intl.NumberFormat('es-AR', { maximumFractionDigits: 3 }).format(n)

// --- Ajustar stock ----------------------------------------------------------

function FormAjuste({ producto, onCerrar }: { producto: Producto; onCerrar: () => void }) {
  const { registrar } = useMutacionesStock()
  const [tipo, setTipo] = useState<(typeof TIPOS)[number]['valor']>('entrada')
  const [cantidad, setCantidad] = useState('')
  const [motivo, setMotivo] = useState('')

  const n = Number(cantidad)
  const valida = cantidad !== '' && Number.isFinite(n) && n >= 0 && (tipo === 'ajuste' || n > 0)
  const resultado = !valida ? null : tipo === 'entrada' ? producto.stock_actual + n : tipo === 'salida' ? producto.stock_actual - n : n

  function enviar(e: FormEvent) {
    e.preventDefault()
    if (!valida) return
    registrar.mutate({ id: producto.id, tipo, cantidad: n, motivo }, { onSuccess: onCerrar })
  }

  return (
    <form onSubmit={enviar} className="flex flex-col gap-4">
      <p className="text-sm text-stone-600">Stock actual: <b className="tabular-nums">{num(producto.stock_actual)}</b></p>
      <div role="radiogroup" aria-label="Tipo de movimiento" className="grid grid-cols-3 gap-2">
        {TIPOS.map((t) => (
          <button
            key={t.valor}
            type="button"
            role="radio"
            aria-checked={tipo === t.valor}
            onClick={() => setTipo(t.valor)}
            className={`rounded-lg border px-3 py-2.5 text-sm font-semibold transition-colors ${tipo === t.valor ? 'border-marca-600 bg-marca-50 text-marca-700' : 'border-stone-300 text-stone-600 hover:bg-stone-50'}`}
          >
            {t.etiqueta}
          </button>
        ))}
      </div>
      <p className="-mt-2 text-xs text-stone-500">{TIPOS.find((t) => t.valor === tipo)?.ayuda}</p>
      <Campo etiqueta={tipo === 'ajuste' ? 'Unidades contadas' : 'Cantidad'} id="stock-cant" type="number" inputMode="decimal" min={0} step="any" required autoFocus value={cantidad} onChange={(e) => setCantidad(e.target.value)} />
      <Campo etiqueta="Motivo (opcional)" id="stock-motivo" maxLength={200} placeholder={tipo === 'entrada' ? 'Ej: compra a proveedor' : tipo === 'salida' ? 'Ej: rotura' : 'Ej: inventario de cierre'} value={motivo} onChange={(e) => setMotivo(e.target.value)} />
      {resultado !== null && (
        <p className={`rounded-lg px-3 py-2 text-sm ${resultado < 0 ? 'bg-red-50 text-red-700' : 'bg-stone-50 text-stone-700'}`}>
          {resultado < 0 ? 'No alcanza el stock para esa salida.' : <>Quedaría en <b className="tabular-nums">{num(resultado)}</b></>}
        </p>
      )}
      {registrar.isError && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{mensajeDeError(registrar.error)}</p>}
      <Boton type="submit" cargando={registrar.isPending} disabled={!valida || (resultado !== null && resultado < 0)}>Registrar</Boton>
    </form>
  )
}

// --- Configurar control de stock -------------------------------------------

function FormConfig({ producto, onCerrar }: { producto: Producto; onCerrar: () => void }) {
  const { configurar } = useMutacionesStock()
  const [controla, setControla] = useState(producto.controla_stock)
  const [minimo, setMinimo] = useState(String(producto.stock_minimo))
  const [inicial, setInicial] = useState('')
  const primeraVez = !producto.controla_stock && controla

  function enviar(e: FormEvent) {
    e.preventDefault()
    configurar.mutate(
      { id: producto.id, controla_stock: controla, stock_minimo: Number(minimo || 0), stockInicial: primeraVez ? Number(inicial || 0) : undefined },
      { onSuccess: onCerrar },
    )
  }

  return (
    <form onSubmit={enviar} className="flex flex-col gap-4">
      <label className="flex items-start gap-3 text-sm font-medium text-stone-700">
        <input type="checkbox" checked={controla} onChange={(e) => setControla(e.target.checked)} className="mt-0.5 size-4 accent-marca-600" />
        <span>
          Controlar el stock de este producto
          <span className="mt-0.5 block text-xs font-normal text-stone-500">
            Cada venta descuenta unidades automáticamente, el producto se oculta de la carta al agotarse y cancelar un pedido devuelve el stock.
          </span>
        </span>
      </label>
      {controla && (
        <>
          <Campo etiqueta="Avisarme cuando queden (stock mínimo)" id="cfg-min" type="number" inputMode="decimal" min={0} step="any" value={minimo} onChange={(e) => setMinimo(e.target.value)} />
          {primeraVez && <Campo etiqueta="Stock inicial (unidades que hay hoy)" id="cfg-ini" type="number" inputMode="decimal" min={0} step="any" value={inicial} onChange={(e) => setInicial(e.target.value)} />}
          {primeraVez && Number(inicial || 0) === 0 && <p className="text-xs text-amber-700">Con stock 0 el producto no aparecerá en la carta hasta que cargues una entrada.</p>}
        </>
      )}
      {!controla && producto.controla_stock && <p className="text-xs text-amber-700">Dejará de descontar stock y volverá a mostrarse siempre en la carta (si está disponible).</p>}
      {configurar.isError && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{mensajeDeError(configurar.error)}</p>}
      <Boton type="submit" cargando={configurar.isPending}>Guardar</Boton>
    </form>
  )
}

// --- Página -----------------------------------------------------------------

type Dialogo = { tipo: 'ajuste' | 'config'; producto: Producto } | null

export function StockPage() {
  const productos = useProductos()
  const categorias = useCategorias()
  const [vista, setVista] = useState<'inventario' | 'movimientos'>('inventario')
  const movimientos = useMovimientos(vista === 'movimientos')
  const [dialogo, setDialogo] = useState<Dialogo>(null)

  const nombreCategoria = useMemo(() => new Map((categorias.data ?? []).map((c) => [c.id, c.nombre])), [categorias.data])
  const controlados = (productos.data ?? []).filter((p) => p.controla_stock)
  const sinControl = (productos.data ?? []).filter((p) => !p.controla_stock)
  // Primero lo que requiere atención
  const orden: Record<EstadoStock, number> = { agotado: 0, bajo: 1, ok: 2 }
  const ordenados = [...controlados].sort((a, b) => orden[estadoStock(a)] - orden[estadoStock(b)] || a.nombre.localeCompare(b.nombre))
  const agotados = controlados.filter((p) => estadoStock(p) === 'agotado').length
  const bajos = controlados.filter((p) => estadoStock(p) === 'bajo').length

  if (productos.isPending) return <div className="flex justify-center py-20"><Spinner className="size-8" /></div>
  if (productos.isError) return <p className="rounded-lg bg-red-50 p-4 text-red-700">{mensajeDeError(productos.error)}</p>

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-2xl font-bold text-stone-900">Stock</h1>

      <div role="tablist" className="mt-5 inline-flex rounded-xl bg-stone-200/60 p-1">
        {(['inventario', 'movimientos'] as const).map((v) => (
          <button key={v} role="tab" aria-selected={vista === v} onClick={() => setVista(v)} className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${vista === v ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-800'}`}>
            {v === 'inventario' ? 'Inventario' : 'Movimientos'}
          </button>
        ))}
      </div>

      {vista === 'inventario' ? (
        <>
          {(agotados > 0 || bajos > 0) && (
            <div role="alert" className="mt-5 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <b>Atención:</b> {agotados > 0 && `${agotados} producto${agotados > 1 ? 's' : ''} agotado${agotados > 1 ? 's' : ''}`}
              {agotados > 0 && bajos > 0 && ' y '}
              {bajos > 0 && `${bajos} con stock bajo`}. Los agotados no aparecen en la carta de los clientes.
            </div>
          )}

          {controlados.length === 0 ? (
            <div className="mt-6 rounded-xl border border-dashed border-stone-300 bg-white p-10 text-center">
              <p className="font-semibold text-stone-800">Todavía no controlás el stock de ningún producto</p>
              <p className="mt-1 text-sm text-stone-500">Activalo en los productos que querés contar (bebidas, postres, cortes limitados…). El resto se vende sin límite.</p>
            </div>
          ) : (
            <ul className="mt-5 divide-y divide-stone-100 overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-stone-200">
              {ordenados.map((p) => {
                const e = estadoStock(p)
                return (
                  <li key={p.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 p-4">
                    <div className="min-w-0 flex-1 basis-44">
                      <p className="font-semibold text-stone-900">{p.nombre}</p>
                      <p className="text-xs text-stone-500">{nombreCategoria.get(p.categoria_id)} · mínimo {num(p.stock_minimo)}</p>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${ESTILO_ESTADO[e].clase}`}>{ESTILO_ESTADO[e].texto}</span>
                    <p className="w-16 text-right text-2xl font-extrabold tabular-nums">{num(p.stock_actual)}</p>
                    <div className="flex gap-2">
                      <Boton className="h-9" onClick={() => setDialogo({ tipo: 'ajuste', producto: p })}>Ajustar</Boton>
                      <Boton variante="secundario" className="h-9" onClick={() => setDialogo({ tipo: 'config', producto: p })}>Configurar</Boton>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}

          {sinControl.length > 0 && (
            <section className="mt-8">
              <h2 className="mb-2 text-sm font-bold tracking-wide text-stone-500 uppercase">Sin control de stock · {sinControl.length}</h2>
              <ul className="divide-y divide-stone-100 overflow-hidden rounded-xl bg-white ring-1 ring-stone-200">
                {sinControl.map((p) => (
                  <li key={p.id} className="flex items-center gap-3 px-4 py-3">
                    <p className="min-w-0 flex-1 truncate text-sm text-stone-700">{p.nombre} <span className="text-xs text-stone-400">· {nombreCategoria.get(p.categoria_id)}</span></p>
                    <Boton variante="secundario" className="h-9" onClick={() => setDialogo({ tipo: 'config', producto: p })}>Controlar stock</Boton>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      ) : movimientos.isPending ? (
        <div className="flex justify-center py-20"><Spinner className="size-8" /></div>
      ) : movimientos.isError ? (
        <p className="mt-6 rounded-lg bg-red-50 p-4 text-red-700">{mensajeDeError(movimientos.error)}</p>
      ) : movimientos.data.length === 0 ? (
        <p className="mt-6 rounded-xl border border-dashed border-stone-300 bg-white p-10 text-center text-stone-500">Todavía no hay movimientos de stock.</p>
      ) : (
        <ul className="mt-5 divide-y divide-stone-100 overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-stone-200">
          {movimientos.data.map((m) => (
            <li key={m.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3">
              <div className="min-w-0 flex-1 basis-44">
                <p className="truncate text-sm font-medium">{m.productos?.nombre ?? 'Producto eliminado'}</p>
                <p className="text-xs text-stone-500">{ETIQUETA_MOVIMIENTO[m.tipo]}{m.motivo ? ` · ${m.motivo}` : ''}</p>
              </div>
              <span className={`text-sm font-bold tabular-nums ${m.cantidad < 0 ? 'text-rose-700' : 'text-emerald-700'}`}>{m.cantidad > 0 ? '+' : ''}{num(m.cantidad)}</span>
              <span className="w-28 text-right text-xs text-stone-400">{formatearFechaHora(m.created_at)}</span>
            </li>
          ))}
        </ul>
      )}

      <Modal abierto={dialogo?.tipo === 'ajuste'} onCerrar={() => setDialogo(null)} titulo={dialogo ? `Ajustar stock · ${dialogo.producto.nombre}` : ''} ancho="max-w-md">
        {dialogo?.tipo === 'ajuste' && <FormAjuste producto={dialogo.producto} onCerrar={() => setDialogo(null)} />}
      </Modal>
      <Modal abierto={dialogo?.tipo === 'config'} onCerrar={() => setDialogo(null)} titulo={dialogo ? `Control de stock · ${dialogo.producto.nombre}` : ''} ancho="max-w-md">
        {dialogo?.tipo === 'config' && <FormConfig producto={dialogo.producto} onCerrar={() => setDialogo(null)} />}
      </Modal>
    </div>
  )
}
