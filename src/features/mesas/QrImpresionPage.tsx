import { Link, useSearchParams } from 'react-router-dom'
import { useUsuario } from '@/features/auth/useContexto'
import { ArrowLeft, Printer } from 'lucide-react'
import { Logo } from '@/components/Logo'
import { Aviso, Boton, CargandoSeccion, EncabezadoPagina } from '@/components/ui'
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

  if (mesas.isPending) return <CargandoSeccion />
  if (mesas.isError) return <Aviso titulo="No se pudieron cargar las mesas">{mensajeDeError(mesas.error)}</Aviso>

  const lista = mesas.data.filter((m) => !filtro || m.id === filtro)

  return (
    <div className="mx-auto max-w-4xl print:max-w-none">
      <div className="print:hidden">
        <Link to="/mesas" className="mb-3 inline-flex items-center gap-1 text-sm font-semibold text-tinta-2 hover:text-tinta">
          <ArrowLeft aria-hidden size={16} /> Mesas
        </Link>
        <EncabezadoPagina
          titulo="QR para imprimir"
          descripcion="Pegá cada QR en su mesa. Si lo regenerás, el impreso anterior deja de funcionar."
          acciones={
            <Boton icono={Printer} onClick={() => window.print()}>
              Imprimir
            </Boton>
          }
        />
      </div>

      {lista.length === 0 ? (
        <p className="text-tinta-2">No hay mesas para imprimir.</p>
      ) : (
        <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 print:grid-cols-2 print:gap-4">
          {lista.map((m) => (
            <li key={m.id} className="flex break-inside-avoid flex-col items-center gap-2 rounded-tarjeta border-2 border-tinta bg-superficie p-6 text-center">
              <p className="text-base font-bold text-tinta-2">{usuario.restaurante_nombre}</p>
              <p className="cifras text-5xl font-bold tracking-[-0.02em] text-tinta">Mesa {m.numero}</p>
              <QrImagen url={urlCartaDeMesa(m.qr_token)} className="size-52" />
              <p className="text-base font-semibold text-tinta">Escaneá para ver la carta y pedir</p>
              <Logo className="mt-1 h-5" />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
