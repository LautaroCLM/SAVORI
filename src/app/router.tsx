import { createBrowserRouter, type RouteObject } from 'react-router-dom'
import { RequireAuth, RequireRol } from './guards'
import { PantallaCargando, PantallaCentrada } from '@/components/ui'

/*
 * Cada pantalla se carga con `lazy` (code splitting): la carta pública que abre
 * el cliente desde el QR no descarga el código del dashboard.
 */
const rutasDashboard: RouteObject[] = [
  {
    index: true,
    lazy: async () => ({ Component: (await import('@/features/dashboard/DashboardLayout')).InicioRedirect }),
  },
  {
    element: <RequireRol roles={['admin', 'mozo']} />,
    children: [
      { path: 'mesas', lazy: async () => ({ Component: (await import('@/features/mesas/MesasPage')).MesasPage }) },
      { path: 'pedidos', lazy: async () => ({ Component: (await import('@/features/pedidos/PedidosPage')).PedidosPage }) },
    ],
  },
  {
    element: <RequireRol roles={['admin', 'cocina']} />,
    children: [
      { path: 'cocina', lazy: async () => ({ Component: (await import('@/features/cocina/CocinaPage')).CocinaPage }) },
    ],
  },
  {
    element: <RequireRol roles={['admin']} />,
    children: [
      { path: 'carta', lazy: async () => ({ Component: (await import('@/features/carta/CartaPage')).CartaPage }) },
      { path: 'stock', lazy: async () => ({ Component: (await import('@/features/stock/StockPage')).StockPage }) },
      { path: 'equipo', lazy: async () => ({ Component: (await import('@/features/equipo/EquipoPage')).EquipoPage }) },
      { path: 'ganancias', lazy: async () => ({ Component: (await import('@/features/ganancias/GananciasPage')).GananciasPage }) },
    ],
  },
]

export const router = createBrowserRouter([
  {
    // Ruta raíz sin path: spinner mientras carga la primera pantalla lazy
    hydrateFallbackElement: <PantallaCargando />,
    children: [
      // --- Público -----------------------------------------------------------
      {
        path: '/m/:token',
        lazy: async () => ({ Component: (await import('@/features/carta-publica/CartaPublicaPage')).CartaPublicaPage }),
      },
      {
        path: '/login',
        lazy: async () => ({ Component: (await import('@/features/auth/LoginPage')).LoginPage }),
      },

      // --- Dashboard (requiere sesión) ---------------------------------------
      {
        element: <RequireAuth />,
        children: [
          {
            path: '/',
            lazy: async () => ({ Component: (await import('@/features/dashboard/DashboardLayout')).DashboardLayout }),
            children: rutasDashboard,
          },
        ],
      },

      {
        path: '*',
        element: (
          <PantallaCentrada>
            <h1 className="text-xl font-bold">Página no encontrada</h1>
            <a href="/" className="font-medium text-marca-600 underline">
              Volver al inicio
            </a>
          </PantallaCentrada>
        ),
      },
    ],
  },
])
