import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { UsersRound } from 'lucide-react'
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
import { cn } from '@/lib/utils'
import { useConfirmar } from '@/components/Confirmar'
import { Aviso, Boton, CargandoSeccion, EncabezadoPagina, Insignia, Selector, Tarjeta } from '@/components/ui'
import { IconoCopiar, IconoExito, IconoInvitar } from '@/components/iconos'

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

function Iniciales({ nombre, apagado }: { nombre: string; apagado?: boolean }) {
  const letras = nombre
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('')
  return (
    <span aria-hidden className={cn('grid size-10 shrink-0 place-items-center rounded-full text-sm font-bold', apagado ? 'bg-superficie-2 text-tinta-3' : 'bg-superficie-2 text-tinta-2')}>
      {letras || <UsersRound size={16} />}
    </span>
  )
}

function Equipo() {
  const yo = useUsuario()
  const queryClient = useQueryClient()
  const confirmar = useConfirmar()
  const equipo = useQuery({ queryKey: ['equipo'], queryFn: listarEquipo })
  const cambiar = useMutation({
    mutationFn: ({ id, cambios }: { id: string; cambios: Parameters<typeof actualizarMiembro>[1] }) =>
      actualizarMiembro(id, cambios),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['equipo'] }),
  })

  async function alternarActivo(id: string, nombre: string, activo: boolean) {
    if (activo) {
      const ok = await confirmar({
        titulo: `Desactivar a ${nombre}`,
        mensaje: 'No va a poder entrar al restaurante hasta que lo reactives. Su historial se conserva.',
        confirmar: 'Desactivar',
        tono: 'peligro',
      })
      if (!ok) return
    }
    cambiar.mutate({ id, cambios: { activo: !activo } })
  }

  const activos = equipo.data?.filter((m) => m.activo).length ?? 0

  return (
    <Tarjeta sinRelleno titulo="Miembros" descripcion={equipo.data ? `${activos} activos` : undefined}>
      {equipo.isPending && <CargandoSeccion />}
      {(equipo.isError || cambiar.isError) && (
        <div className="px-5 pb-4">
          <Aviso>{mensajeDeError(equipo.error ?? cambiar.error)}</Aviso>
        </div>
      )}
      <ul className="divide-y divide-borde">
        {equipo.data?.map((m) => {
          const soyYo = m.id === yo.usuario_id
          return (
            <li key={m.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3">
              <Iniciales nombre={m.nombre} apagado={!m.activo} />
              <div className="min-w-0 flex-1 basis-32">
                <p className={cn('truncate font-semibold', !m.activo && 'text-tinta-3')}>
                  {m.nombre} {soyYo && <span className="text-xs font-normal text-tinta-3">(vos)</span>}
                </p>
                {!m.activo && <p className="text-xs text-tinta-3">Desactivado</p>}
              </div>
              {soyYo ? (
                <Insignia>{etiquetaRol(m.rol)}</Insignia>
              ) : (
                <div className="flex items-center gap-2">
                  <Selector
                    aria-label={`Rol de ${m.nombre}`}
                    value={m.rol}
                    onChange={(e) => cambiar.mutate({ id: m.id, cambios: { rol: e.target.value as Rol } })}
                    className="h-10 text-sm"
                    disabled={!m.activo}
                  >
                    {ROLES.map((r) => (
                      <option key={r.valor} value={r.valor}>
                        {r.etiqueta}
                      </option>
                    ))}
                  </Selector>
                  <Boton variante={m.activo ? 'fantasma' : 'secundario'} tamano="sm" onClick={() => alternarActivo(m.id, m.nombre, m.activo)}>
                    {m.activo ? 'Desactivar' : 'Reactivar'}
                  </Boton>
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </Tarjeta>
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
    <Tarjeta
      titulo="Invitar a alguien"
      descripcion='La persona entra con su usuario, elige "Tengo un código" y queda en tu restaurante con el rol que elijas. Cada código sirve una vez y vence en 7 días.'
    >
      <div className="flex flex-wrap items-end gap-2">
        <Selector etiqueta="Rol" id="inv-rol" value={rol} onChange={(e) => setRol(e.target.value as Rol)} envoltura="w-48">
          {ROLES.map((r) => (
            <option key={r.valor} value={r.valor}>
              {r.etiqueta}
            </option>
          ))}
        </Selector>
        <Boton icono={IconoInvitar} onClick={() => generar.mutate()} cargando={generar.isPending}>
          Generar código
        </Boton>
      </div>
      {(generar.isError || revocar.isError) && <Aviso className="mt-4">{mensajeDeError(generar.error ?? revocar.error)}</Aviso>}

      {lista.isPending && <CargandoSeccion />}
      {lista.data && lista.data.length > 0 && (
        <ul className="mt-5 divide-y divide-borde border-t border-borde">
          {lista.data.map((inv) => {
            const estado = estadoInvitacion(inv)
            return (
              <li key={inv.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3">
                <code className={cn('cifras text-base font-bold tracking-[0.18em]', estado.vigente ? 'text-tinta' : 'text-tinta-3 line-through')}>{inv.codigo}</code>
                <span className="text-sm text-tinta-2">
                  {etiquetaRol(inv.rol)} · <span className={estado.vigente ? '' : 'text-tinta-3'}>{estado.texto}</span>
                </span>
                {estado.vigente && (
                  <span className="ml-auto flex gap-1">
                    <Boton variante="secundario" tamano="sm" icono={copiado === inv.codigo ? IconoExito : IconoCopiar} onClick={() => copiar(inv.codigo)}>
                      {copiado === inv.codigo ? 'Copiado' : 'Copiar'}
                    </Boton>
                    <Boton variante="fantasma" tamano="sm" onClick={() => revocar.mutate(inv.id)}>
                      Revocar
                    </Boton>
                  </span>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </Tarjeta>
  )
}

export function EquipoPage() {
  return (
    <div className="max-w-3xl">
      <EncabezadoPagina titulo="Equipo" descripcion="Quién trabaja en el restaurante y qué puede hacer cada uno." />
      <div className="flex flex-col gap-6">
        <Equipo />
        <Invitaciones />
      </div>
    </div>
  )
}
