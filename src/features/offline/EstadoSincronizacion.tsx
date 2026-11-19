import { useState } from 'react'
import { Modal } from '@/components/Modal'
import { Boton } from '@/components/ui'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { formatearFechaHora } from '@/lib/formato'
import { useOffline } from './OfflineProvider'

/**
 * Franja bajo el aviso SIN CONEXIÓN: cuántas operaciones esperan para enviarse, cuáles fallaron
 * y el aviso de "se enviaron N". Desde acá se ve el detalle y se reintenta o descarta cada una.
 */
export function EstadoSincronizacion() {
  const { pendientes, conError, sincronizando, recienEnviadas, enviarAhora, reintentar, descartar, dismissEnviadas } = useOffline()
  const online = useOnlineStatus()
  const [abierto, setAbierto] = useState(false)

  if (pendientes.length === 0 && conError.length === 0 && recienEnviadas === 0) return null

  return (
    <>
      {pendientes.length > 0 && (
        <div role="status" className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-amber-300 bg-amber-100 px-4 py-2 text-sm text-amber-950">
          <span aria-hidden>{sincronizando ? '🔄' : '⏳'}</span>
          <span className="font-semibold">
            {pendientes.length} {pendientes.length === 1 ? 'operación pendiente' : 'operaciones pendientes'}
          </span>
          <span className="text-amber-900">
            {sincronizando ? 'Enviando…' : online ? 'Se envían en unos segundos.' : 'Se envían solas cuando vuelva la conexión.'}
          </span>
          <span className="ml-auto flex gap-3">
            {online && !sincronizando && <button onClick={enviarAhora} className="font-semibold underline">Enviar ahora</button>}
            <button onClick={() => setAbierto(true)} className="font-semibold underline">Ver detalle</button>
          </span>
        </div>
      )}

      {conError.length > 0 && (
        <div role="alert" className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-red-300 bg-red-100 px-4 py-2 text-sm text-red-950">
          <span aria-hidden>⚠️</span>
          <span className="font-semibold">
            {conError.length} {conError.length === 1 ? 'operación no se pudo enviar' : 'operaciones no se pudieron enviar'}
          </span>
          <button onClick={() => setAbierto(true)} className="ml-auto font-semibold underline">Revisar</button>
        </div>
      )}

      {recienEnviadas > 0 && (
        <div role="status" className="flex items-center gap-3 border-b border-emerald-300 bg-emerald-100 px-4 py-2 text-sm text-emerald-950">
          <span aria-hidden>✅</span>
          <span className="font-semibold">
            Se {recienEnviadas === 1 ? 'envió 1 operación' : `enviaron ${recienEnviadas} operaciones`} que estaban pendientes.
          </span>
          <button onClick={dismissEnviadas} className="ml-auto underline" aria-label="Cerrar aviso">Cerrar</button>
        </div>
      )}

      <Modal abierto={abierto} onCerrar={() => setAbierto(false)} titulo="Operaciones sin enviar" ancho="max-w-xl">
        <div className="flex flex-col gap-4">
          {pendientes.length === 0 && conError.length === 0 && <p className="text-sm text-stone-500">No hay nada pendiente.</p>}

          {pendientes.length > 0 && (
            <section>
              <h3 className="mb-2 text-xs font-bold tracking-wide text-stone-500 uppercase">Esperando conexión · {pendientes.length}</h3>
              <ul className="divide-y divide-stone-100 rounded-xl border border-stone-200">
                {pendientes.map((o) => (
                  <li key={o.id} className="flex items-start gap-3 p-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium break-words">{o.descripcion}</p>
                      <p className="text-xs text-stone-500">Hecha {formatearFechaHora(new Date(o.creadaEn))}{o.intentos > 0 ? ` · ${o.intentos} intento(s)` : ''}</p>
                    </div>
                    <button
                      onClick={() => window.confirm('¿Descartar esta operación? No se va a enviar.') && descartar(o.id)}
                      className="shrink-0 text-xs text-stone-500 underline hover:text-stone-800"
                    >
                      Descartar
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {conError.length > 0 && (
            <section>
              <h3 className="mb-2 text-xs font-bold tracking-wide text-red-700 uppercase">No se pudieron enviar · {conError.length}</h3>
              <ul className="divide-y divide-stone-100 rounded-xl border border-red-200">
                {conError.map((o) => (
                  <li key={o.id} className="flex flex-col gap-2 p-3">
                    <p className="text-sm font-medium break-words">{o.descripcion}</p>
                    <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-800">El servidor la rechazó: {o.error ?? 'error desconocido'}</p>
                    <div className="flex gap-2">
                      <Boton variante="secundario" className="h-9" onClick={() => reintentar(o.id)}>Reintentar</Boton>
                      <Boton variante="secundario" className="h-9" onClick={() => descartar(o.id)}>Descartar</Boton>
                    </div>
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
