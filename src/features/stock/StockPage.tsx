import { useMemo, useState, type FormEvent } from 'react'
import { ArrowDownToLine, ArrowUpFromLine, Boxes, ClipboardList, Scale } from 'lucide-react'
import { Modal } from '@/components/Modal'
import { Aviso, Boton, BotonIcono, CargandoSeccion, Campo, EncabezadoPagina, EstadoVacio, Insignia, Interruptor, Pestanas, Tarjeta, type Tono } from '@/components/ui'
import { IconoConfigurar, IconoConfirmar } from '@/components/iconos'
import { cn } from '@/lib/utils'
import { formatearFechaHora } from '@/lib/formato'
import { mensajeDeError } from '@/lib/errores'
import { useCategorias, useProductos } from '@/features/carta/useCartaAdmin'
import type { Producto } from '@/services/carta'
import { estadoStock, type EstadoStock, type TipoMovimiento } from '@/services/stock'
import { useMovimientos, useMutacionesStock } from './useStock'

const ESTILO_ESTADO: Record<EstadoStock, { texto: string; tono: Tono }> = {
  agotado: { texto: 'Agotado', tono: 'peligro' },
  bajo: { texto: 'Stock bajo', tono: 'marca' },
  ok: { texto: 'En stock', tono: 'exito' },
}

