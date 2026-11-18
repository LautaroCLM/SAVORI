import type { Rol } from '@/services/auth'

export interface ItemNav {
  ruta: string
  etiqueta: string
  roles: Rol[]
  icono: string // path SVG (24x24, stroke)
}

export const NAVEGACION: ItemNav[] = [
  {
    ruta: '/mesas',
    etiqueta: 'Mesas',
    roles: ['admin', 'mozo'],
    icono: 'M4 7h16M6 7v11m12-11v11M9 7V5h6v2',
  },
  {
    ruta: '/pedidos',
    etiqueta: 'Pedidos',
    roles: ['admin', 'mozo'],
    icono: 'M9 5h6m-6 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2m-6 7h6m-6 4h4',
  },
  {
    ruta: '/cocina',
    etiqueta: 'Cocina',
    roles: ['admin', 'cocina'],
    icono: 'M6 13.9A4 4 0 0 1 8 6a5 5 0 0 1 8 0 4 4 0 0 1 2 7.9V20H6zM6 17h12',
  },
  {
    ruta: '/carta',
    etiqueta: 'Carta',
    roles: ['admin'],
    icono: 'M4 5a2 2 0 0 1 2-2h12v18H6a2 2 0 0 1-2-2zm4 3h6m-6 4h6',
  },
  {
    ruta: '/stock',
    etiqueta: 'Stock',
    roles: ['admin'],
    icono: 'M21 8 12 3 3 8m18 0-9 5m9-5v8l-9 5m0-8L3 8m9 5v8M3 8v8l9 5',
  },
  {
    ruta: '/equipo',
    etiqueta: 'Equipo',
    roles: ['admin'],
    icono: 'M16 11a3 3 0 1 0 0-6m-8 6a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm0 2c-2.8 0-5 1.8-5 4v1h10v-1c0-2.2-2.2-4-5-4zm8 0c2.8 0 5 1.8 5 4v1h-3',
  },
  {
    ruta: '/ganancias',
    etiqueta: 'Ganancias',
    roles: ['admin'],
    icono: 'M4 19V5m0 14h16M8 15l3-4 3 2 5-6',
  },
]

export function rutaInicial(rol: Rol): string {
  return NAVEGACION.find((item) => item.roles.includes(rol))?.ruta ?? '/'
}
