import { useState } from 'react'
import { ReceiptText } from 'lucide-react'
import { Aviso, Boton, CargandoSeccion, EncabezadoPagina, EstadoVacio, Pestanas, Punto, type Tono } from '@/components/ui'
import { IconoAgregar, IconoAvanzar, IconoEntregado } from '@/components/iconos'
import { SonidoToggle } from '@/components/SonidoToggle'
import { useConfirmar } from '@/components/Confirmar'
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
  const confirmar = useConfirmar()

  const consulta = vista === 'activos' ? activos : entregados
  const lista = consulta.data ?? []
  const porEstado = (e: PedidoConItems['estado']) => lista.filter((p) => p.estado === e)

  async function cancelar(p: PedidoConItems) {
    const ok = await confirmar({
      titulo: `Cancelar el pedido de la mesa ${p.mesas?.numero ?? ''}`,
      mensaje: 'Se descuenta de la cuenta de la mesa y, si los productos controlan stock, las unidades vuelven al inventario. Un pedido cancelado no se puede reabrir.',
      confirmar: 'Cancelar pedido',
      cancelar: 'Volver',
      tono: 'peligro',
    })
    if (ok) cambiarEstado.mutate({ id: p.id, estado: 'cancelado' })
  }

  function acciones(p: PedidoConItems) {
    const cambiar = (estado: PedidoConItems['estado']) => cambiarEstado.mutate({ id: p.id, estado })
    return (
      <>
        {(p.estado === 'pendiente' || p.estado === 'en_preparacion' || p.estado === 'listo') && (
          <Boton variante="fantasma" tamano="sm" onClick={() => cancelar(p)}>
            Cancelar
          </Boton>
        )}
        {p.estado === 'pendiente' && (
          <Boton variante="secundario" tamano="sm" icono={IconoAvanzar} onClick={() => cambiar('en_preparacion')}>
            A cocina
          </Boton>
        )}
        {p.estado === 'listo' && (
          <Boton tamano="sm" icono={IconoEntregado} onClick={() => cambiar('entregado')}>
            Entregado
          </Boton>
        )}
      </>
    )
  }

  const secciones: { titulo: string; estado: PedidoConItems['estado']; tono: Tono }[] =
    vista === 'activos'
      ? [
          { titulo: 'Listos para entregar', estado: 'listo', tono: 'exito' },
          { titulo: 'Pendientes', estado: 'pendiente', tono: 'marca' },
          { titulo: 'En preparación', estado: 'en_preparacion', tono: 'neutro' },
        ]
      : [{ titulo: 'Entregados hoy', estado: 'entregado', tono: 'neutro' }]

  return (
    <div className="max-w-6xl">
      <EncabezadoPagina
        titulo="Pedidos"
        descripcion="Lo que entra por QR o carga el mozo aparece acá al instante."
        acciones={
          <>
            <SonidoToggle />
            <Boton icono={IconoAgregar} onClick={() => setNuevo(true)} disabled={!mesas.data?.length}>
              Nuevo pedido
            </Boton>
          </>
        }
      >
        <Pestanas
          etiqueta="Vista de pedidos"
          valor={vista}
          onCambiar={setVista}
          opciones={[
            { valor: 'activos', etiqueta: 'Activos', contador: activos.data?.length },
            { valor: 'entregados', etiqueta: 'Entregados hoy' },
          ]}
        />
      </EncabezadoPagina>

      {cambiarEstado.isError && <Aviso className="mb-4">{mensajeDeError(cambiarEstado.error)}</Aviso>}

      {consulta.isPending ? (
        <CargandoSeccion />
      ) : consulta.isError ? (
        <Aviso titulo="No se pudieron cargar los pedidos">{mensajeDeError(consulta.error)}</Aviso>
      ) : lista.length === 0 ? (
        <EstadoVacio
          icono={ReceiptText}
          titulo={vista === 'activos' ? 'No hay pedidos en curso' : 'Todavía no se entregó nada hoy'}
          descripcion={vista === 'activos' ? 'Cuando un cliente pida por QR o cargues un pedido, aparece acá al instante, con aviso sonoro.' : undefined}
          accion={
            vista === 'activos' && mesas.data?.length ? (
              <Boton icono={IconoAgregar} onClick={() => setNuevo(true)}>
                Cargar un pedido
              </Boton>
            ) : undefined
          }
        />
      ) : (
        <div className="flex flex-col gap-8">
          {secciones.map(({ titulo, estado, tono }) => {
            const items = porEstado(estado)
            if (items.length === 0) return null
            return (
              <section key={estado} aria-label={titulo}>
                <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-tinta">
                  <Punto tono={tono} />
                  {titulo}
                  <span className="cifras font-semibold text-tinta-3">{items.length}</span>
                </h2>
                <ul className="grid grid-cols-[repeat(auto-fill,minmax(18rem,1fr))] gap-4">
                  {items.map((p) => (
                    <li key={p.id} className="flex [&>article]:w-full">
                      <PedidoCard pedido={p} ahora={ahora} acciones={vista === 'activos' ? acciones(p) : undefined} />
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
