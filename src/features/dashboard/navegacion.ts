import { IconoCarta, IconoCocina, IconoEquipo, IconoGanancias, IconoMesas, IconoPedidos, IconoStock } from '@/components/iconos'
import type { IconoComponente } from '@/components/ui'
import type { Rol } from '@/services/auth'

export interface ItemNav {
  ruta: string
  etiqueta: string
  roles: Rol[]
  icono: IconoComponente
  /** Servicio = lo que se usa en vivo; Gestión = configuración y números. */
  grupo: 'servicio' | 'gestion'
}

export const NAVEGACION: ItemNav[] = [
  { ruta: '/mesas', etiqueta: 'Mesas', roles: ['admin', 'mozo'], icono: IconoMesas, grupo: 'servicio' },
  { ruta: '/pedidos', etiqueta: 'Pedidos', roles: ['admin', 'mozo'], icono: IconoPedidos, grupo: 'servicio' },
  { ruta: '/cocina', etiqueta: 'Cocina', roles: ['admin', 'cocina'], icono: IconoCocina, grupo: 'servicio' },
  { ruta: '/carta', etiqueta: 'Carta', roles: ['admin'], icono: IconoCarta, grupo: 'gestion' },
  { ruta: '/stock', etiqueta: 'Stock', roles: ['admin'], icono: IconoStock, grupo: 'gestion' },
  { ruta: '/equipo', etiqueta: 'Equipo', roles: ['admin'], icono: IconoEquipo, grupo: 'gestion' },
  { ruta: '/ganancias', etiqueta: 'Ganancias', roles: ['admin'], icono: IconoGanancias, grupo: 'gestion' },
]

export const GRUPOS: { id: ItemNav['grupo']; etiqueta: string }[] = [
  { id: 'servicio', etiqueta: 'Servicio' },
  { id: 'gestion', etiqueta: 'Gestión' },
]

export function rutaInicial(rol: Rol): string {
  return NAVEGACION.find((item) => item.roles.includes(rol))?.ruta ?? '/'
}
