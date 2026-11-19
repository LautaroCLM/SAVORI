import { useState } from 'react'
import { CircleAlert, CircleCheck, CloudUpload, RefreshCw } from 'lucide-react'
import { Modal } from '@/components/Modal'
import { useConfirmar } from '@/components/Confirmar'
import { Boton, Insignia } from '@/components/ui'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { formatearFechaHora } from '@/lib/formato'
import { useOffline } from './OfflineProvider'

const ENLACE = 'font-semibold underline decoration-current/40 underline-offset-2 hover:decoration-current'

/**
 * Franjas bajo el aviso SIN CONEXIÓN: operaciones que esperan para enviarse, las que el servidor
 * rechazó y el aviso de "se enviaron N". Desde acá se ve el detalle y se reintenta o descarta cada una.
 */
export function EstadoSincronizacion() {
  const { pendientes, conError, sincronizando, recienEnviadas, enviarAhora, reintentar, descartar, dismissEnviadas } = useOffline()
  const online = useOnlineStatus()
  const confirmar = useConfirmar()
  const [abierto, setAbierto] = useState(false)

  if (pendientes.length === 0 && conError.length === 0 && recienEnviadas === 0) return null

  async function descartarPendiente(id: string) {
    if (await confirmar({ titulo: 'Descartar la operación', mensaje: 'No se va a enviar al servidor y no se puede recuperar.', confirmar: 'Descartar', tono: 'peligro' })) descartar(id)
  }

  return (
    <>
      {pendientes.length > 0 && (
        <div role="status" className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-marca-200 bg-marca-50 px-4 py-2.5 text-sm text-marca-800 md:px-8 lg:px-10">
          {sincronizando ? <RefreshCw aria-hidden size={16} className="motion-safe:animate-spin" /> : <CloudUpload aria-hidden size={16} />}
          <span className="font-bold">
            {pendientes.length} {pendientes.length === 1 ? 'operación por enviar' : 'operaciones por enviar'}
          </span>
          <span>{sincronizando ? 'Enviando…' : online ? 'Se envían en unos segundos.' : 'Se envían solas cuando vuelva la conexión.'}</span>
          <span className="ml-auto flex gap-4">
            {online && !sincronizando && (
              <button onClick={enviarAhora} className={ENLACE}>
                Enviar ahora
              </button>
            )}
            <button onClick={() => setAbierto(true)} className={ENLACE}>
              Ver detalle
            </button>
          </span>
        </div>
      )}

      {conError.length > 0 && (
        <div role="alert" className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-peligro-500/25 bg-peligro-50 px-4 py-2.5 text-sm text-peligro-600 md:px-8 lg:px-10">
          <CircleAlert aria-hidden size={16} />
          <span className="font-bold">{conError.length === 1 ? 'Una operación no se pudo enviar' : `${conError.length} operaciones no se pudieron enviar`}</span>
          <button onClick={() => setAbierto(true)} className={`ml-auto ${ENLACE}`}>
            Revisar
          </button>
        </div>
      )}

      {recienEnviadas > 0 && (
        <div role="status" className="flex items-center gap-3 border-b border-exito-500/25 bg-exito-50 px-4 py-2.5 text-sm text-exito-600 md:px-8 lg:px-10">
          <CircleCheck aria-hidden size={16} />
          <span className="font-bold">Se {recienEnviadas === 1 ? 'envió 1 operación pendiente' : `enviaron ${recienEnviadas} operaciones pendientes`}.</span>
          <button onClick={dismissEnviadas} className={`ml-auto ${ENLACE}`}>
            Cerrar
          </button>
        </div>
      )}

      <Modal abierto={abierto} onCerrar={() => setAbierto(false)} titulo="Operaciones sin enviar" descripcion="Se envían en orden. Las rechazadas por el servidor esperan tu decisión." ancho="max-w-xl">
        <div className="flex flex-col gap-5">
          {pendientes.length === 0 && conError.length === 0 && <p className="text-sm text-tinta-2">No hay nada pendiente.</p>}

          {conError.length > 0 && (
            <section>
              <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-tinta">
                No se pudieron enviar <Insignia tono="peligro">{conError.length}</Insignia>
              </h3>
              <ul className="divide-y divide-borde overflow-hidden rounded-control border border-borde">
                {conError.map((o) => (
                  <li key={o.id} className="flex flex-col gap-2 p-3.5">
                    <p className="text-sm font-semibold break-words">{o.descripcion}</p>
                    <p className="text-sm text-peligro-600">El servidor la rechazó: {o.error ?? 'error desconocido'}</p>
                    <div className="flex gap-2">
                      <Boton variante="secundario" tamano="sm" icono={RefreshCw} onClick={() => reintentar(o.id)}>
                        Reintentar
                      </Boton>
                      <Boton variante="fantasma" tamano="sm" onClick={() => descartar(o.id)}>
                        Descartar
                      </Boton>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {pendientes.length > 0 && (
            <section>
              <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-tinta">
                Esperando conexión <Insignia tono="marca">{pendientes.length}</Insignia>
              </h3>
              <ul className="divide-y divide-borde overflow-hidden rounded-control border border-borde">
                {pendientes.map((o) => (
                  <li key={o.id} className="flex items-start gap-3 p-3.5">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold break-words">{o.descripcion}</p>
                      <p className="cifras mt-0.5 text-xs text-tinta-3">
                        Hecha {formatearFechaHora(new Date(o.creadaEn))}
                        {o.intentos > 0 ? ` · ${o.intentos} intento(s)` : ''}
                      </p>
                    </div>
                    <Boton variante="fantasma" tamano="sm" onClick={() => descartarPendiente(o.id)}>
                      Descartar
                    </Boton>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </Modal>
    </>
  )
}
