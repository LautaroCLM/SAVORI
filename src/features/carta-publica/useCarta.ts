import { useQuery } from '@tanstack/react-query'
import { obtenerCarta } from '@/services/cartaPublica'

export function useCarta(token: string | undefined) {
  return useQuery({
    queryKey: ['carta-publica', token],
    queryFn: () => obtenerCarta(token!),
    enabled: !!token,
    staleTime: 60_000,
  })
}
