import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Armchair, LayoutGrid, Printer, QrCode, Trash2 } from 'lucide-react'
import { useUsuario } from '@/features/auth/useContexto'
import { Modal } from '@/components/Modal'
import { useConfirmar } from '@/components/Confirmar'
import { Aviso, Boton, BotonIcono, CargandoSeccion, Campo, EncabezadoPagina, EstadoVacio, Insignia, Pestanas, Punto, Selector, estiloBoton } from '@/components/ui'
import { IconoAgregar, IconoConfirmar, IconoEditar } from '@/components/iconos'
import { mensajeDeError } from '@/lib/errores'
import type { Mesa, Salon } from '@/services/mesas'
import { NuevoPedidoModal } from '@/features/pedidos/NuevoPedidoModal'
import { usePedidosActivos, useSesionesAbiertas } from '@/features/pedidos/usePedidos'
import { EditorMesa } from './EditorMesa'
import { MapaSalon, type InfoMesa } from './MapaSalon'
import { MesaPanel } from './MesaPanel'
import { QrModal } from './QrModal'
import { useMesas, useMoverMesa, useMutacionesMesas, useSalones } from './useMesasAdmin'

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
      className="flex flex-col gap-5"
    >
      <Campo etiqueta="Nombre del salón" id="salon-nombre" required maxLength={60} autoFocus placeholder="Ej: Salón principal, Patio, Terraza" value={nombre} onChange={(e) => setNombre(e.target.value)} />
      {error != null && <Aviso>{mensajeDeError(error)}</Aviso>}
      <Boton type="submit" icono={IconoConfirmar} cargando={guardando}>
        Guardar
      </Boton>
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
      className="flex flex-col gap-5"
    >
      <div className="grid grid-cols-2 gap-3">
        <Campo etiqueta="Número de mesa" id="mesa-numero" type="number" min={1} step={1} required autoFocus value={numero} onChange={(e) => setNumero(e.target.value)} className="cifras" />
        <Campo etiqueta="Personas" id="mesa-capacidad" type="number" min={1} step={1} required value={capacidad} onChange={(e) => setCapacidad(e.target.value)} className="cifras" />
      </div>
      <Selector etiqueta="Salón" id="mesa-salon" value={salonId} onChange={(e) => setSalonId(e.target.value)}>
        {salones.map((s) => (
          <option key={s.id} value={s.id}>
            {s.nombre}
          </option>
        ))}
      </Selector>
      <Selector etiqueta="Forma" id="mesa-forma" value={forma} onChange={(e) => setForma(e.target.value as Forma)}>
        {FORMAS.map((f) => (
          <option key={f.valor} value={f.valor}>
            {f.etiqueta}
          </option>
        ))}
      </Selector>
      {error != null && <Aviso>{mensajeDeError(error)}</Aviso>}
      <Boton type="submit" icono={IconoConfirmar} cargando={guardando}>
        Guardar
      </Boton>
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
  const confirmar = useConfirmar()
  const [seleccion, setSeleccion] = useState<string | null>(null)
  const [dialogo, setDialogo] = useState<Dialogo>(null)
  const [qrDe, setQrDe] = useState<Mesa | null>(null)
  const [vista, setVista] = useState<'mapa' | 'lista'>('mapa')
  const [editando, setEditando] = useState(false)
  const [elegidaId, setElegidaId] = useState<string | null>(null)
  const [panelDe, setPanelDe] = useState<Mesa | null>(null)
  const [pedidoPara, setPedidoPara] = useState<Mesa | null>(null)
  const pedidos = usePedidosActivos()
  const sesiones = useSesionesAbiertas()
  const mover = useMoverMesa()

  if (salones.isPending || mesas.isPending) return <CargandoSeccion />
  if (salones.isError || mesas.isError) return <Aviso titulo="No se pudieron cargar las mesas">{mensajeDeError(salones.error ?? mesas.error)}</Aviso>

  const sal = salones.data
  const mes = mesas.data
  const actual = sal.find((s) => s.id === seleccion) ?? sal[0] ?? null
  const mesasActual = actual ? mes.filter((x) => x.salon_id === actual.id) : []
  const cerrar = () => setDialogo(null)
  const info: Record<string, InfoMesa> = {}
  for (const x of mes) info[x.id] = { activos: 0, listos: 0, total: null }
  for (const p of pedidos.data ?? []) {
    const i = info[p.mesa_id]
    if (i) {
      i.activos += 1
      if (p.estado === 'listo') i.listos += 1
    }
  }
  for (const se of sesiones.data ?? []) {
    const i = info[se.mesa_id]
    if (i) i.total = se.total
  }
  const elegida = mes.find((x) => x.id === elegidaId) ?? null
  const errorAccion = m.eliminarMesa.error ?? m.eliminarSalon.error ?? m.actualizarMesa.error
  const ocupadas = mesasActual.filter((x) => x.estado === 'ocupada').length
  const listos = mesasActual.reduce((s, x) => s + (info[x.id]?.listos ?? 0), 0)

  async function borrarSalon(s: Salon) {
    const cantidad = mes.filter((x) => x.salon_id === s.id).length
    const ok = await confirmar({
      titulo: `Eliminar el salón "${s.nombre}"`,
      mensaje: cantidad > 0 ? `También se eliminan sus ${cantidad} mesa(s) y sus QR impresos dejan de funcionar.` : 'El salón no tiene mesas.',
      confirmar: 'Eliminar salón',
      tono: 'peligro',
    })
    if (ok) m.eliminarSalon.mutate(s.id, { onSuccess: () => setSeleccion(null) })
  }

  async function borrarMesa(x: Mesa) {
    const ok = await confirmar({ titulo: `Eliminar la mesa ${x.numero}`, mensaje: 'Su QR impreso deja de funcionar. Si la mesa tiene pedidos registrados, no se puede eliminar.', confirmar: 'Eliminar mesa', tono: 'peligro' })
    if (ok) m.eliminarMesa.mutate(x.id)
  }

  return (
    <div className="max-w-6xl">
      <EncabezadoPagina
        titulo="Mesas"
        descripcion={
          actual && mesasActual.length > 0 ? (
            <span className="cifras inline-flex flex-wrap items-center gap-x-4 gap-y-1">
              <span className="inline-flex items-center gap-1.5">
                <Punto tono="exito" /> {mesasActual.length - ocupadas} libres
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Punto tono="marca" /> {ocupadas} ocupadas
              </span>
              {listos > 0 && (
                <span className="inline-flex items-center gap-1.5 font-semibold text-exito-600">
                  <Punto tono="exito" vivo /> {listos} {listos === 1 ? 'pedido listo' : 'pedidos listos'} para llevar
                </span>
              )}
            </span>
          ) : (
            'El salón en vivo: tocá una mesa para ver su cuenta, cargar pedidos o cobrar.'
          )
        }
        acciones={
          <>
            {mes.length > 0 && (
              <Link to="/mesas/qr" className={estiloBoton('secundario', 'md', 'gap-2')}>
                <Printer aria-hidden size={18} />
                Imprimir QR
              </Link>
            )}
            {esAdmin && (
              <Boton variante="secundario" icono={IconoAgregar} onClick={() => setDialogo({ tipo: 'salon' })}>
                Salón
              </Boton>
            )}
            {esAdmin && actual && (
              <Boton icono={IconoAgregar} onClick={() => setDialogo({ tipo: 'mesa' })}>
                Mesa
              </Boton>
            )}
          </>
        }
      />

      {errorAccion != null && <Aviso className="mb-4">{mensajeDeError(errorAccion)}</Aviso>}

      {sal.length === 0 ? (
        <EstadoVacio
          icono={Armchair}
          titulo="Todavía no hay salones"
          descripcion={esAdmin ? 'Creá un salón (por ejemplo "Salón principal" o "Patio") y después cargá sus mesas.' : 'Pedile al administrador que cargue los salones y mesas.'}
          accion={
            esAdmin && (
              <Boton icono={IconoAgregar} onClick={() => setDialogo({ tipo: 'salon' })}>
                Crear salón
              </Boton>
            )
          }
        />
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              {sal.length > 1 && <Pestanas etiqueta="Salón" valor={actual?.id ?? ''} onCambiar={(v) => setSeleccion(v)} opciones={sal.map((s) => ({ valor: s.id, etiqueta: s.nombre }))} />}
              {sal.length === 1 && actual && <h2 className="text-lg font-bold">{actual.nombre}</h2>}
              {actual && esAdmin && (
                <div className="flex">
                  <BotonIcono icono={IconoEditar} etiqueta={`Renombrar el salón ${actual.nombre}`} onClick={() => setDialogo({ tipo: 'salon', editar: actual })} />
                  <BotonIcono icono={Trash2} tono="peligro" etiqueta={`Eliminar el salón ${actual.nombre}`} onClick={() => borrarSalon(actual)} />
                </div>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {vista === 'mapa' && esAdmin && mesasActual.length > 0 && (
                <Boton
                  variante={editando ? 'primario' : 'secundario'}
                  tamano="sm"
                  icono={editando ? IconoConfirmar : IconoEditar}
                  onClick={() => {
                    setEditando(!editando)
                    setElegidaId(null)
                  }}
                >
                  {editando ? 'Terminar edición' : 'Editar plano'}
                </Boton>
              )}
              <Pestanas
                etiqueta="Vista"
                valor={vista}
                onCambiar={(v) => {
                  setVista(v)
                  setEditando(false)
                }}
                opciones={[
                  { valor: 'mapa', etiqueta: 'Plano' },
                  { valor: 'lista', etiqueta: 'Lista' },
                ]}
              />
            </div>
          </div>

          {mesasActual.length === 0 ? (
            <EstadoVacio
              icono={LayoutGrid}
              titulo="Este salón todavía no tiene mesas"
              descripcion={esAdmin ? 'Agregá las mesas y después acomodalas en el plano como están en el local.' : undefined}
              accion={
                esAdmin && (
                  <Boton icono={IconoAgregar} onClick={() => setDialogo({ tipo: 'mesa' })}>
                    Agregar mesa
                  </Boton>
                )
              }
            />
          ) : vista === 'mapa' ? (
            <div>
              {editando && <Aviso tono="info" className="mb-3">Arrastrá las mesas para acomodarlas y tocá una para cambiar su tamaño, giro o forma.</Aviso>}
              <MapaSalon
                mesas={mesasActual}
                info={info}
                editando={editando}
                seleccionadaId={editando ? elegidaId : null}
                onSeleccionar={(x) => (editando ? setElegidaId(x.id) : setPanelDe(x))}
                onMover={(x, px, py) => mover.mutate({ id: x.id, x: px, y: py })}
              />
              {mover.isError && <Aviso className="mt-3">{mensajeDeError(mover.error)}</Aviso>}
              {editando && elegida && elegida.salon_id === actual?.id && <EditorMesa mesa={elegida} onCambiar={(cambios) => m.actualizarMesa.mutate({ id: elegida.id, cambios })} />}
            </div>
          ) : (
            <ul className="overflow-hidden rounded-tarjeta border border-borde bg-superficie">
              {mesasActual.map((x) => {
                const ocupada = x.estado === 'ocupada'
                return (
                  <li key={x.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-borde px-5 py-3.5 last:border-b-0">
                    <button type="button" onClick={() => setPanelDe(x)} className="flex min-w-0 flex-1 basis-48 items-center gap-4 text-left">
                      <span className="cifras flex size-11 shrink-0 items-center justify-center rounded-control bg-superficie-2 text-lg font-bold">{x.numero}</span>
                      <span className="min-w-0">
                        <span className="block font-semibold">Mesa {x.numero}</span>
                        <span className="text-sm text-tinta-3">
                          {x.capacidad} personas · {FORMAS.find((f) => f.valor === x.forma)?.etiqueta.toLowerCase()}
                        </span>
                      </span>
                    </button>
                    <Insignia tono={ocupada ? 'marca' : 'exito'} punto>
                      {ocupada ? 'Ocupada' : 'Libre'}
                    </Insignia>
                    <div className="flex">
                      <BotonIcono icono={QrCode} etiqueta={`Ver el QR de la mesa ${x.numero}`} onClick={() => setQrDe(x)} />
                      {esAdmin && <BotonIcono icono={IconoEditar} etiqueta={`Editar la mesa ${x.numero}`} onClick={() => setDialogo({ tipo: 'mesa', editar: x })} />}
                      {esAdmin && <BotonIcono icono={Trash2} tono="peligro" etiqueta={`Eliminar la mesa ${x.numero}`} onClick={() => borrarMesa(x)} />}
                    </div>
                  </li>
                )
              })}
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

      <Modal abierto={dialogo?.tipo === 'mesa'} onCerrar={cerrar} titulo={dialogo?.tipo === 'mesa' && dialogo.editar ? `Editar la mesa ${dialogo.editar.numero}` : 'Nueva mesa'}>
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
                m.crearMesa.mutate(
                  { restaurante_id: usuario.restaurante_id, ...d },
                  {
                    onSuccess: () => {
                      setSeleccion(d.salon_id)
                      cerrar()
                    },
                  },
                )
              }
            }}
          />
        )}
      </Modal>

      <MesaPanel mesa={panelDe ? (mes.find((x) => x.id === panelDe.id) ?? panelDe) : null} onCerrar={() => setPanelDe(null)} onNuevoPedido={(x) => setPedidoPara(x)} onVerQr={(x) => setQrDe(x)} />
      <NuevoPedidoModal abierto={pedidoPara !== null} onCerrar={() => setPedidoPara(null)} mesas={mes} mesaFija={pedidoPara} />
      <QrModal mesa={qrDe ? (mes.find((x) => x.id === qrDe.id) ?? qrDe) : null} esAdmin={esAdmin} onCerrar={() => setQrDe(null)} />
    </div>
  )
}