const TIPOS: { valor: Extract<TipoMovimiento, 'entrada' | 'salida' | 'ajuste'>; etiqueta: string; ayuda: string; icono: typeof Scale }[] = [
  { valor: 'entrada', icono: ArrowDownToLine, etiqueta: 'Entrada', ayuda: 'Compra o reposición: suma al stock.' },
  { valor: 'salida', icono: ArrowUpFromLine, etiqueta: 'Salida', ayuda: 'Merma, rotura o consumo interno: resta del stock.' },
  { valor: 'ajuste', icono: Scale, etiqueta: 'Conteo', ayuda: 'Indicá cuántas unidades hay realmente: se corrige la diferencia.' },
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
    <form onSubmit={enviar} className="flex flex-col gap-5">
      <div role="radiogroup" aria-label="Tipo de movimiento" className="grid grid-cols-3 gap-2">
        {TIPOS.map((t) => {
          const Icono = t.icono
          const activo = tipo === t.valor
          return (
            <button
              key={t.valor}
              type="button"
              role="radio"
              aria-checked={activo}
              onClick={() => setTipo(t.valor)}
              className={cn(
                'flex min-h-16 flex-col items-center justify-center gap-1 rounded-control border text-sm font-semibold transition-colors duration-150',
                activo ? 'border-marca-600 bg-marca-50 text-marca-800' : 'border-borde-fuerte text-tinta-2 hover:bg-superficie-2 hover:text-tinta',
              )}
            >
              <Icono aria-hidden size={18} />
              {t.etiqueta}
            </button>
          )
        })}
      </div>
      <p className="-mt-3 text-xs leading-relaxed text-tinta-3">{TIPOS.find((t) => t.valor === tipo)?.ayuda}</p>
      <Campo etiqueta={tipo === 'ajuste' ? 'Unidades contadas' : 'Cantidad'} id="stock-cant" type="number" inputMode="decimal" min={0} step="any" required autoFocus value={cantidad} onChange={(e) => setCantidad(e.target.value)} className="cifras" />
      <Campo etiqueta="Motivo" id="stock-motivo" maxLength={200} placeholder={tipo === 'entrada' ? 'Opcional · Ej: compra a proveedor' : tipo === 'salida' ? 'Opcional · Ej: rotura' : 'Opcional · Ej: inventario de cierre'} value={motivo} onChange={(e) => setMotivo(e.target.value)} />
      <div className="cifras flex items-center justify-between rounded-control bg-superficie-2 px-4 py-3 text-sm">
        <span className="text-tinta-2">
          Ahora <b className="text-base text-tinta">{num(producto.stock_actual)}</b>
        </span>
        <span aria-live="polite" className={resultado !== null && resultado < 0 ? 'font-semibold text-peligro-600' : 'text-tinta-2'}>
          {resultado === null ? 'Quedaría en —' : resultado < 0 ? 'No alcanza el stock' : <>Quedaría en <b className="text-base text-tinta">{num(resultado)}</b></>}
        </span>
      </div>
      {registrar.isError && <Aviso>{mensajeDeError(registrar.error)}</Aviso>}
      <Boton type="submit" icono={IconoConfirmar} cargando={registrar.isPending} disabled={!valida || (resultado !== null && resultado < 0)}>
        Registrar movimiento
      </Boton>
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
    <form onSubmit={enviar} className="flex flex-col gap-5">
      <div>
        <Interruptor activo={controla} onCambiar={setControla} etiqueta="Controlar el stock de este producto" />
        <p className="mt-1 text-xs leading-relaxed text-tinta-3">
          Cada venta descuenta unidades automáticamente, el producto se oculta de la carta al agotarse y cancelar un pedido devuelve el stock.
        </p>
      </div>
      {controla && (
        <>
          <Campo etiqueta="Avisarme cuando queden (stock mínimo)" id="cfg-min" type="number" inputMode="decimal" min={0} step="any" value={minimo} onChange={(e) => setMinimo(e.target.value)} className="cifras" />
          {primeraVez && <Campo etiqueta="Stock inicial (unidades que hay hoy)" id="cfg-ini" type="number" inputMode="decimal" min={0} step="any" value={inicial} onChange={(e) => setInicial(e.target.value)} className="cifras" />}
          {primeraVez && Number(inicial || 0) === 0 && <Aviso tono="info">Con stock 0 el producto no aparece en la carta hasta que cargues una entrada.</Aviso>}
        </>
      )}
      {!controla && producto.controla_stock && <Aviso tono="info">Deja de descontar stock y vuelve a mostrarse siempre en la carta (si está disponible).</Aviso>}
      {configurar.isError && <Aviso>{mensajeDeError(configurar.error)}</Aviso>}
      <Boton type="submit" icono={IconoConfirmar} cargando={configurar.isPending}>
        Guardar
      </Boton>
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

  if (productos.isPending) return <CargandoSeccion />
  if (productos.isError) return <Aviso titulo="No se pudo cargar el stock">{mensajeDeError(productos.error)}</Aviso>

  return (
    <div className="max-w-5xl">
      <EncabezadoPagina
        titulo="Stock"
        descripcion={controlados.length > 0 ? `${controlados.length} productos controlados · cada venta descuenta automáticamente` : 'Controlá las unidades de los productos que se agotan.'}
      >
        <Pestanas
          className="self-start"
          etiqueta="Vista de stock"
          valor={vista}
          onCambiar={setVista}
          opciones={[
            { valor: 'inventario', etiqueta: 'Inventario', contador: agotados + bajos || undefined },
            { valor: 'movimientos', etiqueta: 'Movimientos' },
          ]}
        />
      </EncabezadoPagina>

      {vista === 'inventario' ? (
        <div className="flex flex-col gap-6">
          {(agotados > 0 || bajos > 0) && (
            <Aviso tono="info" titulo="Hay productos para reponer">
              {agotados > 0 && `${agotados} agotado${agotados > 1 ? 's' : ''}`}
              {agotados > 0 && bajos > 0 && ' y '}
              {bajos > 0 && `${bajos} con stock bajo`}. Los agotados no aparecen en la carta de los clientes.
            </Aviso>
          )}

          {controlados.length === 0 ? (
            <EstadoVacio
              icono={Boxes}
              titulo="Todavía no controlás el stock de ningún producto"
              descripcion="Activalo en los productos que querés contar (bebidas, postres, cortes limitados…). El resto se vende sin límite."
            />
          ) : (
            <Tarjeta sinRelleno>
              <ul className="divide-y divide-borde">
                {ordenados.map((p) => {
                  const e = estadoStock(p)
                  return (
                    <li key={p.id} className="flex flex-wrap items-center gap-x-5 gap-y-2 px-5 py-3.5">
                      <div className="min-w-0 flex-1 basis-44">
                        <p className="font-semibold">{p.nombre}</p>
                        <p className="cifras text-xs text-tinta-3">
                          {nombreCategoria.get(p.categoria_id)} · mínimo {num(p.stock_minimo)}
                        </p>
                      </div>
                      <Insignia tono={ESTILO_ESTADO[e].tono} punto>
                        {ESTILO_ESTADO[e].texto}
                      </Insignia>
                      <p className={cn('cifras w-16 text-right text-2xl font-bold tracking-[-0.02em]', e === 'agotado' && 'text-peligro-600')}>{num(p.stock_actual)}</p>
                      <div className="flex gap-2">
                        <Boton tamano="sm" variante="secundario" onClick={() => setDialogo({ tipo: 'ajuste', producto: p })}>
                          Ajustar
                        </Boton>
                        <BotonIcono icono={IconoConfigurar} etiqueta={`Configurar control de ${p.nombre}`} onClick={() => setDialogo({ tipo: 'config', producto: p })} />
                      </div>
                    </li>
                  )
                })}
              </ul>
            </Tarjeta>
          )}

          {sinControl.length > 0 && (
            <Tarjeta sinRelleno titulo="Sin control de stock" descripcion={`${sinControl.length} productos se venden sin límite de unidades`}>
              <ul className="divide-y divide-borde">
                {sinControl.map((p) => (
                  <li key={p.id} className="flex items-center gap-3 px-5 py-2.5">
                    <p className="min-w-0 flex-1 truncate text-sm">
                      {p.nombre} <span className="text-xs text-tinta-3">· {nombreCategoria.get(p.categoria_id)}</span>
                    </p>
                    <Boton variante="fantasma" tamano="sm" onClick={() => setDialogo({ tipo: 'config', producto: p })}>
                      Controlar stock
                    </Boton>
                  </li>
                ))}
              </ul>
            </Tarjeta>
          )}
        </div>
      ) : movimientos.isPending ? (
        <CargandoSeccion />
      ) : movimientos.isError ? (
        <Aviso titulo="No se pudieron cargar los movimientos">{mensajeDeError(movimientos.error)}</Aviso>
      ) : movimientos.data.length === 0 ? (
        <EstadoVacio icono={ClipboardList} titulo="Todavía no hay movimientos" descripcion="Acá vas a ver cada venta, entrada, salida y conteo de stock." />
      ) : (
        <Tarjeta sinRelleno>
          <ul className="divide-y divide-borde">
            {movimientos.data.map((m) => (
              <li key={m.id} className="flex flex-wrap items-center gap-x-5 gap-y-1 px-5 py-3">
                <div className="min-w-0 flex-1 basis-44">
                  <p className="truncate text-sm font-semibold">{m.productos?.nombre ?? 'Producto eliminado'}</p>
                  <p className="text-xs text-tinta-3">
                    {ETIQUETA_MOVIMIENTO[m.tipo]}
                    {m.motivo ? ` · ${m.motivo}` : ''}
                  </p>
                </div>
                <span className={cn('cifras text-sm font-bold', m.cantidad < 0 ? 'text-tinta' : 'text-exito-600')}>
                  {m.cantidad > 0 ? '+' : ''}
                  {num(m.cantidad)}
                </span>
                <span className="cifras w-32 text-right text-xs text-tinta-3">{formatearFechaHora(m.created_at)}</span>
              </li>
            ))}
          </ul>
        </Tarjeta>
      )}

      <Modal abierto={dialogo?.tipo === 'ajuste'} onCerrar={() => setDialogo(null)} titulo="Ajustar stock" descripcion={dialogo?.producto.nombre} ancho="max-w-md">
        {dialogo?.tipo === 'ajuste' && <FormAjuste producto={dialogo.producto} onCerrar={() => setDialogo(null)} />}
      </Modal>
      <Modal abierto={dialogo?.tipo === 'config'} onCerrar={() => setDialogo(null)} titulo="Control de stock" descripcion={dialogo?.producto.nombre} ancho="max-w-md">
        {dialogo?.tipo === 'config' && <FormConfig producto={dialogo.producto} onCerrar={() => setDialogo(null)} />}
      </Modal>
    </div>
  )
}
