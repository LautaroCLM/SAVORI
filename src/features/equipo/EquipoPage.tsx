import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useUsuario } from '@/features/auth/useContexto'
import type { Rol } from '@/services/auth'
import {
  actualizarMiembro,
  generarInvitacion,
  listarEquipo,
  listarInvitaciones,
  revocarInvitacion,
  type Invitacion,
} from '@/services/onboarding'
import { formatearFechaHora } from '@/lib/formato'
import { mensajeDeError } from '@/lib/errores'
import { Boton, Spinner } from '@/components/ui'

const ROLES: { valor: Rol; etiqueta: string }[] = [
  { valor: 'mozo', etiqueta: 'Mozo' },
  { valor: 'cocina', etiqueta: 'Cocina' },
  { valor: 'admin', etiqueta: 'Administrador' },
]
const etiquetaRol = (rol: Rol) => ROLES.find((r) => r.valor === rol)?.etiqueta ?? rol

function estadoInvitacion(inv: Invitacion): { texto: string; vigente: boolean } {
  if (inv.usada_at) return { texto: 'Usada', vigente: false }
  if (inv.revocada) return { texto: 'Revocada', vigente: false }
  if (new Date(inv.expira_at) < new Date()) return { texto: 'Vencida', vigente: false }
  return { texto: `Vence ${formatearFechaHora(inv.expira_at)}`, vigente: true }
}

function Equipo() {
  const yo = useUsuario()
  const queryClient = useQueryClient()
  const equipo = useQuery({ queryKey: ['equipo'], queryFn: listarEquipo })
  const cambiar = useMutation({
    mutationFn: ({ id, cambios }: { id: string; cambios: Parameters<typeof actualizarMiembro>[1] }) =>
      actualizarMiembro(id, cambios),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['equipo'] }),
  })

  return (
    <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-stone-200">
      <h2 className="text-lg font-bold">Miembros</h2>
      {equipo.isPending && <Spinner className="mt-4" />}
      {equipo.isError && <p className="mt-3 text-sm text-red-700">{mensajeDeError(equipo.error)}</p>}
      {cambiar.isError && <p className="mt-3 text-sm text-red-700">{mensajeDeError(cambiar.error)}</p>}
      <ul className="mt-3 divide-y divide-stone-100">
        {equipo.data?.map((m) => {
          const soyYo = m.id === yo.usuario_id
          return (
            <li key={m.id} className="flex flex-wrap items-center gap-3 py-3">
              <div className="min-w-0 flex-1">
                <p className={`truncate font-medium ${m.activo ? '' : 'text-stone-400 line-through'}`}>
                  {m.nombre} {soyYo && <span className="text-xs font-normal text-stone-500">(vos)</span>}
                </p>
              </div>
              {soyYo ? (
                <span className="text-sm text-stone-500">{etiquetaRol(m.rol)}</span>
              ) : (
                <>
                  <select
                    aria-label={`Rol de ${m.nombre}`}
                    value={m.rol}
                    onChange={(e) => cambiar.mutate({ id: m.id, cambios: { rol: e.target.value as Rol } })}
                    className="h-9 rounded-lg border border-stone-300 bg-white px-2 text-sm"
                  >
                    {ROLES.map((r) => (
                      <option key={r.valor} value={r.valor}>
                        {r.etiqueta}
                      </option>
                    ))}
                  </select>
                  <Boton
                    variante="secundario"
                    className="h-9"
                    onClick={() => cambiar.mutate({ id: m.id, cambios: { activo: !m.activo } })}
                  >
                    {m.activo ? 'Desactivar' : 'Reactivar'}
                  </Boton>
                </>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}

function Invitaciones() {
  const queryClient = useQueryClient()
  const [rol, setRol] = useState<Rol>('mozo')
  const [copiado, setCopiado] = useState<string | null>(null)
  const lista = useQuery({ queryKey: ['invitaciones'], queryFn: listarInvitaciones })
  const refrescar = () => queryClient.invalidateQueries({ queryKey: ['invitaciones'] })
  const generar = useMutation({ mutationFn: () => generarInvitacion(rol), onSuccess: refrescar })
  const revocar = useMutation({ mutationFn: revocarInvitacion, onSuccess: refrescar })

  async function copiar(codigo: string) {
    try {
      await navigator.clipboard.writeText(codigo)
      setCopiado(codigo)
      setTimeout(() => setCopiado(null), 1500)
    } catch {
      /* sin permiso de portapapeles: el código igual está visible */
    }
  }

  return (
    <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-stone-200">
      <h2 className="text-lg font-bold">Invitar a alguien</h2>
      <p className="mt-1 text-sm text-stone-500">
        Generá un código y pasáselo. La persona entra con su usuario, elige &quot;Tengo un código&quot; y queda en tu
        restaurante con el rol que elijas. Cada código sirve una sola vez y vence en 7 días.
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <select
          aria-label="Rol de la invitación"
          value={rol}
          onChange={(e) => setRol(e.target.value as Rol)}
          className="h-11 rounded-lg border border-stone-300 bg-white px-3 text-sm"
        >
          {ROLES.map((r) => (
            <option key={r.valor} value={r.valor}>
              {r.etiqueta}
            </option>
          ))}
        </select>
        <Boton onClick={() => generar.mutate()} cargando={generar.isPending}>
          Generar código
        </Boton>
      </div>
      {(generar.isError || revocar.isError) && (
        <p className="mt-3 text-sm text-red-700">{mensajeDeError(generar.error ?? revocar.error)}</p>
      )}

      {lista.isPending && <Spinner className="mt-4" />}
      <ul className="mt-4 divide-y divide-stone-100">
        {lista.data?.map((inv) => {
          const estado = estadoInvitacion(inv)
          return (
            <li key={inv.id} className="flex flex-wrap items-center gap-3 py-3">
              <code className={`font-mono text-base font-semibold tracking-widest ${estado.vigente ? '' : 'text-stone-400 line-through'}`}>
                {inv.codigo}
              </code>
              <span className="text-sm text-stone-500">
                {etiquetaRol(inv.rol)} · {estado.texto}
              </span>
              {estado.vigente && (
                <span className="ml-auto flex gap-2">
                  <Boton variante="secundario" className="h-9" onClick={() => copiar(inv.codigo)}>
                    {copiado === inv.codigo ? '¡Copiado!' : 'Copiar'}
                  </Boton>
                  <Boton variante="secundario" className="h-9" onClick={() => revocar.mutate(inv.id)}>
                    Revocar
                  </Boton>
                </span>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}

export function EquipoPage() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <h1 className="text-2xl font-bold text-stone-900">Equipo</h1>
      <Equipo />
      <Invitaciones />
    </div>
  )
}
