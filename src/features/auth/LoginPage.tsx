import { useState, type FormEvent, type ReactNode } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { iniciarSesion } from '@/services/auth'
import { mensajeDeError } from '@/lib/errores'
import { Aviso, Boton, BotonIcono, Campo, PantallaCargando } from '@/components/ui'
import { IconoMostrar, IconoOcultar } from '@/components/iconos'
import { Logo } from '@/components/Logo'
import { OfflineBanner } from '@/components/OfflineBanner'
import { useAuth } from './AuthProvider'

/** Marco común de las pantallas sin sesión (ingreso y primer ingreso). */
export function MarcoAcceso({ titulo, descripcion, ancho = 'max-w-sm', children }: { titulo: string; descripcion: string; ancho?: string; children: ReactNode }) {
  return (
    <>
      <OfflineBanner />
      <main className="flex min-h-dvh items-center justify-center bg-fondo p-4">
        <div className={`w-full ${ancho} motion-safe:animate-entrar`}>
          <Logo className="h-10" />
          <h1 className="mt-8 text-[1.75rem] leading-tight font-bold tracking-[-0.02em] text-tinta">{titulo}</h1>
          <p className="mt-1.5 text-sm text-tinta-2">{descripcion}</p>
          <div className="mt-6 rounded-tarjeta border border-borde bg-superficie p-6">{children}</div>
        </div>
      </main>
    </>
  )
}

export function LoginPage() {
  const { session, cargando } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const destino = (location.state as { desde?: string } | null)?.desde ?? '/'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [verClave, setVerClave] = useState(false)

  const login = useMutation({
    mutationFn: () => iniciarSesion(email, password),
    onSuccess: () => navigate(destino, { replace: true }),
  })

  if (cargando) return <PantallaCargando />
  if (session && !login.isPending) return <Navigate to={destino} replace />

  function enviar(e: FormEvent) {
    e.preventDefault()
    login.mutate()
  }

  return (
    <MarcoAcceso titulo="Ingresá a tu restaurante" descripcion="Usá el email y la contraseña que te dieron.">
      <form onSubmit={enviar} className="flex flex-col gap-5">
        <Campo etiqueta="Email" id="email" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <div className="relative">
          <Campo
            etiqueta="Contraseña"
            id="password"
            type={verClave ? 'text' : 'password'}
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="pr-12"
          />
          <BotonIcono
            icono={verClave ? IconoOcultar : IconoMostrar}
            etiqueta={verClave ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            onClick={() => setVerClave((v) => !v)}
            className="absolute right-0.5 bottom-0.5"
          />
        </div>
        {login.isError && <Aviso>{mensajeDeError(login.error)}</Aviso>}
        <Boton type="submit" tamano="lg" cargando={login.isPending}>
          Ingresar
        </Boton>
      </form>
    </MarcoAcceso>
  )
}
