import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
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
} from '@/services/pedidos'

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

export function useMutacionesPedidos() {
  const queryClient = useQueryClient()
  const refrescar = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['pedidos'] }),
      queryClient.invalidateQueries({ queryKey: ['sesiones'] }),
      queryClient.invalidateQueries({ queryKey: ['mesas'] }),
    ])
  return {
    cambiarEstado: useMutation({
      mutationFn: ({ id, estado }: { id: string; estado: EstadoPedido }) => cambiarEstadoPedido(id, estado),
      onSuccess: refrescar,
    }),
    crear: useMutation({
      mutationFn: ({ mesaId, items, notas }: { mesaId: string; items: { producto_id: string; cantidad: number }[]; notas: string }) =>
        crearPedidoMozo(mesaId, items, notas),
      onSuccess: refrescar,
    }),
    cerrarCuenta: useMutation({
      mutationFn: ({ mesaId, metodo }: { mesaId: string; metodo: MetodoPago }) => cerrarCuenta(mesaId, metodo),
      onSuccess: refrescar,
    }),
  }
}
