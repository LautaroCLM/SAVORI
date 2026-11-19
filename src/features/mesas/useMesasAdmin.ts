import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import QRCode from 'qrcode'
import {
  actualizarMesa,
  actualizarSalon,
  cambiarEstadoMesa,
  crearMesa,
  crearSalon,
  eliminarMesa,
  eliminarSalon,
  listarMesas,
  listarSalones,
  regenerarQrMesa,
  type Mesa,
} from '@/services/mesas'

const SALONES = ['salones'] as const
const MESAS = ['mesas'] as const

export function useSalones() {
  return useQuery({ queryKey: SALONES, queryFn: listarSalones })
}

export function useMesas() {
  return useQuery({ queryKey: MESAS, queryFn: listarMesas })
}

export function useMutacionesMesas() {
  const queryClient = useQueryClient()
  const refrescar = () =>
    Promise.all([queryClient.invalidateQueries({ queryKey: SALONES }), queryClient.invalidateQueries({ queryKey: MESAS })])
  return {
    crearSalon: useMutation({ mutationFn: crearSalon, onSuccess: refrescar }),
    actualizarSalon: useMutation({
      mutationFn: ({ id, cambios }: { id: string; cambios: Parameters<typeof actualizarSalon>[1] }) => actualizarSalon(id, cambios),
      onSuccess: refrescar,
    }),
    eliminarSalon: useMutation({ mutationFn: eliminarSalon, onSuccess: refrescar }),
    crearMesa: useMutation({ mutationFn: crearMesa, onSuccess: refrescar }),
    actualizarMesa: useMutation({
      mutationFn: ({ id, cambios }: { id: string; cambios: Parameters<typeof actualizarMesa>[1] }) => actualizarMesa(id, cambios),
      onSuccess: refrescar,
    }),
    eliminarMesa: useMutation({ mutationFn: eliminarMesa, onSuccess: refrescar }),
    regenerarQr: useMutation({ mutationFn: regenerarQrMesa, onSuccess: refrescar }),
    /** Marcar la mesa libre u ocupada a mano: se ve al instante y, sin conexión, queda en la cola. */
    estadoMesa: useMutation({
      mutationFn: ({ id, estado }: { id: string; estado: Mesa['estado'] }) => {
        const numero = queryClient.getQueryData<Mesa[]>(MESAS)?.find((m) => m.id === id)?.numero ?? '?'
        return cambiarEstadoMesa(id, estado, `Marcar la mesa ${numero} como ${estado}`)
      },
      onMutate: async ({ id, estado }) => {
        await queryClient.cancelQueries({ queryKey: MESAS })
        const previo = queryClient.getQueryData<Mesa[]>(MESAS)
        queryClient.setQueryData<Mesa[]>(MESAS, (v) => v?.map((m) => (m.id === id ? { ...m, estado } : m)))
        return { previo }
      },
      onError: (_e, _v, ctx) => queryClient.setQueryData(MESAS, ctx?.previo),
      onSuccess: (r) => (r.encolado ? undefined : refrescar()),
    }),
  }
}

/** Mover una mesa en el mapa: se ve al instante y se revierte si el servidor la rechaza. */
export function useMoverMesa() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, x, y }: { id: string; x: number; y: number }) => actualizarMesa(id, { x, y }),
    onMutate: async ({ id, x, y }) => {
      await queryClient.cancelQueries({ queryKey: MESAS })
      const previo = queryClient.getQueryData<Mesa[]>(MESAS)
      queryClient.setQueryData<Mesa[]>(MESAS, (viejo) => viejo?.map((m) => (m.id === id ? { ...m, x, y } : m)))
      return { previo }
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.previo) queryClient.setQueryData(MESAS, ctx.previo)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: MESAS }),
  })
}

/** SVG del QR de una URL (generado en el navegador, sin servicios externos). */
export function useQrSvg(url: string) {
  return useQuery({
    queryKey: ['qr-svg', url],
    queryFn: () => QRCode.toString(url, { type: 'svg', margin: 1, errorCorrectionLevel: 'M', color: { dark: '#1B1613', light: '#FFFFFF' } }),
    staleTime: Infinity,
  })
}
