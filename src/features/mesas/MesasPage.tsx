import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useUsuario } from '@/features/auth/useContexto'
import { Modal } from '@/components/Modal'
import { Boton, Campo, Spinner } from '@/components/ui'
import { mensajeDeError } from '@/lib/errores'
import type { Mesa, Salon } from '@/services/mesas'
import { QrModal } from './QrModal'
import { useMesas, useMutacionesMesas, useSalones } from './useMesasAdmin'

type Forma = Mesa['forma']
const FORMAS: { valor: Forma; etiqueta: string }[] = [
  { valor: 'cuadrada', etiqueta: 'Cuadrada' },
  { valor: 'redonda', etiqueta: 'Redonda' },
  { valor: 'rectangular', etiqueta: 'Rectangular' },
]

function FormSalon({ inicial, onGuardar, guardando, error }: { inicial?: Salon; onGuardar: (nombre: string) => void; guardando: boolean; error: unknown }) {
  const [nombre, setNombre] = useState(inicial?.nombre ?? '')
  return (
    <form
      onSubmit={(e: FormEvent) => {
        e.preventDefault()
        onGuardar(nombre.trim())
      }}
      className="flex flex-col gap-4"
    >
      <Campo etiqueta="Nombre del salón" id="salon-nombre" required maxLength={60} autoFocus value={nombre} onChange={(e) => setNombre(e.target.value)} />
      {error != null && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{mensajeDeError(error)}</p>}
      <Boton type="submit" cargando={guardando}>Guardar</Boton>
    </form>
  )
}

interface DatosMesa {
  salon_id: string
  numero: number
  capacidad: number
  forma: Forma
}

