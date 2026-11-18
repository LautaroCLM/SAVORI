import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { iniciarSesion } from '@/services/auth'
import { mensajeDeError } from '@/lib/errores'
import { Boton, Campo, PantallaCargando } from '@/components/ui'
import { OfflineBanner } from '@/components/OfflineBanner'
import { useAuth } from './AuthProvider'

export function LoginPage() {
  const { session, cargando } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const destino = (location.state as { desde?: string } | null)?.desde ?? '/'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

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
    <>
      <OfflineBanner />
      <main className="flex min-h-dvh items-center justify-center bg-stone-100 p-4">
        <div className="w-full max-w-sm">
          <div className="mb-8 text-center">
            <img src="/favicon.svg" alt="" className="mx-auto size-12" />
            <h1 className="mt-4 text-2xl font-bold text-stone-900">Ingresá a tu restaurante</h1>
            <p className="mt-1 text-sm text-stone-500">Usá el email y la contraseña que te dieron.</p>
          </div>

          <form onSubmit={enviar} className="flex flex-col gap-4 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-stone-200">
            <Campo
              etiqueta="Email"
              id="email"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Campo
              etiqueta="Contraseña"
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {login.isError && (
              <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                {mensajeDeError(login.error)}
              </p>
            )}
            <Boton type="submit" cargando={login.isPending} className="mt-2">
              Ingresar
            </Boton>
          </form>
        </div>
      </main>
    </>
  )
}
