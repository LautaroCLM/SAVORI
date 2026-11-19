import { useId, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChartColumnBig, TrendingDown, TrendingUp } from 'lucide-react'
import { Aviso, CargandoSeccion, Campo, EncabezadoPagina, EstadoVacio, Insignia, Pestanas, Selector, Spinner, Tarjeta } from '@/components/ui'
import { formatearPrecio, formatearPrecioCompacto, formatearVariacion } from '@/lib/formato'
import { mensajeDeError } from '@/lib/errores'
import { cn } from '@/lib/utils'
import { cobrosPorMetodo, productosMasVendidos, resumenGanancias, type Agrupacion, type MetodoPago, type PuntoGanancia } from '@/services/ganancias'
import { agrupacionAuto, etiquetaPeriodo, etiquetaPeriodoLarga, etiquetaRango, periodosDelRango, rangoAnterior, rangoDePreset, type Preset } from './fechas'

const PRESETS: { valor: Preset; etiqueta: string }[] = [
  { valor: 'hoy', etiqueta: 'Hoy' },
  { valor: '7d', etiqueta: '7 días' },
  { valor: '30d', etiqueta: '30 días' },
  { valor: 'mes', etiqueta: 'Este mes' },
  { valor: 'mes-pasado', etiqueta: 'Mes pasado' },
  { valor: 'custom', etiqueta: 'Personalizado' },
]

const ETIQUETA_METODO: Record<MetodoPago, string> = {
  efectivo: 'Efectivo',
  debito: 'Débito',
  credito: 'Crédito',
  transferencia: 'Transferencia',
  mercadopago: 'Mercado Pago',
  otro: 'Otro',
}

interface Totales {
  ingresos: number
  costos: number
  ganancia: number
  pedidos: number
  unidades: number
}

const sumar = (puntos: PuntoGanancia[]): Totales =>
  puntos.reduce((t, p) => ({ ingresos: t.ingresos + p.ingresos, costos: t.costos + p.costos, ganancia: t.ganancia + p.ganancia, pedidos: t.pedidos + p.pedidos, unidades: t.unidades + p.unidades }), {
    ingresos: 0,
    costos: 0,
    ganancia: 0,
    pedidos: 0,
    unidades: 0,
  })

/** Variación contra el período anterior; `null` si antes no hubo nada con qué comparar. */
const variacion = (actual: number, anterior: number | undefined) => (anterior === undefined || anterior === 0 ? null : (actual - anterior) / anterior)

function Variacion({ valor, sentidoBueno = 'sube', oscuro }: { valor: number | null; sentidoBueno?: 'sube' | 'neutro'; oscuro?: boolean }) {
  if (valor === null) return <span className={cn('text-xs', oscuro ? 'text-carbon-tinta-2' : 'text-tinta-3')}>Sin datos previos</span>
  const sube = valor >= 0
  const Icono = sube ? TrendingUp : TrendingDown
  const tono = sentidoBueno === 'neutro' ? 'neutro' : sube ? 'exito' : 'peligro'
  if (oscuro)
    return (
      <span className={cn('cifras inline-flex items-center gap-1 rounded-full bg-superficie/10 px-2 py-1 text-xs leading-none font-bold', tono === 'exito' ? 'text-exito-300' : tono === 'peligro' ? 'text-peligro-300' : 'text-carbon-tinta-2')}>
        <Icono aria-hidden size={13} />
        {formatearVariacion(valor)}
      </span>
    )
  return (
    <Insignia tono={tono} className="cifras gap-1">
      <Icono aria-hidden size={13} />
      {formatearVariacion(valor)}
    </Insignia>
  )
}

function Metrica({ etiqueta, valor, nota, cambio, sentidoBueno }: { etiqueta: string; valor: string; nota?: string; cambio: number | null; sentidoBueno?: 'sube' | 'neutro' }) {
  return (
    <div className="flex flex-col gap-5 rounded-tarjeta border border-borde bg-superficie p-5">
      <div className="flex min-h-6 items-start justify-between gap-3">
        <p className="text-sm font-semibold text-tinta-2">{etiqueta}</p>
        <Variacion valor={cambio} sentidoBueno={sentidoBueno} />
      </div>
      <div>
        <p className="cifras text-[1.75rem] leading-none font-bold tracking-[-0.02em] text-tinta">{valor}</p>
        {/* la nota siempre ocupa su línea: las cifras de todas las tarjetas quedan alineadas */}
        <p className="mt-2 min-h-4 text-xs leading-4 text-tinta-3">{nota}</p>
      </div>
    </div>
  )
}

