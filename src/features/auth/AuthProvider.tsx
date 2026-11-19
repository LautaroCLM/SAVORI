import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { useQueryClient } from '@tanstack/react-query'
import { limpiarCache, reclamarCache } from '@/lib/queryClient'
import { escucharSesion, obtenerSesion } from '@/services/auth'

interface EstadoAuth {
  session: Session | null
  cargando: boolean
}

const AuthContext = createContext<EstadoAuth>({ session: null, cargando: true })

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [estado, setEstado] = useState<EstadoAuth>({ session: null, cargando: true })

  useEffect(() => {
    let activo = true
    obtenerSesion().then((session) => {
      if (!activo) return
      if (session) reclamarCache(session.user.id) // si la caché guardada es de otro usuario, se borra
      setEstado({ session, cargando: false })
    })
    const desuscribir = escucharSesion((session) => {
      setEstado((prev) => {
        // Cambió el usuario (o cerró sesión): no reutilizar datos de otra cuenta
        if (prev.session?.user.id !== session?.user.id) {
          if (!session) {
            limpiarCache() // cerró sesión: no queda nada de este restaurante en el dispositivo
          } else if (prev.session) {
            queryClient.clear() // cambió de un usuario a otro en la misma pestaña
            reclamarCache(session.user.id)
          } else {
            reclamarCache(session.user.id) // sesión inicial: conservar la caché restaurada si es de este usuario
          }
        }
        return { session, cargando: false }
      })
    })
    return () => {
      activo = false
      desuscribir()
    }
  }, [queryClient])

  return <AuthContext.Provider value={estado}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}
