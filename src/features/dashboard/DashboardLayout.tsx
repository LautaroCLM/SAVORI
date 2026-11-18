import { NavLink, Navigate, Outlet } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { useUsuario } from '@/features/auth/useContexto'
import { cerrarSesion } from '@/services/auth'
import { OfflineBanner } from '@/components/OfflineBanner'
import { NAVEGACION, rutaInicial, type ItemNav } from './navegacion'

const ETIQUETA_ROL = { admin: 'Administrador', mozo: 'Mozo', cocina: 'Cocina' } as const

function Icono({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="size-5 shrink-0" aria-hidden>
      <path d={d} />
    </svg>
  )
}

function EnlaceNav({ item, compacto }: { item: ItemNav; compacto?: boolean }) {
  return (
    <NavLink
      to={item.ruta}
      className={({ isActive }) =>
        [
          'flex items-center gap-3 rounded-lg text-sm font-medium transition-colors',
          compacto ? 'shrink-0 px-3 py-2' : 'px-3 py-2.5',
          isActive ? 'bg-marca-600 text-white' : 'text-stone-300 hover:bg-stone-800 hover:text-white',
        ].join(' ')
      }
    >
      <Icono d={item.icono} />
      {item.etiqueta}
    </NavLink>
  )
}

export function DashboardLayout() {
  const usuario = useUsuario()
  const items = NAVEGACION.filter((item) => item.roles.includes(usuario.rol))
  const salir = useMutation({ mutationFn: cerrarSesion })

  return (
    <div className="flex min-h-dvh flex-col md:flex-row">
      {/* Sidebar (escritorio) */}
      <aside className="hidden w-60 shrink-0 flex-col bg-stone-900 md:flex">
        <div className="border-b border-stone-800 px-5 py-5">
          <p className="truncate text-base font-bold text-white">{usuario.restaurante_nombre}</p>
          <p className="mt-0.5 truncate text-xs text-stone-400">
            {usuario.nombre} · {ETIQUETA_ROL[usuario.rol]}
          </p>
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-3">
          {items.map((item) => (
            <EnlaceNav key={item.ruta} item={item} />
          ))}
        </nav>
        <div className="border-t border-stone-800 p-3">
          <button
            onClick={() => salir.mutate()}
            disabled={salir.isPending}
            className="w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium text-stone-400 hover:bg-stone-800 hover:text-white"
          >
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Barra superior (móvil) */}
      <header className="bg-stone-900 md:hidden">
        <div className="flex items-center justify-between px-4 pt-3">
          <div className="min-w-0">
            <p className="truncate font-bold text-white">{usuario.restaurante_nombre}</p>
            <p className="truncate text-xs text-stone-400">{usuario.nombre}</p>
          </div>
          <button onClick={() => salir.mutate()} className="shrink-0 text-sm text-stone-400 hover:text-white">
            Salir
          </button>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 py-3">
          {items.map((item) => (
            <EnlaceNav key={item.ruta} item={item} compacto />
          ))}
        </nav>
      </header>

      <div className="flex min-w-0 flex-1 flex-col">
        <OfflineBanner />
        <main className="flex-1 p-4 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

/** `/` → primer módulo permitido para el rol (cocina → /cocina, resto → /mesas). */
export function InicioRedirect() {
  const usuario = useUsuario()
  return <Navigate to={rutaInicial(usuario.rol)} replace />
}
