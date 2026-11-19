import { useState } from 'react'
import { NavLink, Navigate, Outlet, useLocation } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { useUsuario } from '@/features/auth/useContexto'
import { cerrarSesion } from '@/services/auth'
import { Logo } from '@/components/Logo'
import { Modal } from '@/components/Modal'
import { OfflineBanner } from '@/components/OfflineBanner'
import { useConfirmar } from '@/components/Confirmar'
import { IconoMenu, IconoSalir, conRef, useIconoAnimado } from '@/components/iconos'
import { Punto } from '@/components/ui'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { cn } from '@/lib/utils'
import { EstadoSincronizacion } from '@/features/offline/EstadoSincronizacion'
import { OfflineProvider, useOffline } from '@/features/offline/OfflineProvider'
import { useCantidadAlertasStock } from '@/features/stock/useStock'
import { useRealtimeRestaurante } from './useRealtime'
import { GRUPOS, NAVEGACION, rutaInicial, type ItemNav } from './navegacion'

const ETIQUETA_ROL = { admin: 'Administrador', mozo: 'Mozo', cocina: 'Cocina' } as const

/** Contador naranja de alertas (productos agotados o con stock bajo). */
function Alerta({ n, sobreActivo }: { n: number; sobreActivo?: boolean }) {
  if (!n) return null
  return (
    <span
      className={cn('cifras ml-auto rounded-full px-1.5 py-0.5 text-xs leading-none font-bold', sobreActivo ? 'bg-superficie text-marca-700' : 'bg-marca-600 text-white')}
      aria-label={`${n} productos con stock bajo o agotado`}
    >
      {n}
    </span>
  )
}

function EnlaceLateral({ item, aviso, onNavegar }: { item: ItemNav; aviso: number; onNavegar?: () => void }) {
  const { ref, disparadores } = useIconoAnimado()
  const Icono = item.icono
  return (
    <NavLink
      to={item.ruta}
      onClick={onNavegar}
      {...disparadores}
      className={({ isActive }) =>
        cn(
          'flex h-10 items-center gap-3 rounded-control px-3 text-sm font-semibold transition-colors duration-150',
          isActive ? 'bg-marca-600 text-white' : 'text-tinta-2 hover:bg-superficie-2 hover:text-tinta',
        )
      }
    >
      {({ isActive }) => (
        <>
          <span className="icono flex" aria-hidden>
            <Icono {...conRef(ref)} size={18} />
          </span>
          {item.etiqueta}
          <Alerta n={aviso} sobreActivo={isActive} />
        </>
      )}
    </NavLink>
  )
}

/** Navegación agrupada (Servicio / Gestión): la misma en la barra lateral y en el menú móvil. */
function Navegacion({ items, alertasStock, onNavegar }: { items: ItemNav[]; alertasStock: number; onNavegar?: () => void }) {
  return (
    <nav aria-label="Secciones" className="flex flex-col gap-5">
      {GRUPOS.map((g) => {
        const delGrupo = items.filter((i) => i.grupo === g.id)
        if (delGrupo.length === 0) return null
        return (
          <div key={g.id}>
            <p className="mb-1.5 px-3 text-xs font-semibold text-tinta-3">{g.etiqueta}</p>
            <div className="flex flex-col gap-0.5">
              {delGrupo.map((item) => (
                <EnlaceLateral key={item.ruta} item={item} aviso={item.ruta === '/stock' ? alertasStock : 0} onNavegar={onNavegar} />
              ))}
            </div>
          </div>
        )
      })}
    </nav>
  )
}

/** Estado de la conexión y de la sincronización, al pie de la barra lateral. */
function EstadoConexion() {
  const online = useOnlineStatus()
  const { pendientes, conError, sincronizando } = useOffline()
  const [tono, texto] = !online
    ? (['peligro', 'Sin conexión'] as const)
    : conError.length > 0
      ? (['peligro', `${conError.length} sin enviar`] as const)
      : pendientes.length > 0 || sincronizando
        ? (['marca', sincronizando ? 'Sincronizando…' : `${pendientes.length} por enviar`] as const)
        : (['exito', 'En línea'] as const)
  return (
    <p className="flex items-center gap-2 text-xs font-semibold text-tinta-2" role="status">
      <Punto tono={tono} vivo={tono === 'marca'} />
      {texto}
    </p>
  )
}

function BotonSalir({ onSalir, compacto }: { onSalir: () => void; compacto?: boolean }) {
  const { ref, disparadores } = useIconoAnimado()
  return (
    <button
      type="button"
      onClick={onSalir}
      {...disparadores}
      aria-label="Cerrar sesión"
      title="Cerrar sesión"
      className={cn(
        'flex shrink-0 items-center justify-center gap-2 rounded-control text-sm font-semibold text-tinta-2 transition-colors hover:bg-superficie-2 hover:text-tinta',
        compacto ? 'size-10' : 'h-10 px-3',
      )}
    >
      <span className="icono flex" aria-hidden>
        <IconoSalir ref={ref} size={18} />
      </span>
      {!compacto && 'Salir'}
    </button>
  )
}

