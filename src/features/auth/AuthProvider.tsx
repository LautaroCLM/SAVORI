import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { useQueryClient } from '@tanstack/react-query'
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
    obtenerSesion().then((session) => activo && setEstado({ session, cargando: false }))
    const desuscribir = escucharSesion((session) => {
      setEstado((prev) => {
        // Cambió el usuario (o cerró sesión): no reutilizar datos de otra cuenta
        if (prev.session?.user.id !== session?.user.id) queryClient.clear()
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
