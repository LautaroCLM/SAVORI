import { Spinner } from '@/components/ui'
import { useQrSvg } from './useMesasAdmin'

/** QR de una URL. El SVG lo genera la librería `qrcode` localmente (no hay contenido de usuario). */
export function QrImagen({ url, className = 'size-56' }: { url: string; className?: string }) {
  const qr = useQrSvg(url)
  if (qr.isPending) {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        <Spinner />
      </div>
    )
  }
  if (qr.isError) return <p className="text-sm text-red-700">No se pudo generar el QR.</p>
  return <div role="img" aria-label="Código QR de la carta" className={`${className} [&>svg]:size-full`} dangerouslySetInnerHTML={{ __html: qr.data }} />
}