function BotonMenu({ onAbrir, aviso }: { onAbrir: () => void; aviso: number }) {
  const { ref, disparadores } = useIconoAnimado()
  return (
    <button
      type="button"
      onClick={onAbrir}
      {...disparadores}
      className="relative flex size-11 items-center justify-center rounded-control text-tinta hover:bg-superficie-2"
      aria-label="Abrir el menú de secciones"
    >
      <span className="icono flex" aria-hidden>
        <IconoMenu ref={ref} size={22} />
      </span>
      {aviso > 0 && <Punto tono="marca" className="absolute top-2 right-2" />}
    </button>
  )
}

function DashboardContenido() {
  const usuario = useUsuario()
  const { pendientes, conError } = useOffline()
  const confirmar = useConfirmar()
  const { pathname } = useLocation()
  const [menuAbierto, setMenuAbierto] = useState(false)
  const items = NAVEGACION.filter((item) => item.roles.includes(usuario.rol))
  const salir = useMutation({ mutationFn: cerrarSesion })
  useRealtimeRestaurante(usuario.restaurante_id)
  const alertasStock = useCantidadAlertasStock(usuario.rol === 'admin')
  const actual = items.find((i) => pathname.startsWith(i.ruta))

  async function cerrar() {
    const sinEnviar = pendientes.length + conError.length
    if (
      sinEnviar > 0 &&
      !(await confirmar({
        titulo: 'Hay operaciones sin enviar',
        mensaje: `Tenés ${sinEnviar} operación(es) que todavía no llegaron al servidor. Quedan guardadas en este dispositivo y se envían cuando vuelvas a ingresar con este usuario y haya conexión.`,
        confirmar: 'Cerrar sesión igual',
      }))
    )
      return
    salir.mutate()
  }

  return (
    <div className="min-h-dvh md:grid md:grid-cols-[248px_1fr]">
      {/* Barra lateral (tablet y escritorio) */}
      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-borde bg-superficie md:flex print:hidden!">
        <div className="px-5 pt-6 pb-5">
          <Logo className="h-7" />
        </div>
        <div className="mx-3 mb-6 rounded-control border border-borde px-3 py-2.5">
          <p className="truncate text-sm font-bold text-tinta">{usuario.restaurante_nombre}</p>
          <p className="truncate text-xs text-tinta-3">
            {usuario.nombre} · {ETIQUETA_ROL[usuario.rol]}
          </p>
        </div>
        <div className="flex-1 overflow-y-auto px-3">
          <Navegacion items={items} alertasStock={alertasStock} />
        </div>
        <div className="flex items-center justify-between gap-2 border-t border-borde px-4 py-3">
          <EstadoConexion />
          <BotonSalir onSalir={cerrar} compacto />
        </div>
      </aside>

      <div className="flex min-w-0 flex-col">
        {/* Barra superior (celular) */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-borde bg-superficie/95 px-3 backdrop-blur md:hidden print:hidden">
          <BotonMenu onAbrir={() => setMenuAbierto(true)} aviso={alertasStock} />
          <Logo variante="simbolo" className="h-7" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm leading-tight font-bold">{actual?.etiqueta ?? usuario.restaurante_nombre}</p>
            <p className="truncate text-xs leading-tight text-tinta-3">{usuario.restaurante_nombre}</p>
          </div>
          <EstadoConexion />
        </header>

        <OfflineBanner />
        <EstadoSincronizacion />
        <main className="w-full flex-1 px-4 pt-6 pb-12 md:px-8 md:pt-8 lg:px-10 print:p-0">
          <Outlet />
        </main>
      </div>

      {/* Menú de secciones (celular) */}
      <Modal abierto={menuAbierto} onCerrar={() => setMenuAbierto(false)} titulo={usuario.restaurante_nombre} descripcion={`${usuario.nombre} · ${ETIQUETA_ROL[usuario.rol]}`} ancho="max-w-sm">
        <Navegacion items={items} alertasStock={alertasStock} onNavegar={() => setMenuAbierto(false)} />
        <div className="mt-6 flex items-center justify-between border-t border-borde pt-4">
          <EstadoConexion />
          <BotonSalir onSalir={cerrar} />
        </div>
      </Modal>
    </div>
  )
}

/** `/` → primer módulo permitido para el rol (cocina → /cocina, resto → /mesas). */
export function InicioRedirect() {
  const usuario = useUsuario()
  return <Navigate to={rutaInicial(usuario.rol)} replace />
}

/** Dashboard: layout + cola de operaciones offline del usuario. */
export function DashboardLayout() {
  const usuario = useUsuario()
  return (
    <OfflineProvider usuarioId={usuario.usuario_id}>
      <DashboardContenido />
    </OfflineProvider>
  )
}
