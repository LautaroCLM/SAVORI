import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import QRCode from 'qrcode'
import {
  actualizarMesa,
  actualizarSalon,
  crearMesa,
  crearSalon,
  eliminarMesa,
  eliminarSalon,
  listarMesas,
  listarSalones,
  regenerarQrMesa,
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
  }
}

/** SVG del QR de una URL (generado en el navegador, sin servicios externos). */
export function useQrSvg(url: string) {
  return useQuery({
    queryKey: ['qr-svg', url],
    queryFn: () => QRCode.toString(url, { type: 'svg', margin: 1, errorCorrectionLevel: 'M', color: { dark: '#1B1613', light: '#FFFFFF' } }),
    staleTime: Infinity,
  })
}
