import { useQuery } from '@tanstack/react-query'
import { obtenerContexto, type ContextoUsuario } from '@/services/auth'
import { useAuth } from './AuthProvider'

export const claveContexto = (usuarioId: string | undefined) => ['contexto', usuarioId] as const

/** Perfil + restaurante del usuario logueado. */
export function useContexto() {
  const { session } = useAuth()
  const usuarioId = session?.user.id
  return useQuery({
    queryKey: claveContexto(usuarioId),
    queryFn: obtenerContexto,
    enabled: !!usuarioId,
    staleTime: 5 * 60_000,
  })
}

/** Para usar dentro del área protegida (RequireAuth ya garantizó que existe). */
export function useUsuario(): ContextoUsuario {
  const { data } = useContexto()
  if (!data) throw new Error('useUsuario() se usó fuera de <RequireAuth>')
  return data
}