function FormMesa({
  inicial,
  salones,
  salonPorDefecto,
  numeroSugerido,
  onGuardar,
  guardando,
  error,
}: {
  inicial?: Mesa
  salones: Salon[]
  salonPorDefecto: string
  numeroSugerido: number
  onGuardar: (d: DatosMesa) => void
  guardando: boolean
  error: unknown
}) {
  const [salonId, setSalonId] = useState(inicial?.salon_id ?? salonPorDefecto)
  const [numero, setNumero] = useState(String(inicial?.numero ?? numeroSugerido))
  const [capacidad, setCapacidad] = useState(String(inicial?.capacidad ?? 4))
  const [forma, setForma] = useState<Forma>(inicial?.forma ?? 'cuadrada')
  return (
    <form
      onSubmit={(e: FormEvent) => {
        e.preventDefault()
        onGuardar({ salon_id: salonId, numero: Number(numero), capacidad: Number(capacidad), forma })
      }}
      className="flex flex-col gap-4"
    >
      <div className="grid grid-cols-2 gap-3">
        <Campo etiqueta="Número de mesa" id="mesa-numero" type="number" min={1} step={1} required autoFocus value={numero} onChange={(e) => setNumero(e.target.value)} />
        <Campo etiqueta="Capacidad (personas)" id="mesa-capacidad" type="number" min={1} step={1} required value={capacidad} onChange={(e) => setCapacidad(e.target.value)} />
      </div>
      <label className="flex flex-col gap-1.5 text-left text-sm font-medium text-stone-700">
        Salón
        <select value={salonId} onChange={(e) => setSalonId(e.target.value)} className="h-11 rounded-lg border border-stone-300 bg-white px-3 text-base outline-none focus:border-marca-600">
          {salones.map((s) => (
            <option key={s.id} value={s.id}>{s.nombre}</option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1.5 text-left text-sm font-medium text-stone-700">
        Forma
        <select value={forma} onChange={(e) => setForma(e.target.value as Forma)} className="h-11 rounded-lg border border-stone-300 bg-white px-3 text-base outline-none focus:border-marca-600">
          {FORMAS.map((f) => (
            <option key={f.valor} value={f.valor}>{f.etiqueta}</option>
          ))}
        </select>
      </label>
      {error != null && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{mensajeDeError(error)}</p>}
      <Boton type="submit" cargando={guardando}>Guardar</Boton>
    </form>
  )
}

type Dialogo = { tipo: 'salon'; editar?: Salon } | { tipo: 'mesa'; editar?: Mesa } | null

export function MesasPage() {
  const usuario = useUsuario()
  const esAdmin = usuario.rol === 'admin'
  const salones = useSalones()
  const mesas = useMesas()
  const m = useMutacionesMesas()
  const [seleccion, setSeleccion] = useState<string | null>(null)
  const [dialogo, setDialogo] = useState<Dialogo>(null)
  const [qrDe, setQrDe] = useState<Mesa | null>(null)

  if (salones.isPending || mesas.isPending) return <div className="flex justify-center py-20"><Spinner className="size-8" /></div>
  if (salones.isError || mesas.isError) return <p className="rounded-lg bg-red-50 p-4 text-red-700">{mensajeDeError(salones.error ?? mesas.error)}</p>

  const sal = salones.data
  const mes = mesas.data
  const actual = sal.find((s) => s.id === seleccion) ?? sal[0] ?? null
  const mesasActual = actual ? mes.filter((x) => x.salon_id === actual.id) : []
  const cerrar = () => setDialogo(null)
  const errorAccion = m.eliminarMesa.error ?? m.eliminarSalon.error ?? m.actualizarMesa.error

  function borrarSalon(s: Salon) {
    const cantidad = mes.filter((x) => x.salon_id === s.id).length
    const aviso = cantidad > 0 ? `Se van a eliminar también sus ${cantidad} mesa(s) y sus QR. ` : ''
    if (window.confirm(`${aviso}¿Eliminar el salón "${s.nombre}"?`)) {
      m.eliminarSalon.mutate(s.id, { onSuccess: () => setSeleccion(null) })
    }
  }

  function borrarMesa(x: Mesa) {
    if (window.confirm(`¿Eliminar la mesa ${x.numero}? Su QR dejará de funcionar.`)) m.eliminarMesa.mutate(x.id)
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-stone-900">Mesas</h1>
        <div className="flex flex-wrap gap-2">
          {mes.length > 0 && (
            <Link to="/mesas/qr" className="inline-flex h-11 items-center rounded-lg border border-stone-300 bg-white px-4 text-sm font-semibold text-stone-700 hover:bg-stone-100">
              Imprimir todos los QR
            </Link>
          )}
          {esAdmin && <Boton variante="secundario" onClick={() => setDialogo({ tipo: 'salon' })}>+ Salón</Boton>}
          {esAdmin && actual && <Boton onClick={() => setDialogo({ tipo: 'mesa' })}>+ Mesa</Boton>}
        </div>
      </div>
      {errorAccion != null && <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{mensajeDeError(errorAccion)}</p>}

      {sal.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-stone-300 bg-white p-10 text-center">
          <p className="font-semibold text-stone-800">Todavía no hay salones</p>
          <p className="mt-1 text-sm text-stone-500">
            {esAdmin ? 'Creá un salón (por ejemplo "Salón principal" o "Patio") y cargá sus mesas.' : 'Pedile al administrador que cargue los salones y mesas.'}
          </p>
          {esAdmin && <Boton className="mt-4" onClick={() => setDialogo({ tipo: 'salon' })}>Crear salón</Boton>}
        </div>
      ) : (
        <>
          <div role="tablist" className="mt-6 flex gap-2 overflow-x-auto overflow-y-hidden border-b border-stone-200">
            {sal.map((s) => (
              <button
                key={s.id}
                role="tab"
                aria-selected={s.id === actual?.id}
                onClick={() => setSeleccion(s.id)}
                className={`-mb-px shrink-0 border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors ${
                  s.id === actual?.id ? 'border-marca-600 text-marca-600' : 'border-transparent text-stone-500 hover:text-stone-800'
                }`}
              >
                {s.nombre}
              </button>
            ))}
          </div>

          {actual && esAdmin && (
            <div className="mt-3 flex gap-2 text-sm">
              <button onClick={() => setDialogo({ tipo: 'salon', editar: actual })} className="text-stone-500 underline hover:text-stone-800">Renombrar salón</button>
              <button onClick={() => borrarSalon(actual)} className="text-stone-500 underline hover:text-stone-800">Eliminar salón</button>
            </div>
          )}

          {mesasActual.length === 0 ? (
            <p className="mt-6 rounded-xl border border-dashed border-stone-300 bg-white p-8 text-center text-sm text-stone-500">Este salón todavía no tiene mesas.</p>
          ) : (
            <ul className="mt-5 grid grid-cols-[repeat(auto-fill,minmax(15rem,1fr))] gap-4">
              {mesasActual.map((x) => (
                <li key={x.id} className="flex flex-col gap-3 rounded-xl bg-white p-4 shadow-sm ring-1 ring-stone-200">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-lg font-bold">Mesa {x.numero}</p>
                      <p className="text-sm text-stone-500">{x.capacidad} personas · {FORMAS.find((f) => f.valor === x.forma)?.etiqueta.toLowerCase()}</p>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${x.estado === 'ocupada' ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'}`}>
                      {x.estado === 'ocupada' ? 'Ocupada' : 'Libre'}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Boton className="h-9" onClick={() => setQrDe(x)}>Ver QR</Boton>
                    {esAdmin && <Boton variante="secundario" className="h-9" onClick={() => setDialogo({ tipo: 'mesa', editar: x })}>Editar</Boton>}
                    {esAdmin && <Boton variante="secundario" className="h-9" onClick={() => borrarMesa(x)}>Eliminar</Boton>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      <Modal abierto={dialogo?.tipo === 'salon'} onCerrar={cerrar} titulo={dialogo?.tipo === 'salon' && dialogo.editar ? 'Renombrar salón' : 'Nuevo salón'}>
        {dialogo?.tipo === 'salon' && (
          <FormSalon
            inicial={dialogo.editar}
            guardando={m.crearSalon.isPending || m.actualizarSalon.isPending}
            error={m.crearSalon.error ?? m.actualizarSalon.error}
            onGuardar={(nombre) => {
              if (dialogo.editar) {
                m.actualizarSalon.mutate({ id: dialogo.editar.id, cambios: { nombre } }, { onSuccess: cerrar })
              } else {
                const orden = Math.max(0, ...sal.map((s) => s.orden)) + 1
                m.crearSalon.mutate({ restaurante_id: usuario.restaurante_id, nombre, orden }, { onSuccess: cerrar })
              }
            }}
          />
        )}
      </Modal>

      <Modal abierto={dialogo?.tipo === 'mesa'} onCerrar={cerrar} titulo={dialogo?.tipo === 'mesa' && dialogo.editar ? 'Editar mesa' : 'Nueva mesa'}>
        {dialogo?.tipo === 'mesa' && actual && (
          <FormMesa
            inicial={dialogo.editar}
            salones={sal}
            salonPorDefecto={actual.id}
            numeroSugerido={Math.max(0, ...mes.map((x) => x.numero)) + 1}
            guardando={m.crearMesa.isPending || m.actualizarMesa.isPending}
            error={m.crearMesa.error ?? m.actualizarMesa.error}
            onGuardar={(d) => {
              if (dialogo.editar) {
                m.actualizarMesa.mutate({ id: dialogo.editar.id, cambios: d }, { onSuccess: cerrar })
              } else {
                m.crearMesa.mutate({ restaurante_id: usuario.restaurante_id, ...d }, { onSuccess: () => { setSeleccion(d.salon_id); cerrar() } })
              }
            }}
          />
        )}
      </Modal>

      <QrModal mesa={qrDe ? (mes.find((x) => x.id === qrDe.id) ?? qrDe) : null} esAdmin={esAdmin} onCerrar={() => setQrDe(null)} />
    </div>
  )
}
