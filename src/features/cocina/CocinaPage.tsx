import { CookingPot } from 'lucide-react'
import { Aviso, Boton, CargandoSeccion, EncabezadoPagina, Punto, type Tono } from '@/components/ui'
import { IconoEmpezar, IconoListo } from '@/components/iconos'
import { SonidoToggle } from '@/components/SonidoToggle'
import { useAhora } from '@/hooks/useAhora'
import { mensajeDeError } from '@/lib/errores'
import { PedidoCard } from '@/features/pedidos/PedidoCard'
import { useMutacionesPedidos, usePedidosActivos } from '@/features/pedidos/usePedidos'
import type { EstadoPedido } from '@/services/pedidos'

const COLUMNAS: { estado: EstadoPedido; titulo: string; vacio: string; tono: Tono }[] = [
  { estado: 'pendiente', titulo: 'Pendientes', vacio: 'Sin pedidos nuevos', tono: 'marca' },
  { estado: 'en_preparacion', titulo: 'En preparación', vacio: 'Nada en preparación', tono: 'neutro' },
  { estado: 'listo', titulo: 'Listos', vacio: 'Nada esperando al mozo', tono: 'exito' },
]

/** Pantalla de cocina: tres carriles que se actualizan solos. Pensada para tablet o TV, mirada a distancia. */
export function CocinaPage() {
  const ahora = useAhora(15_000)
  const pedidos = usePedidosActivos()
  const { cambiarEstado } = useMutacionesPedidos()

  if (pedidos.isPending) return <CargandoSeccion />
  if (pedidos.isError) return <Aviso titulo="No se pudieron cargar los pedidos">{mensajeDeError(pedidos.error)}</Aviso>

  const cambiar = (id: string, estado: EstadoPedido) => cambiarEstado.mutate({ id, estado })

  return (
    <div className="max-w-[110rem]">
      <EncabezadoPagina titulo="Cocina" descripcion="Los pedidos entran solos. Más de 15 minutos esperando se marca en rojo." acciones={<SonidoToggle />} />
      {cambiarEstado.isError && <Aviso className="mb-4">{mensajeDeError(cambiarEstado.error)}</Aviso>}

      <div className="grid gap-6 lg:grid-cols-3">
        {COLUMNAS.map(({ estado, titulo, vacio, tono }) => {
          const items = pedidos.data.filter((p) => p.estado === estado)
          return (
            <section key={estado} aria-label={titulo} className="flex flex-col gap-3">
              <h2 className="flex items-center gap-2 border-b-2 border-borde pb-2 text-base font-bold text-tinta">
                <Punto tono={tono} className="size-2.5" />
                {titulo}
                <span className="cifras ml-auto text-sm font-bold text-tinta-3">{items.length}</span>
              </h2>
              {items.length === 0 && (
                <p className="flex items-center justify-center gap-2 rounded-tarjeta border border-dashed border-borde-fuerte px-4 py-8 text-sm text-tinta-3">
                  <CookingPot aria-hidden size={16} />
                  {vacio}
                </p>
              )}
              {items.map((p) => (
                <PedidoCard
                  key={p.id}
                  pedido={p}
                  ahora={ahora}
                  grande
                  mostrarTotal={false}
                  acciones={
                    estado === 'pendiente' ? (
                      <Boton tamano="lg" icono={IconoEmpezar} onClick={() => cambiar(p.id, 'en_preparacion')}>
                        Empezar
                      </Boton>
                    ) : estado === 'en_preparacion' ? (
                      <Boton tamano="lg" icono={IconoListo} onClick={() => cambiar(p.id, 'listo')}>
                        Marcar listo
                      </Boton>
                    ) : (
                      <span className="text-sm font-semibold text-exito-600">Esperando al mozo</span>
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
