import type { ReactNode } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/features/auth/AuthProvider'
import { useContexto, useUsuario } from '@/features/auth/useContexto'
import { cerrarSesion, type Rol } from '@/services/auth'
import { mensajeDeError } from '@/lib/errores'
import { OnboardingPage } from '@/features/auth/OnboardingPage'
import { Boton, PantallaCargando, PantallaCentrada } from '@/components/ui'

function PantallaBloqueo({ titulo, mensaje, accion }: { titulo: string; mensaje: string; accion?: ReactNode }) {
  return (
    <PantallaCentrada>
      <h1 className="text-xl font-bold text-stone-900">{titulo}</h1>
      <p className="max-w-sm text-stone-600">{mensaje}</p>
      {accion ?? (
        <Boton variante="secundario" onClick={() => cerrarSesion()}>
          Cerrar sesión
        </Boton>
      )}
    </PantallaCentrada>
  )
}

/** Requiere sesión iniciada, perfil asignado y restaurante activo. */
export function RequireAuth() {
  const { session, cargando } = useAuth()
  const location = useLocation()
  const contexto = useContexto()

  if (cargando) return <PantallaCargando />
  if (!session) return <Navigate to="/login" replace state={{ desde: location.pathname }} />
  if (contexto.isPending) return <PantallaCargando />

  if (contexto.isError) {
    return (
      <PantallaBloqueo
        titulo="No se pudo cargar tu cuenta"
        mensaje={mensajeDeError(contexto.error)}
        accion={<Boton onClick={() => contexto.refetch()}>Reintentar</Boton>}
      />
    )
  }
  // Primer ingreso: todavía sin restaurante → crear el propio o unirse con código
  if (!contexto.data) return <OnboardingPage />
  if (!contexto.data.restaurante_activo) {
    return (
      <PantallaBloqueo
        titulo="Cuenta suspendida"
        mensaje={`La cuenta de ${contexto.data.restaurante_nombre} está suspendida. Contactá al administrador del sistema.`}
      />
    )
  }
  if (!contexto.data.perfil_activo) {
    return (
      <PantallaBloqueo
        titulo="Usuario desactivado"
        mensaje="Tu usuario fue desactivado. Hablá con el administrador de tu restaurante."
      />
    )
  }

  return <Outlet />
}

/** Restringe una ruta a ciertos roles; si no, redirige al inicio. */
export function RequireRol({ roles }: { roles: Rol[] }) {
  const usuario = useUsuario()
  if (!roles.includes(usuario.rol)) return <Navigate to="/" replace />
  return <Outlet />
}
