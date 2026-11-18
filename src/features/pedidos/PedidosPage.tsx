import { useState } from 'react'
import { Boton, Spinner } from '@/components/ui'
import { SonidoToggle } from '@/components/SonidoToggle'
import { useAhora } from '@/hooks/useAhora'
import { mensajeDeError } from '@/lib/errores'
import { useMesas } from '@/features/mesas/useMesasAdmin'
import type { PedidoConItems } from '@/services/pedidos'
import { NuevoPedidoModal } from './NuevoPedidoModal'
import { PedidoCard } from './PedidoCard'
import { useMutacionesPedidos, usePedidosActivos, usePedidosEntregadosHoy } from './usePedidos'

type Vista = 'activos' | 'entregados'

export function PedidosPage() {
  const [vista, setVista] = useState<Vista>('activos')
  const [nuevo, setNuevo] = useState(false)
  const ahora = useAhora()
  const activos = usePedidosActivos()
  const entregados = usePedidosEntregadosHoy(vista === 'entregados')
  const mesas = useMesas()
  const { cambiarEstado } = useMutacionesPedidos()

  const consulta = vista === 'activos' ? activos : entregados
  const lista = consulta.data ?? []
  const porEstado = (e: PedidoConItems['estado']) => lista.filter((p) => p.estado === e)

  function acciones(p: PedidoConItems) {
    const cambiar = (estado: PedidoConItems['estado']) => cambiarEstado.mutate({ id: p.id, estado })
    return (
      <>
        {p.estado === 'pendiente' && <Boton variante="secundario" className="h-9" onClick={() => cambiar('en_preparacion')}>A cocina</Boton>}
        {p.estado === 'listo' && <Boton className="h-9" onClick={() => cambiar('entregado')}>Marcar entregado</Boton>}
        {(p.estado === 'pendiente' || p.estado === 'en_preparacion' || p.estado === 'listo') && (
          <Boton
            variante="secundario"
            className="h-9"
            onClick={() => {
              if (window.confirm(`¿Cancelar el pedido de la mesa ${p.mesas?.numero ?? ''}?`)) cambiar('cancelado')
            }}
          >
            Cancelar
          </Boton>
        )}
      </>
    )
  }

  const secciones: { titulo: string; estado: PedidoConItems['estado']; resaltar?: boolean }[] =
    vista === 'activos'
      ? [
          { titulo: 'Listos para entregar', estado: 'listo', resaltar: true },
          { titulo: 'En preparación', estado: 'en_preparacion' },
          { titulo: 'Pendientes', estado: 'pendiente' },
        ]
      : [{ titulo: 'Entregados hoy', estado: 'entregado' }]

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-stone-900">Pedidos</h1>
        <div className="flex flex-wrap gap-2">
          <SonidoToggle />
          <Boton onClick={() => setNuevo(true)} disabled={!mesas.data?.length}>+ Nuevo pedido</Boton>
        </div>
      </div>

      <div role="tablist" className="mt-5 inline-flex rounded-xl bg-stone-200/60 p-1">
        {(['activos', 'entregados'] as const).map((v) => (
          <button
            key={v}
            role="tab"
            aria-selected={vista === v}
            onClick={() => setVista(v)}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${vista === v ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-800'}`}
          >
            {v === 'activos' ? `Activos${activos.data ? ` (${activos.data.length})` : ''}` : 'Entregados hoy'}
          </button>
        ))}
      </div>

      {cambiarEstado.isError && <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{mensajeDeError(cambiarEstado.error)}</p>}

      {consulta.isPending ? (
        <div className="flex justify-center py-20"><Spinner className="size-8" /></div>
      ) : consulta.isError ? (
        <p className="mt-6 rounded-lg bg-red-50 p-4 text-red-700">{mensajeDeError(consulta.error)}</p>
      ) : lista.length === 0 ? (
        <p className="mt-6 rounded-xl border border-dashed border-stone-300 bg-white p-10 text-center text-stone-500">
          {vista === 'activos' ? 'No hay pedidos activos. Cuando un cliente pida por QR o cargues uno, aparece acá al instante.' : 'Todavía no se entregó ningún pedido hoy.'}
        </p>
      ) : (
        <div className="mt-6 flex flex-col gap-8">
          {secciones.map(({ titulo, estado, resaltar }) => {
            const items = porEstado(estado)
            if (items.length === 0) return null
            return (
              <section key={estado}>
                <h2 className={`mb-3 text-sm font-bold tracking-wide uppercase ${resaltar ? 'text-emerald-700' : 'text-stone-500'}`}>
                  {titulo} · {items.length}
                </h2>
                <ul className="grid grid-cols-[repeat(auto-fill,minmax(17rem,1fr))] gap-4">
                  {items.map((p) => (
                    <li key={p.id} className="flex">
                      <div className="w-full">
                        <PedidoCard pedido={p} ahora={ahora} acciones={vista === 'activos' ? acciones(p) : undefined} />
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            )
          })}
        </div>
      )}

      <NuevoPedidoModal abierto={nuevo} onCerrar={() => setNuevo(false)} mesas={mesas.data ?? []} />
    </div>
  )
}
