import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Printer } from 'lucide-react'
import { Modal } from '@/components/Modal'
import { useConfirmar } from '@/components/Confirmar'
import { Aviso, Boton, estiloBoton } from '@/components/ui'
import { IconoCopiar, IconoDescargar, IconoExito, IconoRegenerar } from '@/components/iconos'
import { mensajeDeError } from '@/lib/errores'
import { urlCartaDeMesa, type Mesa } from '@/services/mesas'
import { QrImagen } from './QrImagen'
import { useMutacionesMesas, useQrSvg } from './useMesasAdmin'

export function QrModal({ mesa, esAdmin, onCerrar }: { mesa: Mesa | null; esAdmin: boolean; onCerrar: () => void }) {
  const { regenerarQr } = useMutacionesMesas()
  const [copiado, setCopiado] = useState(false)
  const url = mesa ? urlCartaDeMesa(mesa.qr_token) : ''
  const qr = useQrSvg(url)
  const confirmar = useConfirmar()

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

  async function regenerar() {
    if (!mesa) return
    const ok = await confirmar({
      titulo: `Regenerar el QR de la mesa ${mesa.numero}`,
      mensaje: 'El QR impreso actual deja de funcionar al instante. Vas a tener que imprimir el nuevo y reemplazarlo en la mesa.',
      confirmar: 'Regenerar QR',
      tono: 'peligro',
    })
    if (ok) regenerarQr.mutate(mesa.id)
  }

  return (
    <Modal abierto={mesa !== null} onCerrar={onCerrar} titulo={mesa ? `QR de la mesa ${mesa.numero}` : ''} descripcion="Lleva a la carta de esta mesa para que el cliente pida." ancho="max-w-sm">
      {mesa && (
        <div className="flex flex-col items-center gap-4">
          <QrImagen url={url} className="size-60 rounded-tarjeta border border-borde p-2" />
          <p className="cifras max-w-full text-center text-xs break-all text-tinta-3">{url}</p>
          {regenerarQr.isError && <Aviso className="w-full">{mensajeDeError(regenerarQr.error)}</Aviso>}
          <div className="grid w-full grid-cols-2 gap-2">
            <Boton variante="secundario" icono={copiado ? IconoExito : IconoCopiar} onClick={copiar}>
              {copiado ? 'Copiado' : 'Copiar link'}
            </Boton>
            <Boton variante="secundario" icono={IconoDescargar} onClick={descargar}>
              Descargar
            </Boton>
            <Link to={`/mesas/qr?mesa=${mesa.id}`} className={estiloBoton('primario', 'md', 'col-span-2 gap-2')}>
              <Printer aria-hidden size={18} />
              Imprimir este QR
            </Link>
          </div>
          {esAdmin && (
            <Boton variante="fantasma" tamano="sm" icono={IconoRegenerar} onClick={regenerar} cargando={regenerarQr.isPending}>
              Regenerar QR
            </Boton>
          )}
        </div>
      )}
    </Modal>
  )
}
