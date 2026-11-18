import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  actualizarCategoria,
  actualizarProducto,
  crearCategoria,
  crearProducto,
  eliminarCategoria,
  eliminarProducto,
  listarCategorias,
  listarProductos,
} from '@/services/carta'

const CATEGORIAS = ['categorias'] as const
const PRODUCTOS = ['productos'] as const

export function useCategorias() {
  return useQuery({ queryKey: CATEGORIAS, queryFn: listarCategorias })
}

export function useProductos() {
  return useQuery({ queryKey: PRODUCTOS, queryFn: listarProductos })
}

/** Mutaciones de la carta: todas refrescan categorías y productos al terminar. */
export function useMutacionesCarta() {
  const queryClient = useQueryClient()
  const refrescar = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: CATEGORIAS }),
      queryClient.invalidateQueries({ queryKey: PRODUCTOS }),
    ])
  return {
    crearCategoria: useMutation({ mutationFn: crearCategoria, onSuccess: refrescar }),
    actualizarCategoria: useMutation({
      mutationFn: ({ id, cambios }: { id: string; cambios: Parameters<typeof actualizarCategoria>[1] }) =>
        actualizarCategoria(id, cambios),
      onSuccess: refrescar,
    }),
    eliminarCategoria: useMutation({ mutationFn: eliminarCategoria, onSuccess: refrescar }),
    crearProducto: useMutation({ mutationFn: crearProducto, onSuccess: refrescar }),
    actualizarProducto: useMutation({
      mutationFn: ({ id, cambios }: { id: string; cambios: Parameters<typeof actualizarProducto>[1] }) =>
        actualizarProducto(id, cambios),
      onSuccess: refrescar,
    }),
    eliminarProducto: useMutation({ mutationFn: eliminarProducto, onSuccess: refrescar }),
  }
}
