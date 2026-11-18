import { useState, type FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { crearMiRestaurante, unirmeConCodigo } from '@/services/onboarding'
import { cerrarSesion } from '@/services/auth'
import { mensajeDeError } from '@/lib/errores'
import { Boton, Campo } from '@/components/ui'
import { OfflineBanner } from '@/components/OfflineBanner'
import { useAuth } from './AuthProvider'
import { claveContexto } from './useContexto'

type Modo = 'crear' | 'unirme'

/** Primer ingreso: el usuario todavía no tiene restaurante. */
export function OnboardingPage() {
  const { session } = useAuth()
  const queryClient = useQueryClient()
  const [modo, setModo] = useState<Modo>('crear')
  const [miNombre, setMiNombre] = useState('')
  const [restaurante, setRestaurante] = useState('')
  const [codigo, setCodigo] = useState('')

  const enviar = useMutation({
    mutationFn: () =>
      modo === 'crear' ? crearMiRestaurante(restaurante.trim(), miNombre.trim()) : unirmeConCodigo(codigo, miNombre.trim()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: claveContexto(session?.user.id) }),
  })

  function submit(e: FormEvent) {
    e.preventDefault()
    enviar.mutate()
  }

  const pestana = (m: Modo, texto: string) => (
    <button
      type="button"
      role="tab"
      aria-selected={modo === m}
      onClick={() => {
        setModo(m)
        enviar.reset()
      }}
      className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
        modo === m ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'
      }`}
    >
      {texto}
    </button>
  )

  return (
    <>
      <OfflineBanner />
      <main className="flex min-h-dvh items-center justify-center bg-stone-100 p-4">
        <div className="w-full max-w-md">
          <div className="mb-6 text-center">
            <img src="/favicon.svg" alt="" className="mx-auto size-12" />
            <h1 className="mt-4 text-2xl font-bold text-stone-900">¡Bienvenido!</h1>
            <p className="mt-1 text-sm text-stone-500">Para empezar, creá tu restaurante o unite al de tu equipo.</p>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-stone-200">
            <div role="tablist" className="mb-5 flex gap-1 rounded-xl bg-stone-100 p-1">
              {pestana('crear', 'Crear mi restaurante')}
              {pestana('unirme', 'Tengo un código')}
            </div>

            <form onSubmit={submit} className="flex flex-col gap-4">
              <Campo
                etiqueta="Tu nombre"
                id="mi-nombre"
                autoComplete="name"
                required
                minLength={2}
                maxLength={80}
                value={miNombre}
                onChange={(e) => setMiNombre(e.target.value)}
              />
              {modo === 'crear' ? (
                <Campo
                  etiqueta="Nombre del restaurante"
                  id="restaurante"
                  required
                  minLength={2}
                  maxLength={80}
                  value={restaurante}
                  onChange={(e) => setRestaurante(e.target.value)}
                />
              ) : (
                <Campo
                  etiqueta="Código de invitación"
                  id="codigo"
                  required
                  placeholder="XXXX-XXXX"
                  autoCapitalize="characters"
                  autoComplete="off"
                  maxLength={9}
                  className="font-mono tracking-widest uppercase"
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value)}
                />
              )}

              {enviar.isError && (
                <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                  {mensajeDeError(enviar.error)}
                </p>
              )}

              <Boton type="submit" cargando={enviar.isPending}>
                {modo === 'crear' ? 'Crear restaurante' : 'Unirme'}
              </Boton>
            </form>
          </div>

          <button onClick={() => cerrarSesion()} className="mx-auto mt-5 block text-sm text-stone-500 hover:text-stone-800">
            Cerrar sesión
          </button>
        </div>
      </main>
    </>
  )
}
