import { WifiOff } from 'lucide-react'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'

/** Aviso permanente mientras no hay conexión. Es lo único que se pinta de rojo lleno: no se puede pasar por alto. */
export function OfflineBanner() {
  const online = useOnlineStatus()
  if (online) return null
  return (
    <div role="alert" className="sticky top-0 z-40 flex items-center justify-center gap-2 bg-peligro-600 px-4 py-2 text-sm font-bold text-white md:top-0">
      <WifiOff aria-hidden size={16} />
      SIN CONEXIÓN
      <span className="font-medium text-white/85">· Lo que hagas se guarda y se envía al volver</span>
    </div>
  )
}
