import { QueryClient } from '@tanstack/react-query'
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'

const UN_DIA = 24 * 60 * 60 * 1000

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
      gcTime: UN_DIA, // tiene que ser >= al maxAge de la persistencia para poder restaurar
    },
    mutations: {
      retry: 0,
      // Sin conexión las mutaciones TIENEN que ejecutarse: es el servicio quien decide encolarlas.
      // (Con el modo por defecto, TanStack las pausaría y la cola offline nunca se enteraría.)
      networkMode: 'always',
    },
  },
})

// --- Caché de lectura persistente (para abrir la app sin conexión y ver lo último sincronizado) ---

const CLAVE_CACHE = 'savori:cache'
const CLAVE_DUENO = 'savori:cache-usuario'

/** Solo se persisten datos del restaurante del usuario (nunca la carta pública ni los QR). */
const PERSISTIDAS = new Set(['contexto', 'pedidos', 'mesas', 'salones', 'sesiones', 'categorias', 'productos'])

export const persister = createSyncStoragePersister({ storage: window.localStorage, key: CLAVE_CACHE, throttleTime: 1000 })

export const opcionesPersistencia = {
  persister,
  maxAge: UN_DIA,
  buster: 'v1', // subir si cambia la forma de los datos guardados
  dehydrateOptions: {
    shouldDehydrateQuery: (q: { state: { status: string }; queryKey: readonly unknown[] }) =>
      q.state.status === 'success' && PERSISTIDAS.has(String(q.queryKey[0])),
  },
}

/** Borra la caché en memoria y la guardada (al cerrar sesión o si entra otro usuario). */
export function limpiarCache() {
  queryClient.clear()
  try {
    window.localStorage.removeItem(CLAVE_CACHE)
    window.localStorage.removeItem(CLAVE_DUENO)
  } catch {
    /* almacenamiento bloqueado */
  }
}

/** Registra de quién es la caché guardada; si es de otro usuario, la borra. */
export function reclamarCache(usuarioId: string) {
  try {
    const dueno = window.localStorage.getItem(CLAVE_DUENO)
    if (dueno && dueno !== usuarioId) limpiarCache()
    window.localStorage.setItem(CLAVE_DUENO, usuarioId)
  } catch {
    /* almacenamiento bloqueado */
  }
}
