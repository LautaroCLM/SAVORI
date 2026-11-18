import { Link, useSearchParams } from 'react-router-dom'
import { useUsuario } from '@/features/auth/useContexto'
import { Boton, Spinner } from '@/components/ui'
import { mensajeDeError } from '@/lib/errores'
import { urlCartaDeMesa } from '@/services/mesas'
import { QrImagen } from './QrImagen'
import { useMesas } from './useMesasAdmin'

/** Hoja imprimible con el QR de cada mesa (todas, o una con `?mesa=<id>`). */
export function QrImpresionPage() {
  const usuario = useUsuario()
  const [params] = useSearchParams()
  const filtro = params.get('mesa')
  const mesas = useMesas()

  if (mesas.isPending) return <div className="flex justify-center py-20"><Spinner className="size-8" /></div>
  if (mesas.isError) return <p className="rounded-lg bg-red-50 p-4 text-red-700">{mensajeDeError(mesas.error)}</p>

  const lista = mesas.data.filter((m) => !filtro || m.id === filtro)

  return (
    <div className="mx-auto max-w-4xl print:max-w-none">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div>
          <Link to="/mesas" className="text-sm text-stone-500 underline hover:text-stone-800">← Volver a Mesas</Link>
          <h1 className="mt-1 text-2xl font-bold text-stone-900">QR para imprimir</h1>
          <p className="text-sm text-stone-500">Pegá cada QR en su mesa. Si lo regenerás, el impreso anterior deja de funcionar.</p>
        </div>
        <Boton onClick={() => window.print()}>Imprimir</Boton>
      </div>

      {lista.length === 0 ? (
        <p className="text-stone-500">No hay mesas para imprimir.</p>
      ) : (
        <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 print:grid-cols-2 print:gap-4">
          {lista.map((m) => (
            <li key={m.id} className="flex break-inside-avoid flex-col items-center gap-2 rounded-2xl border-2 border-stone-900 bg-white p-6 text-center">
              <p className="text-sm font-semibold tracking-wide text-stone-500 uppercase">{usuario.restaurante_nombre}</p>
              <p className="text-4xl font-extrabold text-stone-900">Mesa {m.numero}</p>
              <QrImagen url={urlCartaDeMesa(m.qr_token)} className="size-52" />
              <p className="text-base font-semibold text-stone-800">Escaneá para ver la carta y pedir</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
