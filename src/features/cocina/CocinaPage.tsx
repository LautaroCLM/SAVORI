import { Boton, Spinner } from '@/components/ui'
import { SonidoToggle } from '@/components/SonidoToggle'
import { useAhora } from '@/hooks/useAhora'
import { mensajeDeError } from '@/lib/errores'
import { PedidoCard } from '@/features/pedidos/PedidoCard'
import { useMutacionesPedidos, usePedidosActivos } from '@/features/pedidos/usePedidos'
import type { EstadoPedido } from '@/services/pedidos'

const COLUMNAS: { estado: EstadoPedido; titulo: string; vacio: string; color: string }[] = [
  { estado: 'pendiente', titulo: 'Pendientes', vacio: 'Sin pedidos nuevos', color: 'bg-amber-500' },
  { estado: 'en_preparacion', titulo: 'En preparación', vacio: 'Nada en preparación', color: 'bg-sky-500' },
  { estado: 'listo', titulo: 'Listos', vacio: 'Nada listo todavía', color: 'bg-emerald-500' },
]

/** Pantalla de cocina: tres columnas que se actualizan solas. Pensada para una tablet o TV. */
export function CocinaPage() {
  const ahora = useAhora(15_000)
  const pedidos = usePedidosActivos()
  const { cambiarEstado } = useMutacionesPedidos()

  if (pedidos.isPending) return <div className="flex justify-center py-20"><Spinner className="size-8" /></div>
  if (pedidos.isError) return <p className="rounded-lg bg-red-50 p-4 text-red-700">{mensajeDeError(pedidos.error)}</p>

  const cambiar = (id: string, estado: EstadoPedido) => cambiarEstado.mutate({ id, estado })

  return (
    <div className="mx-auto max-w-[110rem]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-stone-900">Cocina</h1>
        <SonidoToggle />
      </div>
      {cambiarEstado.isError && <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{mensajeDeError(cambiarEstado.error)}</p>}

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        {COLUMNAS.map(({ estado, titulo, vacio, color }) => {
          const items = pedidos.data.filter((p) => p.estado === estado)
          return (
            <section key={estado} aria-label={titulo} className="flex flex-col gap-3 rounded-2xl bg-stone-100 p-3">
              <h2 className="flex items-center gap-2 px-1 text-sm font-bold tracking-wide text-stone-700 uppercase">
                <span className={`size-2.5 rounded-full ${color}`} aria-hidden />
                {titulo}
                <span className="ml-auto rounded-full bg-white px-2 py-0.5 text-xs tabular-nums">{items.length}</span>
              </h2>
              {items.length === 0 && <p className="rounded-xl border border-dashed border-stone-300 p-6 text-center text-sm text-stone-400">{vacio}</p>}
              {items.map((p) => (
                <PedidoCard
                  key={p.id}
                  pedido={p}
                  ahora={ahora}
                  grande
                  mostrarTotal={false}
                  acciones={
                    estado === 'pendiente' ? (
                      <Boton className="h-12 px-6 text-base" onClick={() => cambiar(p.id, 'en_preparacion')}>Empezar</Boton>
                    ) : estado === 'en_preparacion' ? (
                      <Boton className="h-12 px-6 text-base" onClick={() => cambiar(p.id, 'listo')}>Marcar listo</Boton>
                    ) : (
                      <span className="text-sm font-medium text-emerald-700">Esperando al mozo</span>
                    )
                  }
                />
              ))}
            </section>
          )
        })}
      </div>
    </div>
  )
}
