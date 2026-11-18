import { useOnlineStatus } from '@/hooks/useOnlineStatus'

export function OfflineBanner() {
  const online = useOnlineStatus()
  if (online) return null
  return (
    <div
      role="alert"
      className="sticky top-0 z-50 flex items-center justify-center gap-2 bg-red-600 px-4 py-2 text-sm font-bold tracking-wide text-white"
    >
      <span className="size-2 animate-pulse rounded-full bg-white" aria-hidden />
      SIN CONEXIÓN · Los datos pueden no estar actualizados
    </div>
  )
}