/** Barras por período: ingresos (naranja claro) con la ganancia (naranja) dentro. Tooltip con mouse, toque y teclado. */
function Grafico({ puntos, agrupar }: { puntos: PuntoGanancia[]; agrupar: Agrupacion }) {
  const [activo, setActivo] = useState<number | null>(null)
  const idTip = useId()
  const maximoBruto = Math.max(1, ...puntos.map((p) => p.ingresos))
  // Escala "redonda" para que las líneas guía caigan en valores legibles
  const paso10 = 10 ** Math.floor(Math.log10(maximoBruto))
  const maximo = Math.ceil(maximoBruto / paso10) * paso10
  const guias = [1, 0.75, 0.5, 0.25]
  const cadaEtiqueta = Math.ceil(puntos.length / 12)
  const p = activo !== null ? puntos[activo] : null

  return (
    <div className="relative">
      <div className="flex gap-3">
        {/* Eje Y */}
        <div className="cifras relative h-60 w-14 shrink-0 text-right text-xs text-tinta-3" aria-hidden>
          {guias.map((g) => (
            <span key={g} className="absolute right-0 -translate-y-1/2" style={{ top: `${(1 - g) * 100}%` }}>
              {formatearPrecioCompacto(maximo * g)}
            </span>
          ))}
        </div>
        <div className="relative min-w-0 flex-1">
          {/* Líneas guía */}
          <div className="pointer-events-none absolute inset-0" aria-hidden>
            {guias.map((g) => (
              <div key={g} className="absolute inset-x-0 border-t border-dashed border-borde" style={{ top: `${(1 - g) * 100}%` }} />
            ))}
          </div>
          <div className="relative flex h-60 items-end gap-[3px] border-b border-borde-fuerte sm:gap-1.5" onMouseLeave={() => setActivo(null)}>
            {puntos.map((pt, i) => {
              const alto = (pt.ingresos / maximo) * 100
              const ganancia = pt.ingresos > 0 ? Math.max(0, pt.ganancia / pt.ingresos) * 100 : 0
              return (
                <button
                  key={pt.periodo}
                  type="button"
                  className="group relative flex h-full min-w-0 flex-1 items-end justify-center rounded-t-[6px] outline-offset-0 focus-visible:outline-2"
                  onMouseEnter={() => setActivo(i)}
                  onFocus={() => setActivo(i)}
                  onBlur={() => setActivo(null)}
                  onClick={() => setActivo(i)}
                  aria-describedby={activo === i ? idTip : undefined}
                  aria-label={`${etiquetaPeriodoLarga(pt.periodo, agrupar)}: ganancia ${formatearPrecio(pt.ganancia)}, ingresos ${formatearPrecio(pt.ingresos)}, ${pt.pedidos} pedidos`}
                >
                  <span
                    className={cn('relative w-full max-w-11 overflow-hidden rounded-t-[6px] bg-marca-200 transition-[filter] duration-150', activo !== null && activo !== i && 'opacity-55')}
                    style={{ height: `${alto}%`, minHeight: pt.ingresos > 0 ? 4 : 0 }}
                  >
                    <span className="absolute inset-x-0 bottom-0 bg-marca-500" style={{ height: `${ganancia}%` }} />
                  </span>
                </button>
              )
            })}
          </div>
          <div className="mt-2 flex gap-[3px] sm:gap-1.5" aria-hidden>
            {puntos.map((pt, i) => (
              <div key={pt.periodo} className={cn('cifras min-w-0 flex-1 text-center text-xs', activo === i ? 'font-bold text-tinta' : 'text-tinta-3')}>
                {i % cadaEtiqueta === 0 || activo === i ? etiquetaPeriodo(pt.periodo, agrupar) : ''}
              </div>
            ))}
          </div>

          {/* Tooltip */}
          {p && activo !== null && (
            <div
              id={idTip}
              role="tooltip"
              className="pointer-events-none absolute z-10 w-max max-w-56 -translate-x-1/2 -translate-y-[calc(100%+10px)] rounded-control bg-carbon px-3 py-2 text-xs text-white shadow-flotante"
              style={{
                left: `clamp(5rem, ${((activo + 0.5) / puntos.length) * 100}%, calc(100% - 5rem))`,
                // sobre la barra activa (el área de barras mide h-60 = 15rem)
                top: `calc(15rem * ${1 - p.ingresos / maximo})`,
              }}
            >
              <p className="font-semibold first-letter:uppercase">{etiquetaPeriodoLarga(p.periodo, agrupar)}</p>
              <p className="cifras mt-1 flex items-center gap-2">
                <span className="size-2 rounded-sm bg-marca-500" /> Ganancia <b className="ml-auto">{formatearPrecio(p.ganancia)}</b>
              </p>
              <p className="cifras flex items-center gap-2">
                <span className="size-2 rounded-sm bg-marca-200" /> Ingresos <b className="ml-auto">{formatearPrecio(p.ingresos)}</b>
              </p>
              <p className="cifras mt-1 text-carbon-tinta-2">{p.pedidos} pedidos</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export function GananciasPage() {
  const [preset, setPreset] = useState<Preset>('30d')
  const inicial = rangoDePreset('30d')
  const [desde, setDesde] = useState(inicial.desde)
  const [hasta, setHasta] = useState(inicial.hasta)
  const [agrupManual, setAgrupManual] = useState<Agrupacion | 'auto'>('auto')

  const rangoValido = desde !== '' && hasta !== '' && desde <= hasta
  const agrupar = agrupManual === 'auto' && rangoValido ? agrupacionAuto(desde, hasta) : agrupManual === 'auto' ? 'dia' : agrupManual
  const previo = rangoValido ? rangoAnterior(desde, hasta) : null

  function elegir(p: Preset) {
    setPreset(p)
    if (p !== 'custom') {
      const r = rangoDePreset(p)
      setDesde(r.desde)
      setHasta(r.hasta)
    }
  }

  const resumen = useQuery({ queryKey: ['ganancias', 'resumen', desde, hasta, agrupar], queryFn: () => resumenGanancias(desde, hasta, agrupar), enabled: rangoValido })
  const anterior = useQuery({
    queryKey: ['ganancias', 'resumen', previo?.desde, previo?.hasta, 'mes'],
    queryFn: () => resumenGanancias(previo!.desde, previo!.hasta, 'mes'),
    enabled: !!previo,
  })
  const vendidos = useQuery({ queryKey: ['ganancias', 'vendidos', desde, hasta], queryFn: () => productosMasVendidos(desde, hasta, 8), enabled: rangoValido })
  const cobros = useQuery({ queryKey: ['ganancias', 'cobros', desde, hasta], queryFn: () => cobrosPorMetodo(desde, hasta), enabled: rangoValido })

  const puntos = useMemo<PuntoGanancia[]>(() => {
    if (!resumen.data || !rangoValido) return []
    const porPeriodo = new Map(resumen.data.map((r) => [r.periodo, r]))
    return periodosDelRango(desde, hasta, agrupar).map((p) => porPeriodo.get(p) ?? { periodo: p, pedidos: 0, unidades: 0, ingresos: 0, costos: 0, ganancia: 0 })
  }, [resumen.data, desde, hasta, agrupar, rangoValido])

  const total = sumar(puntos)
  const prev = anterior.data ? sumar(anterior.data) : undefined
  const margen = total.ingresos > 0 ? total.ganancia / total.ingresos : 0
  const ticket = total.pedidos > 0 ? total.ingresos / total.pedidos : 0
  const ticketPrev = prev && prev.pedidos > 0 ? prev.ingresos / prev.pedidos : undefined
  const topUnidades = Math.max(1, ...(vendidos.data ?? []).map((v) => v.unidades))
  const totalCobros = (cobros.data ?? []).reduce((s, c) => s + c.total, 0)
  const comparacion = previo ? `vs. ${etiquetaRango(previo.desde, previo.hasta)}` : ''

  return (
    <div className="max-w-6xl">
      <EncabezadoPagina
        titulo="Ganancias"
        descripcion={
          <>
            Se cuentan los pedidos <b className="font-semibold text-tinta">entregados</b>: (precio − costo) × cantidad, con los valores del momento de la venta.
          </>
        }
        acciones={
          <label className="flex items-center gap-2 text-sm font-semibold text-tinta-2">
            Agrupar por
            <Selector value={agrupManual} onChange={(e) => setAgrupManual(e.target.value as Agrupacion | 'auto')} className="h-10 text-sm" envoltura="w-36">
              <option value="auto">Automático</option>
              <option value="dia">Día</option>
              <option value="semana">Semana</option>
              <option value="mes">Mes</option>
            </Selector>
          </label>
        }
      >
        <div className="flex flex-wrap items-end gap-3">
          <Pestanas etiqueta="Período" opciones={PRESETS} valor={preset} onCambiar={elegir} />
          {preset === 'custom' && (
            <div className="flex flex-wrap items-end gap-3">
              <Campo etiqueta="Desde" id="g-desde" type="date" value={desde} max={hasta || undefined} onChange={(e) => setDesde(e.target.value)} className="h-10 text-sm" />
              <Campo etiqueta="Hasta" id="g-hasta" type="date" value={hasta} min={desde || undefined} onChange={(e) => setHasta(e.target.value)} className="h-10 text-sm" />
            </div>
          )}
        </div>
        {preset === 'custom' && !rangoValido && <Aviso>Elegí una fecha de inicio anterior a la de fin.</Aviso>}
      </EncabezadoPagina>

      {resumen.isPending && rangoValido ? (
        <CargandoSeccion />
      ) : resumen.isError ? (
        <Aviso titulo="No se pudieron cargar las ganancias">{mensajeDeError(resumen.error)}</Aviso>
      ) : rangoValido ? (
        <div className="flex flex-col gap-4 motion-safe:animate-entrar">
          {/* Métricas */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="flex flex-col justify-between gap-6 rounded-tarjeta bg-carbon p-5 text-white sm:col-span-2 lg:col-span-1 lg:row-span-2">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-semibold text-carbon-tinta-2">Ganancia</p>
                <Variacion valor={variacion(total.ganancia, prev?.ganancia)} oscuro />
              </div>
              <div>
                <p className="cifras text-[2.75rem] leading-none font-bold tracking-[-0.03em]">{formatearPrecio(total.ganancia)}</p>
                <p className="mt-2 text-xs text-carbon-tinta-2">{comparacion}</p>
              </div>
              <div className="border-t border-white/10 pt-4">
                <div className="flex items-baseline justify-between text-sm">
                  <span className="text-carbon-tinta-2">Margen sobre ventas</span>
                  <span className="cifras text-lg font-bold text-marca-300">{(margen * 100).toLocaleString('es-AR', { maximumFractionDigits: 1 })} %</span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-superficie/10" aria-hidden>
                  <div className="h-full rounded-full bg-marca-500" style={{ width: `${Math.min(100, margen * 100)}%` }} />
                </div>
              </div>
            </div>
            <Metrica etiqueta="Ingresos" valor={formatearPrecio(total.ingresos)} cambio={variacion(total.ingresos, prev?.ingresos)} nota={comparacion} />
            <Metrica
              etiqueta="Costos de mercadería"
              valor={formatearPrecio(total.costos)}
              cambio={variacion(total.costos, prev?.costos)}
              sentidoBueno="neutro"
              nota={total.ingresos > 0 ? `${((total.costos / total.ingresos) * 100).toLocaleString('es-AR', { maximumFractionDigits: 1 })} % de los ingresos` : undefined}
            />
            <Metrica etiqueta="Pedidos entregados" valor={total.pedidos.toLocaleString('es-AR')} cambio={variacion(total.pedidos, prev?.pedidos)} />
            <Metrica etiqueta="Ticket promedio" valor={formatearPrecio(ticket)} cambio={variacion(ticket, ticketPrev)} nota="por pedido" />
          </div>

          {total.pedidos === 0 ? (
            <EstadoVacio icono={ChartColumnBig} titulo="Sin ventas entregadas en este período" descripcion="Cuando se entreguen pedidos, acá vas a ver la evolución, los productos más vendidos y los cobros." />
          ) : (
            <>
              <Tarjeta
                titulo={`Evolución por ${agrupar === 'dia' ? 'día' : agrupar === 'semana' ? 'semana' : 'mes'}`}
                descripcion={`${total.unidades.toLocaleString('es-AR')} unidades vendidas · ${etiquetaRango(desde, hasta)}`}
                acciones={
                  <div className="flex gap-4 text-xs font-semibold text-tinta-2">
                    <span className="flex items-center gap-1.5">
                      <i className="size-2.5 rounded-sm bg-marca-200" />
                      Ingresos
                    </span>
                    <span className="flex items-center gap-1.5">
                      <i className="size-2.5 rounded-sm bg-marca-500" />
                      Ganancia
                    </span>
                  </div>
                }
              >
                <div className="pt-6">
                  <Grafico puntos={puntos} agrupar={agrupar} />
                </div>
              </Tarjeta>

              <div className="grid gap-4 lg:grid-cols-2">
                <Tarjeta titulo="Más vendidos" descripcion="Por unidades en el período">
                  {vendidos.isPending ? (
                    <Spinner />
                  ) : vendidos.isError ? (
                    <Aviso>{mensajeDeError(vendidos.error)}</Aviso>
                  ) : (
                    <ol className="flex flex-col gap-4">
                      {vendidos.data.map((v, i) => (
                        <li key={v.nombre}>
                          <div className="flex items-baseline justify-between gap-3 text-sm">
                            <span className="min-w-0 truncate font-semibold">
                              <span className="cifras mr-2 inline-block w-4 text-tinta-3">{i + 1}</span>
                              {v.nombre}
                            </span>
                            <span className="cifras shrink-0 font-bold">{v.unidades} u.</span>
                          </div>
                          <div className="mt-1.5 ml-6 h-1.5 rounded-full bg-superficie-2" aria-hidden>
                            <div className="h-full rounded-full bg-marca-500" style={{ width: `${(v.unidades / topUnidades) * 100}%` }} />
                          </div>
                          <p className="cifras mt-1 ml-6 text-xs text-tinta-3">
                            {formatearPrecio(v.ingresos)} vendidos · ganancia {formatearPrecio(v.ganancia)}
                          </p>
                        </li>
                      ))}
                    </ol>
                  )}
                </Tarjeta>

                <Tarjeta titulo="Cobros por medio de pago" descripcion={cobros.data?.length ? `${cobros.data.reduce((s, c) => s + c.cuentas, 0)} cuentas cerradas` : 'Cuentas cerradas en el período'}>
                  {cobros.isPending ? (
                    <Spinner />
                  ) : cobros.isError ? (
                    <Aviso>{mensajeDeError(cobros.error)}</Aviso>
                  ) : cobros.data.length === 0 ? (
                    <p className="py-6 text-center text-sm text-tinta-2">No se cerraron cuentas en este período.</p>
                  ) : (
                    <ul className="flex flex-col gap-4">
                      {cobros.data.map((c) => (
                        <li key={c.metodo ?? 'sin'}>
                          <div className="flex items-baseline justify-between gap-3 text-sm">
                            <span className="font-semibold">
                              {c.metodo ? ETIQUETA_METODO[c.metodo] : 'Sin especificar'}
                              <span className="cifras ml-2 text-xs font-normal text-tinta-3">
                                {c.cuentas} {c.cuentas === 1 ? 'cuenta' : 'cuentas'}
                              </span>
                            </span>
                            <span className="cifras font-bold">{formatearPrecio(c.total)}</span>
                          </div>
                          <div className="mt-1.5 h-1.5 rounded-full bg-superficie-2" aria-hidden>
                            <div className="h-full rounded-full bg-carbon" style={{ width: `${totalCobros > 0 ? (c.total / totalCobros) * 100 : 0}%` }} />
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </Tarjeta>
              </div>
            </>
          )}
        </div>
      ) : null}
    </div>
  )
}
