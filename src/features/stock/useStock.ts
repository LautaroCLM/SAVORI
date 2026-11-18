import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useProductos } from '@/features/carta/useCartaAdmin'
import { configurarStock, estadoStock, listarMovimientos, registrarMovimiento, type TipoMovimiento } from '@/services/stock'

export function useMovimientos(habilitado = true) {
  return useQuery({ queryKey: ['movimientos'], queryFn: () => listarMovimientos(100), enabled: habilitado })
}

export function useMutacionesStock() {
  const queryClient = useQueryClient()
  const refrescar = () =>
    Promise.all([queryClient.invalidateQueries({ queryKey: ['productos'] }), queryClient.invalidateQueries({ queryKey: ['movimientos'] })])
  return {
    registrar: useMutation({
      mutationFn: ({ id, tipo, cantidad, motivo }: { id: string; tipo: TipoMovimiento; cantidad: number; motivo: string }) =>
        registrarMovimiento(id, tipo, cantidad, motivo),
      onSuccess: refrescar,
    }),
    configurar: useMutation({
      mutationFn: async ({ id, controla_stock, stock_minimo, stockInicial }: { id: string; controla_stock: boolean; stock_minimo: number; stockInicial?: number }) => {
        await configurarStock(id, { controla_stock, stock_minimo })
        if (controla_stock && stockInicial && stockInicial > 0) await registrarMovimiento(id, 'ajuste', stockInicial, 'Stock inicial')
      },
      onSuccess: refrescar,
    }),
  }
}

/** Cantidad de productos agotados o por debajo del mínimo (para el aviso del menú). Solo se consulta para admins. */
export function useCantidadAlertasStock(esAdmin: boolean): number {
  const productos = useProductos()
  if (!esAdmin || !productos.data) return 0
  return productos.data.filter((p) => p.controla_stock && estadoStock(p) !== 'ok').length
}
