import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useUsuario } from '@/features/auth/useContexto'
import { Modal } from '@/components/Modal'
import { BookOpen, EyeOff, Trash2 } from 'lucide-react'
import { useConfirmar } from '@/components/Confirmar'
import { AreaTexto, Aviso, Boton, BotonIcono, CargandoSeccion, Campo, EncabezadoPagina, EstadoVacio, Interruptor, Selector, Tarjeta } from '@/components/ui'
import { IconoAgregar, IconoBajar, IconoConfirmar, IconoEditar, IconoMostrar, IconoOcultar, IconoSubir } from '@/components/iconos'
import { cn } from '@/lib/utils'
import { formatearPrecio } from '@/lib/formato'
import { mensajeDeError } from '@/lib/errores'
import type { Categoria, Producto } from '@/services/carta'
import { liberarImagen } from '@/services/imagenes'
import { CampoImagen } from './CampoImagen'
import { useCategorias, useMutacionesCarta, useProductos } from './useCartaAdmin'

// --- Formularios ------------------------------------------------------------

function FormCategoria({
  inicial,
  onGuardar,
  guardando,
  error,
}: {
  inicial?: Categoria
  onGuardar: (nombre: string) => void
  guardando: boolean
  error: unknown
}) {
  const [nombre, setNombre] = useState(inicial?.nombre ?? '')
  function enviar(e: FormEvent) {
    e.preventDefault()
    onGuardar(nombre.trim())
  }
  return (
    <form onSubmit={enviar} className="flex flex-col gap-5">
      <Campo etiqueta="Nombre de la categoría" id="cat-nombre" required maxLength={60} autoFocus placeholder="Ej: Entradas, Pastas, Bebidas" value={nombre} onChange={(e) => setNombre(e.target.value)} />
      {error != null && <Aviso>{mensajeDeError(error)}</Aviso>}
      <Boton type="submit" icono={IconoConfirmar} cargando={guardando}>
        Guardar
      </Boton>
    </form>
  )
}

interface DatosProducto {
  categoria_id: string
  nombre: string
  descripcion: string | null
  precio: number
  costo: number
  disponible: boolean
  imagen_url: string | null
}

function FormProducto({
  inicial,
  categorias,
  categoriaPorDefecto,
  onGuardar,
  guardando,
  error,
}: {
  inicial?: Producto
  categorias: Categoria[]
  categoriaPorDefecto: string
  onGuardar: (datos: DatosProducto) => void
  guardando: boolean
  error: unknown
}) {
  const [categoriaId, setCategoriaId] = useState(inicial?.categoria_id ?? categoriaPorDefecto)
  const [nombre, setNombre] = useState(inicial?.nombre ?? '')
  const [descripcion, setDescripcion] = useState(inicial?.descripcion ?? '')
  const [precio, setPrecio] = useState(inicial ? String(inicial.precio) : '')
  const [costo, setCosto] = useState(inicial ? String(inicial.costo) : '')
  const [disponible, setDisponible] = useState(inicial?.disponible ?? true)
  const [imagen, setImagen] = useState<string | null>(inicial?.imagen_url ?? null)
  const [subiendo, setSubiendo] = useState(false)
  // Fotos subidas mientras el formulario estuvo abierto. Al cerrarlo se piden borrar: el servidor
  // conserva la que haya quedado guardada en el producto y borra el resto (cambios o cancelación).
  const subidas = useRef<string[]>([])
  useEffect(() => {
    const lista = subidas.current
    return () => lista.forEach(liberarImagen)
  }, [])
  function cambiarImagen(url: string | null) {
    if (url && url !== inicial?.imagen_url) subidas.current.push(url)
    setImagen(url)
  }

  function enviar(e: FormEvent) {
    e.preventDefault()
    if (subiendo) return
    onGuardar({
      categoria_id: categoriaId,
      nombre: nombre.trim(),
      descripcion: descripcion.trim() || null,
      precio: Number(precio),
      costo: Number(costo || 0),
      disponible,
      imagen_url: imagen,
    })
  }

  return (
    <form onSubmit={enviar} className="flex flex-col gap-5">
      <Campo etiqueta="Nombre" id="prod-nombre" required maxLength={80} autoFocus value={nombre} onChange={(e) => setNombre(e.target.value)} />
      <AreaTexto etiqueta="Descripción" id="prod-desc" maxLength={200} placeholder="Opcional: ingredientes, porción, acompañamiento" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
      <Selector etiqueta="Categoría" id="prod-cat" value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)}>
        {categorias.map((c) => (
          <option key={c.id} value={c.id}>
            {c.nombre}
          </option>
        ))}
      </Selector>
      <div className="grid grid-cols-2 gap-3">
        <Campo etiqueta="Precio de venta ($)" id="prod-precio" type="number" inputMode="decimal" min={0} step="any" required value={precio} onChange={(e) => setPrecio(e.target.value)} className="cifras" />
        <Campo etiqueta="Costo ($)" id="prod-costo" type="number" inputMode="decimal" min={0} step="any" value={costo} onChange={(e) => setCosto(e.target.value)} className="cifras" />
      </div>
      <p className="-mt-3 text-xs leading-relaxed text-tinta-3">El costo es interno: no aparece en la carta de los clientes. Se usa para calcular las ganancias.</p>
      <CampoImagen url={imagen} onCambiar={cambiarImagen} onSubiendo={setSubiendo} />
      <Interruptor activo={disponible} onCambiar={setDisponible} etiqueta="Disponible en la carta" />
      {error != null && <Aviso>{mensajeDeError(error)}</Aviso>}
      <Boton type="submit" icono={IconoConfirmar} cargando={guardando} disabled={subiendo}>
        Guardar
      </Boton>
    </form>
  )
}

