import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Modal } from '@/components/Modal'
import { Boton } from '@/components/ui'
import { mensajeDeError } from '@/lib/errores'
import { urlCartaDeMesa, type Mesa } from '@/services/mesas'
import { QrImagen } from './QrImagen'
import { useMutacionesMesas, useQrSvg } from './useMesasAdmin'

export function QrModal({ mesa, esAdmin, onCerrar }: { mesa: Mesa | null; esAdmin: boolean; onCerrar: () => void }) {
  const { regenerarQr } = useMutacionesMesas()
  const [copiado, setCopiado] = useState(false)
  const url = mesa ? urlCartaDeMesa(mesa.qr_token) : ''
  const qr = useQrSvg(url)

  async function copiar() {
    try {
      await navigator.clipboard.writeText(url)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 1500)
    } catch {
      /* sin permiso de portapapeles: la URL queda visible igual */
    }
  }

  function descargar() {
    if (!qr.data || !mesa) return
    const blob = new Blob([qr.data], { type: 'image/svg+xml' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `qr-mesa-${mesa.numero}.svg`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  function regenerar() {
    if (!mesa) return
    if (window.confirm('Esto invalida el QR impreso de esta mesa: tendrás que imprimir y reemplazar el nuevo. ¿Continuar?')) {
      regenerarQr.mutate(mesa.id)
    }
  }

  return (
    <Modal abierto={mesa !== null} onCerrar={onCerrar} titulo={mesa ? `QR de la mesa ${mesa.numero}` : ''} ancho="max-w-sm">
      {mesa && (
        <div className="flex flex-col items-center gap-4">
          <QrImagen url={url} className="size-60 rounded-xl ring-1 ring-stone-200" />
          <p className="max-w-full break-all text-center text-xs text-stone-500">{url}</p>
          {regenerarQr.isError && <p role="alert" className="text-sm text-red-700">{mensajeDeError(regenerarQr.error)}</p>}
          <div className="grid w-full grid-cols-2 gap-2">
            <Boton variante="secundario" onClick={copiar}>{copiado ? '¡Copiado!' : 'Copiar link'}</Boton>
            <Boton variante="secundario" onClick={descargar}>Descargar SVG</Boton>
            <Link
              to={`/mesas/qr?mesa=${mesa.id}`}
              className="col-span-2 inline-flex h-11 items-center justify-center rounded-lg bg-marca-600 px-4 text-sm font-semibold text-white hover:bg-marca-700"
            >
              Imprimir este QR
            </Link>
          </div>
          {esAdmin && (
            <button onClick={regenerar} disabled={regenerarQr.isPending} className="text-xs text-stone-500 underline hover:text-stone-800">
              Regenerar QR (invalida el impreso)
            </button>
          )}
        </div>
      )}
    </Modal>
  )
}
