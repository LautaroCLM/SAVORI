import { useState, type FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { crearMiRestaurante, unirmeConCodigo } from '@/services/onboarding'
import { cerrarSesion } from '@/services/auth'
import { mensajeDeError } from '@/lib/errores'
import { Aviso, Boton, Campo, Pestanas } from '@/components/ui'
import { IconoSalir } from '@/components/iconos'
import { useAuth } from './AuthProvider'
import { MarcoAcceso } from './LoginPage'
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

  return (
    <MarcoAcceso titulo="¡Bienvenido!" descripcion="Para empezar, creá tu restaurante o unite al de tu equipo." ancho="max-w-md">
      <Pestanas
        etiqueta="Cómo empezar"
        className="mb-6 flex w-full [&>*]:flex-1 [&>*]:justify-center"
        valor={modo}
        onCambiar={(m) => {
          setModo(m)
          enviar.reset()
        }}
        opciones={[
          { valor: 'crear', etiqueta: 'Crear mi restaurante' },
          { valor: 'unirme', etiqueta: 'Tengo un código' },
        ]}
      />

      <form onSubmit={submit} className="flex flex-col gap-5">
        <Campo etiqueta="Tu nombre" id="mi-nombre" autoComplete="name" required minLength={2} maxLength={80} value={miNombre} onChange={(e) => setMiNombre(e.target.value)} />
        {modo === 'crear' ? (
          <Campo
            etiqueta="Nombre del restaurante"
            id="restaurante"
            required
            minLength={2}
            maxLength={80}
            value={restaurante}
            onChange={(e) => setRestaurante(e.target.value)}
            ayuda="Vas a ser el administrador: después podés invitar a tu equipo."
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
            className="cifras tracking-[0.18em] uppercase"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
            ayuda="Te lo pasa el administrador del restaurante desde la sección Equipo."
          />
        )}

        {enviar.isError && <Aviso>{mensajeDeError(enviar.error)}</Aviso>}

        <Boton type="submit" tamano="lg" cargando={enviar.isPending}>
          {modo === 'crear' ? 'Crear restaurante' : 'Unirme'}
        </Boton>
      </form>

      <div className="mt-5 flex justify-center border-t border-borde pt-4">
        <Boton variante="fantasma" tamano="sm" icono={IconoSalir} onClick={() => cerrarSesion()}>
          Cerrar sesión
        </Boton>
      </div>
    </MarcoAcceso>
  )
}
