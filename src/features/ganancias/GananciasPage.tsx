import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Spinner } from '@/components/ui'
import { formatearPrecio } from '@/lib/formato'
import { mensajeDeError } from '@/lib/errores'
import { cobrosPorMetodo, productosMasVendidos, resumenGanancias, type Agrupacion, type MetodoPago, type PuntoGanancia } from '@/services/ganancias'
import { agrupacionAuto, etiquetaPeriodo, periodosDelRango, rangoDePreset, type Preset } from './fechas'

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

function Kpi({ etiqueta, valor, destacado, nota }: { etiqueta: string; valor: string; destacado?: boolean; nota?: string }) {
  return (
    <div className={`rounded-xl p-4 ring-1 ${destacado ? 'bg-stone-900 text-white ring-stone-900' : 'bg-white ring-stone-200'}`}>
      <p className={`text-xs font-semibold tracking-wide uppercase ${destacado ? 'text-stone-400' : 'text-stone-500'}`}>{etiqueta}</p>
      <p className="mt-1 text-2xl font-extrabold tabular-nums">{valor}</p>
      {nota && <p className={`mt-0.5 text-xs ${destacado ? 'text-stone-400' : 'text-stone-500'}`}>{nota}</p>}
    </div>
  )
}

/** Barras por período: ingresos (claro) con la ganancia (naranja) superpuesta. */
function Grafico({ puntos, agrupar }: { puntos: PuntoGanancia[]; agrupar: Agrupacion }) {
  const maximo = Math.max(1, ...puntos.map((p) => p.ingresos))
  const paso = Math.ceil(puntos.length / 12) // etiquetas: como mucho ~12
  return (
    <div>
      <div className="flex h-56 items-end gap-1 border-b border-stone-200" role="img" aria-label="Gráfico de ingresos y ganancia por período">
        {puntos.map((p) => (
          <div key={p.periodo} className="group relative flex h-full min-w-0 flex-1 items-end justify-center" title={`${etiquetaPeriodo(p.periodo, agrupar)}: ingresos ${formatearPrecio(p.ingresos)} · ganancia ${formatearPrecio(p.ganancia)}`}>
            <div className="relative w-full max-w-10 rounded-t bg-marca-100" style={{ height: `${(p.ingresos / maximo) * 100}%`, minHeight: p.ingresos > 0 ? 3 : 0 }}>
              <div className="absolute inset-x-0 bottom-0 rounded-t bg-marca-500" style={{ height: p.ingresos > 0 ? `${Math.max(0, p.ganancia / p.ingresos) * 100}%` : 0 }} />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-1 flex gap-1">
        {puntos.map((p, i) => (
          <div key={p.periodo} className="min-w-0 flex-1 text-center text-[10px] text-stone-500">{i % paso === 0 ? etiquetaPeriodo(p.periodo, agrupar) : ''}</div>
        ))}
      </div>
      <p className="mt-3 flex gap-4 text-xs text-stone-500">
        <span><i className="mr-1 inline-block size-2.5 rounded-sm bg-marca-100 align-middle" />Ingresos</span>
        <span><i className="mr-1 inline-block size-2.5 rounded-sm bg-marca-500 align-middle" />Ganancia</span>
      </p>
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
  const agrupar = agrupManual === 'auto' ? agrupacionAuto(desde, hasta) : agrupManual

  function elegir(p: Preset) {
    setPreset(p)
    if (p !== 'custom') {
      const r = rangoDePreset(p)
      setDesde(r.desde)
      setHasta(r.hasta)
    }
  }

  const resumen = useQuery({ queryKey: ['ganancias', 'resumen', desde, hasta, agrupar], queryFn: () => resumenGanancias(desde, hasta, agrupar), enabled: rangoValido })
  const vendidos = useQuery({ queryKey: ['ganancias', 'vendidos', desde, hasta], queryFn: () => productosMasVendidos(desde, hasta, 10), enabled: rangoValido })
  const cobros = useQuery({ queryKey: ['ganancias', 'cobros', desde, hasta], queryFn: () => cobrosPorMetodo(desde, hasta), enabled: rangoValido })

  const puntos = useMemo<PuntoGanancia[]>(() => {
    if (!resumen.data || !rangoValido) return []
    const porPeriodo = new Map(resumen.data.map((r) => [r.periodo, r]))
    return periodosDelRango(desde, hasta, agrupar).map((p) => porPeriodo.get(p) ?? { periodo: p, pedidos: 0, unidades: 0, ingresos: 0, costos: 0, ganancia: 0 })
  }, [resumen.data, desde, hasta, agrupar, rangoValido])

  const total = puntos.reduce(
    (t, p) => ({ ingresos: t.ingresos + p.ingresos, costos: t.costos + p.costos, ganancia: t.ganancia + p.ganancia, pedidos: t.pedidos + p.pedidos, unidades: t.unidades + p.unidades }),
    { ingresos: 0, costos: 0, ganancia: 0, pedidos: 0, unidades: 0 },
  )
  const margen = total.ingresos > 0 ? (total.ganancia / total.ingresos) * 100 : 0
  const topUnidades = Math.max(1, ...(vendidos.data ?? []).map((v) => v.unidades))
  const totalCobros = (cobros.data ?? []).reduce((s, c) => s + c.total, 0)

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl font-bold text-stone-900">Ganancias</h1>
      <p className="mt-1 text-sm text-stone-500">Se cuentan los pedidos <b>entregados</b>: ganancia = (precio − costo) × cantidad, con los valores vigentes al momento de la venta.</p>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        {PRESETS.map((p) => (
          <button key={p.valor} onClick={() => elegir(p.valor)} aria-pressed={preset === p.valor} className={`rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors ${preset === p.valor ? 'border-marca-600 bg-marca-50 text-marca-700' : 'border-stone-300 bg-white text-stone-600 hover:bg-stone-50'}`}>
            {p.etiqueta}
          </button>
        ))}
        <label className="ml-auto flex items-center gap-2 text-xs text-stone-500">
          Agrupar por
          <select value={agrupManual} onChange={(e) => setAgrupManual(e.target.value as Agrupacion | 'auto')} className="h-9 rounded-lg border border-stone-300 bg-white px-2 text-sm text-stone-700">
            <option value="auto">Automático</option>
            <option value="dia">Día</option>
            <option value="semana">Semana</option>
            <option value="mes">Mes</option>
          </select>
        </label>
      </div>

      {preset === 'custom' && (
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-xs font-medium text-stone-600">Desde<input type="date" value={desde} max={hasta || undefined} onChange={(e) => setDesde(e.target.value)} className="h-10 rounded-lg border border-stone-300 bg-white px-2 text-sm" /></label>
          <label className="flex flex-col gap-1 text-xs font-medium text-stone-600">Hasta<input type="date" value={hasta} min={desde || undefined} onChange={(e) => setHasta(e.target.value)} className="h-10 rounded-lg border border-stone-300 bg-white px-2 text-sm" /></label>
          {!rangoValido && <p className="text-sm text-red-700">Elegí un rango válido.</p>}
        </div>
      )}

      {resumen.isPending && rangoValido ? (
        <div className="flex justify-center py-20"><Spinner className="size-8" /></div>
      ) : resumen.isError ? (
        <p className="mt-6 rounded-lg bg-red-50 p-4 text-red-700">{mensajeDeError(resumen.error)}</p>
      ) : rangoValido ? (
        <>
          <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-3">
            <Kpi etiqueta="Ganancia" valor={formatearPrecio(total.ganancia)} destacado nota={`Margen ${margen.toLocaleString('es-AR', { maximumFractionDigits: 1 })} %`} />
            <Kpi etiqueta="Ingresos" valor={formatearPrecio(total.ingresos)} />
            <Kpi etiqueta="Costos" valor={formatearPrecio(total.costos)} />
            <Kpi etiqueta="Pedidos entregados" valor={String(total.pedidos)} />
            <Kpi etiqueta="Ticket promedio" valor={formatearPrecio(total.pedidos > 0 ? total.ingresos / total.pedidos : 0)} nota="por pedido" />
            <Kpi etiqueta="Unidades vendidas" valor={String(total.unidades)} />
          </div>

          {total.pedidos === 0 ? (
            <p className="mt-6 rounded-xl border border-dashed border-stone-300 bg-white p-10 text-center text-stone-500">No hay pedidos entregados en este período.</p>
          ) : (
            <>
              <section className="mt-6 rounded-xl bg-white p-5 shadow-sm ring-1 ring-stone-200">
                <h2 className="mb-4 text-sm font-bold tracking-wide text-stone-500 uppercase">Evolución · por {agrupar === 'dia' ? 'día' : agrupar === 'semana' ? 'semana' : 'mes'}</h2>
                <Grafico puntos={puntos} agrupar={agrupar} />
              </section>

              <div className="mt-6 grid gap-6 lg:grid-cols-2">
                <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-stone-200">
                  <h2 className="mb-3 text-sm font-bold tracking-wide text-stone-500 uppercase">Más vendidos</h2>
                  {vendidos.isPending ? <Spinner /> : vendidos.isError ? <p className="text-sm text-red-700">{mensajeDeError(vendidos.error)}</p> : (
                    <ol className="flex flex-col gap-3">
                      {vendidos.data.map((v, i) => (
                        <li key={v.nombre}>
                          <div className="flex items-baseline justify-between gap-3 text-sm">
                            <span className="min-w-0 truncate font-medium"><span className="mr-2 text-stone-400 tabular-nums">{i + 1}.</span>{v.nombre}</span>
                            <span className="shrink-0 font-bold tabular-nums">{v.unidades} u.</span>
                          </div>
                          <div className="mt-1 h-1.5 rounded-full bg-stone-100"><div className="h-full rounded-full bg-marca-500" style={{ width: `${(v.unidades / topUnidades) * 100}%` }} /></div>
                          <p className="mt-0.5 text-xs text-stone-500 tabular-nums">{formatearPrecio(v.ingresos)} vendidos · ganancia {formatearPrecio(v.ganancia)}</p>
                        </li>
                      ))}
                    </ol>
                  )}
                </section>

                <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-stone-200">
                  <h2 className="mb-3 text-sm font-bold tracking-wide text-stone-500 uppercase">Cobros por medio de pago</h2>
                  {cobros.isPending ? <Spinner /> : cobros.isError ? <p className="text-sm text-red-700">{mensajeDeError(cobros.error)}</p> : cobros.data.length === 0 ? (
                    <p className="text-sm text-stone-500">No hay cuentas cerradas en el período.</p>
                  ) : (
                    <ul className="flex flex-col gap-3">
                      {cobros.data.map((c) => (
                        <li key={c.metodo ?? 'sin'}>
                          <div className="flex items-baseline justify-between gap-3 text-sm">
                            <span className="font-medium">{c.metodo ? ETIQUETA_METODO[c.metodo] : 'Sin especificar'} <span className="text-xs font-normal text-stone-500">· {c.cuentas} cuenta{c.cuentas > 1 ? 's' : ''}</span></span>
                            <span className="font-bold tabular-nums">{formatearPrecio(c.total)}</span>
                          </div>
                          <div className="mt-1 h-1.5 rounded-full bg-stone-100"><div className="h-full rounded-full bg-stone-700" style={{ width: `${totalCobros > 0 ? (c.total / totalCobros) * 100 : 0}%` }} /></div>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              </div>
            </>
          )}
        </>
      ) : null}
    </div>
  )
}
