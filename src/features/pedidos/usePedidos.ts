import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import {
  cambiarEstadoPedido,
  cerrarCuenta,
  crearPedidoMozo,
  listarPedidosActivos,
  listarPedidosDeSesion,
  listarPedidosEntregadosHoy,
  listarSesionesAbiertas,
  type EstadoPedido,
  type MetodoPago,
  type PedidoConItems,
  type SesionAbierta,
} from '@/services/pedidos'
import type { Mesa } from '@/services/mesas'
import type { Producto } from '@/services/carta'
import { ETIQUETA_ESTADO } from './PedidoCard'

export function usePedidosActivos() {
  return useQuery({ queryKey: ['pedidos', 'activos'], queryFn: listarPedidosActivos })
}

export function usePedidosEntregadosHoy(habilitado: boolean) {
  return useQuery({ queryKey: ['pedidos', 'entregados-hoy'], queryFn: listarPedidosEntregadosHoy, enabled: habilitado })
}

export function usePedidosDeSesion(sesionId: string | null) {
  return useQuery({
    queryKey: ['pedidos', 'sesion', sesionId],
    queryFn: () => listarPedidosDeSesion(sesionId!),
    enabled: !!sesionId,
  })
}

export function useSesionesAbiertas() {
  return useQuery({ queryKey: ['sesiones', 'abiertas'], queryFn: listarSesionesAbiertas })
}

// --- Descripciones para la cola offline (salen de lo que ya está en pantalla) -------------------

function numeroDeMesa(qc: QueryClient, mesaId: string): string {
  return String(qc.getQueryData<Mesa[]>(['mesas'])?.find((m) => m.id === mesaId)?.numero ?? '?')
}

function pedidoEnCache(qc: QueryClient, id: string): PedidoConItems | undefined {
  for (const [, datos] of qc.getQueriesData<PedidoConItems[]>({ queryKey: ['pedidos'] })) {
    const p = Array.isArray(datos) ? datos.find((x) => x.id === id) : undefined
    if (p) return p
  }
  return undefined
}

type SnapshotPedidos = [readonly unknown[], PedidoConItems[] | undefined][]

export function useMutacionesPedidos() {
  const queryClient = useQueryClient()
  const refrescar = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['pedidos'] }),
      queryClient.invalidateQueries({ queryKey: ['sesiones'] }),
      queryClient.invalidateQueries({ queryKey: ['mesas'] }),
    ])

  return {
    /** Cambia el estado de un pedido: se ve al instante y, sin conexión, queda en la cola. */
    cambiarEstado: useMutation({
      mutationFn: ({ id, estado }: { id: string; estado: EstadoPedido }) => {
        const p = pedidoEnCache(queryClient, id)
        const mesa = p ? `mesa ${p.mesas?.numero ?? '?'}` : 'pedido'
        return cambiarEstadoPedido(id, estado, `Pedido de ${mesa} → ${ETIQUETA_ESTADO[estado]}`)
      },
      onMutate: async ({ id, estado }) => {
        await queryClient.cancelQueries({ queryKey: ['pedidos'] })
        const previo = queryClient.getQueriesData<PedidoConItems[]>({ queryKey: ['pedidos'] }) as SnapshotPedidos
        const terminado = estado === 'entregado' || estado === 'cancelado'
        for (const [clave, datos] of previo) {
          if (!Array.isArray(datos)) continue
          const actualizados = datos.map((p) => (p.id === id ? { ...p, estado } : p))
          queryClient.setQueryData(clave, clave[1] === 'activos' && terminado ? actualizados.filter((p) => p.id !== id) : actualizados)
        }
        return { previo }
      },
      onError: (_e, _v, ctx) => ctx?.previo.forEach(([clave, datos]) => queryClient.setQueryData(clave, datos)),
      onSuccess: (r) => (r.encolado ? undefined : refrescar()),
    }),

    /** El mozo carga un pedido. Sin conexión queda en la cola y se envía al volver. */
    crear: useMutation({
      mutationFn: ({ mesaId, items, notas }: { mesaId: string; items: { producto_id: string; cantidad: number }[]; notas: string }) => {
        const productos = queryClient.getQueryData<Producto[]>(['productos']) ?? []
        const detalle = items.map((i) => `${i.cantidad}× ${productos.find((p) => p.id === i.producto_id)?.nombre ?? 'producto'}`).join(', ')
        return crearPedidoMozo(mesaId, items, notas, `Pedido mesa ${numeroDeMesa(queryClient, mesaId)}: ${detalle}`)
      },
      onSuccess: (r) => (r.encolado ? undefined : refrescar()),
    }),

    /** Cierra la cuenta de la mesa. La mesa se ve libre al instante; sin conexión queda en la cola. */
    cerrarCuenta: useMutation({
      mutationFn: ({ mesaId, metodo }: { mesaId: string; metodo: MetodoPago }) =>
        cerrarCuenta(mesaId, metodo, `Cerrar la cuenta de la mesa ${numeroDeMesa(queryClient, mesaId)} (${metodo})`),
      onMutate: async ({ mesaId }) => {
        await Promise.all([queryClient.cancelQueries({ queryKey: ['sesiones'] }), queryClient.cancelQueries({ queryKey: ['mesas'] })])
        const sesiones = queryClient.getQueryData<SesionAbierta[]>(['sesiones', 'abiertas'])
        const mesas = queryClient.getQueryData<Mesa[]>(['mesas'])
        queryClient.setQueryData<SesionAbierta[]>(['sesiones', 'abiertas'], (v) => v?.filter((s) => s.mesa_id !== mesaId))
        queryClient.setQueryData<Mesa[]>(['mesas'], (v) => v?.map((m) => (m.id === mesaId ? { ...m, estado: 'libre' } : m)))
        return { sesiones, mesas }
      },
      onError: (_e, _v, ctx) => {
        queryClient.setQueryData(['sesiones', 'abiertas'], ctx?.sesiones)
        queryClient.setQueryData(['mesas'], ctx?.mesas)
      },
      onSuccess: (r) => (r.encolado ? undefined : refrescar()),
    }),
  }
}