// --- Página -----------------------------------------------------------------

type Dialogo =
  | { tipo: 'categoria'; editar?: Categoria }
  | { tipo: 'producto'; editar?: Producto }
  | null

export function CartaPage() {
  const usuario = useUsuario()
  const categorias = useCategorias()
  const productos = useProductos()
  const m = useMutacionesCarta()
  const [seleccion, setSeleccion] = useState<string | null>(null)
  const [dialogo, setDialogo] = useState<Dialogo>(null)
  const confirmar = useConfirmar()

  if (categorias.isPending || productos.isPending) return <CargandoSeccion />
  if (categorias.isError || productos.isError) {
    return <Aviso titulo="No se pudo cargar la carta">{mensajeDeError(categorias.error ?? productos.error)}</Aviso>
  }

  const cats = categorias.data
  const prods = productos.data
  const actual = cats.find((c) => c.id === seleccion) ?? cats[0] ?? null
  const prodsActual = actual ? prods.filter((p) => p.categoria_id === actual.id) : []
  const cerrar = () => setDialogo(null)

  function moverCategoria(c: Categoria, dir: -1 | 1) {
    const i = cats.findIndex((x) => x.id === c.id)
    const otra = cats[i + dir]
    if (!otra) return
    // Reasigna posiciones consecutivas para que el orden quede siempre bien definido
    const nuevo = [...cats]
    nuevo[i] = otra
    nuevo[i + dir] = c
    nuevo.forEach((cat, idx) => {
      if (cat.orden !== idx + 1) m.actualizarCategoria.mutate({ id: cat.id, cambios: { orden: idx + 1 } })
    })
  }

  async function borrarCategoria(c: Categoria) {
    const cantidad = prods.filter((p) => p.categoria_id === c.id).length
    if (cantidad > 0) {
      await confirmar({
        titulo: `"${c.nombre}" todavía tiene productos`,
        mensaje: `Tiene ${cantidad} producto(s). Movelos a otra categoría o eliminalos antes de borrarla.`,
        confirmar: 'Entendido',
        cancelar: 'Cerrar',
      })
      return
    }
    if (await confirmar({ titulo: `Eliminar la categoría "${c.nombre}"`, mensaje: 'La categoría está vacía; se quita de la carta.', confirmar: 'Eliminar categoría', tono: 'peligro' })) {
      m.eliminarCategoria.mutate(c.id)
    }
  }

  async function borrarProducto(p: Producto) {
    const ok = await confirmar({
      titulo: `Eliminar "${p.nombre}"`,
      mensaje: 'Sale de la carta y del stock. Los pedidos y las ganancias anteriores conservan su registro. Si solo querés pausarlo, apagá "Disponible".',
      confirmar: 'Eliminar producto',
      tono: 'peligro',
    })
    if (ok) m.eliminarProducto.mutate(p.id, { onSuccess: () => liberarImagen(p.imagen_url) })
  }

  const errorAccion = m.actualizarCategoria.error ?? m.eliminarCategoria.error ?? m.actualizarProducto.error ?? m.eliminarProducto.error

  const disponibles = prods.filter((p) => p.disponible).length

  return (
    <div className="max-w-6xl">
      <EncabezadoPagina
        titulo="Carta"
        descripcion={cats.length > 0 ? `${prods.length} productos en ${cats.length} categorías · ${disponibles} disponibles para los clientes` : 'Lo que ven tus clientes al escanear el QR de la mesa.'}
        acciones={
          <Boton variante="secundario" icono={IconoAgregar} onClick={() => setDialogo({ tipo: 'categoria' })}>
            Categoría
          </Boton>
        }
      />
      {errorAccion != null && <Aviso className="mb-4">{mensajeDeError(errorAccion)}</Aviso>}

      {cats.length === 0 ? (
        <EstadoVacio
          icono={BookOpen}
          titulo="Tu carta está vacía"
          descripcion='Creá la primera categoría (por ejemplo "Entradas" o "Bebidas") y después cargá sus productos.'
          accion={
            <Boton icono={IconoAgregar} onClick={() => setDialogo({ tipo: 'categoria' })}>
              Crear categoría
            </Boton>
          }
        />
      ) : (
        <div className="grid gap-6 md:grid-cols-[15rem_1fr]">
          {/* Categorías */}
          <nav aria-label="Categorías" className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1 md:mx-0 md:flex-col md:overflow-visible md:px-0">
            {cats.map((c) => {
              const cantidad = prods.filter((p) => p.categoria_id === c.id).length
              const activa = c.id === actual?.id
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSeleccion(c.id)}
                  aria-current={activa ? 'true' : undefined}
                  className={cn(
                    'flex h-11 shrink-0 items-center gap-2 rounded-control px-3 text-left text-sm font-semibold transition-colors md:shrink',
                    activa ? 'bg-marca-50 text-marca-800' : 'text-tinta-2 hover:bg-superficie-2 hover:text-tinta',
                  )}
                >
                  {!c.activa && <EyeOff aria-label="Oculta" size={15} className="shrink-0 text-tinta-3" />}
                  <span className={cn('min-w-0 flex-1 truncate', !c.activa && 'text-tinta-3')}>{c.nombre}</span>
                  <span className={cn('cifras rounded-full px-2 py-0.5 text-xs', activa ? 'bg-marca-100 text-marca-800' : 'bg-superficie-2 text-tinta-3')}>{cantidad}</span>
                </button>
              )
            })}
          </nav>

          {/* Productos de la categoría */}
          {actual && (
            <Tarjeta
              sinRelleno
              titulo={actual.nombre}
              descripcion={actual.activa ? `${prodsActual.length} productos` : 'Oculta: los clientes no la ven en la carta'}
              acciones={
                <div className="flex flex-wrap items-center gap-1">
                  <BotonIcono icono={IconoSubir} etiqueta="Subir categoría" onClick={() => moverCategoria(actual, -1)} disabled={cats[0]?.id === actual.id} />
                  <BotonIcono icono={IconoBajar} etiqueta="Bajar categoría" onClick={() => moverCategoria(actual, 1)} disabled={cats[cats.length - 1]?.id === actual.id} />
                  <BotonIcono
                    icono={actual.activa ? IconoOcultar : IconoMostrar}
                    etiqueta={actual.activa ? 'Ocultar de la carta' : 'Mostrar en la carta'}
                    onClick={() => m.actualizarCategoria.mutate({ id: actual.id, cambios: { activa: !actual.activa } })}
                  />
                  <BotonIcono icono={IconoEditar} etiqueta="Renombrar categoría" onClick={() => setDialogo({ tipo: 'categoria', editar: actual })} />
                  <BotonIcono icono={Trash2} tono="peligro" etiqueta="Eliminar categoría" onClick={() => borrarCategoria(actual)} />
                  <Boton tamano="sm" icono={IconoAgregar} onClick={() => setDialogo({ tipo: 'producto' })} className="ml-1">
                    Producto
                  </Boton>
                </div>
              }
            >
              {prodsActual.length === 0 ? (
                <div className="px-5 py-10 text-center">
                  <p className="font-semibold">Esta categoría todavía no tiene productos</p>
                  <p className="mt-1 text-sm text-tinta-2">Agregá el primero con su precio y su costo.</p>
                </div>
              ) : (
                <ul className="divide-y divide-borde">
                  {prodsActual.map((p) => {
                    const margen = p.precio > 0 ? (p.precio - p.costo) / p.precio : 0
                    return (
                      <li key={p.id} className="flex flex-wrap items-center gap-x-5 gap-y-2 px-5 py-3.5">
                        {p.imagen_url && <img src={p.imagen_url} alt="" loading="lazy" decoding="async" width={44} height={44} className="size-11 shrink-0 rounded-control border border-borde object-cover" />}
                        <div className="min-w-0 flex-1 basis-52">
                          <p className={cn('font-semibold', !p.disponible && 'text-tinta-3')}>{p.nombre}</p>
                          {p.descripcion && <p className="line-clamp-1 text-sm text-tinta-3">{p.descripcion}</p>}
                        </div>
                        <div className="cifras text-right">
                          <p className="font-bold">{formatearPrecio(p.precio)}</p>
                          {usuario.rol === 'admin' && (
                            <p className="text-xs text-tinta-3">
                              costo {formatearPrecio(p.costo)} · <span className={margen < 0.3 ? 'font-semibold text-marca-700' : ''}>{Math.round(margen * 100)} % margen</span>
                            </p>
                          )}
                        </div>
                        <Interruptor activo={p.disponible} onCambiar={(v) => m.actualizarProducto.mutate({ id: p.id, cambios: { disponible: v } })} etiqueta="Disponible" />
                        <div className="flex">
                          <BotonIcono icono={IconoEditar} etiqueta={`Editar ${p.nombre}`} onClick={() => setDialogo({ tipo: 'producto', editar: p })} />
                          <BotonIcono icono={Trash2} tono="peligro" etiqueta={`Eliminar ${p.nombre}`} onClick={() => borrarProducto(p)} />
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </Tarjeta>
          )}
        </div>
      )}

      {/* Diálogos */}
      <Modal abierto={dialogo?.tipo === 'categoria'} onCerrar={cerrar} titulo={dialogo?.tipo === 'categoria' && dialogo.editar ? 'Renombrar categoría' : 'Nueva categoría'}>
        {dialogo?.tipo === 'categoria' && (
          <FormCategoria
            inicial={dialogo.editar}
            guardando={m.crearCategoria.isPending || m.actualizarCategoria.isPending}
            error={m.crearCategoria.error ?? m.actualizarCategoria.error}
            onGuardar={(nombre) => {
              if (dialogo.editar) {
                m.actualizarCategoria.mutate({ id: dialogo.editar.id, cambios: { nombre } }, { onSuccess: cerrar })
              } else {
                const orden = Math.max(0, ...cats.map((c) => c.orden)) + 1
                m.crearCategoria.mutate({ restaurante_id: usuario.restaurante_id, nombre, orden }, {
                  onSuccess: () => cerrar(),
                })
              }
            }}
          />
        )}
      </Modal>

      <Modal abierto={dialogo?.tipo === 'producto'} onCerrar={cerrar} titulo={dialogo?.tipo === 'producto' && dialogo.editar ? 'Editar producto' : 'Nuevo producto'}>
        {dialogo?.tipo === 'producto' && actual && (
          <FormProducto
            inicial={dialogo.editar}
            categorias={cats}
            categoriaPorDefecto={actual.id}
            guardando={m.crearProducto.isPending || m.actualizarProducto.isPending}
            error={m.crearProducto.error ?? m.actualizarProducto.error}
            onGuardar={(datos) => {
              if (dialogo.editar) {
                const anterior = dialogo.editar.imagen_url
                m.actualizarProducto.mutate(
                  { id: dialogo.editar.id, cambios: datos },
                  {
                    onSuccess: () => {
                      if (anterior !== datos.imagen_url) liberarImagen(anterior)
                      cerrar()
                    },
                  },
                )
              } else {
                const orden = Math.max(0, ...prods.filter((p) => p.categoria_id === datos.categoria_id).map((p) => p.orden)) + 1
                m.crearProducto.mutate({ restaurante_id: usuario.restaurante_id, orden, ...datos }, {
                  onSuccess: () => {
                    setSeleccion(datos.categoria_id)
                    cerrar()
                  },
                })
              }
            }}
          />
        )}
      </Modal>
    </div>
  )
}
