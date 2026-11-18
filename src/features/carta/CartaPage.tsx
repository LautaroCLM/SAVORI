import { useState, type FormEvent } from 'react'
import { useUsuario } from '@/features/auth/useContexto'
import { Modal } from '@/components/Modal'
import { Boton, Campo, Spinner } from '@/components/ui'
import { formatearPrecio } from '@/lib/formato'
import { mensajeDeError } from '@/lib/errores'
import type { Categoria, Producto } from '@/services/carta'
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
    <form onSubmit={enviar} className="flex flex-col gap-4">
      <Campo etiqueta="Nombre de la categoría" id="cat-nombre" required maxLength={60} autoFocus value={nombre} onChange={(e) => setNombre(e.target.value)} />
      {error != null && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{mensajeDeError(error)}</p>}
      <Boton type="submit" cargando={guardando}>Guardar</Boton>
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

  function enviar(e: FormEvent) {
    e.preventDefault()
    onGuardar({
      categoria_id: categoriaId,
      nombre: nombre.trim(),
      descripcion: descripcion.trim() || null,
      precio: Number(precio),
      costo: Number(costo || 0),
      disponible,
    })
  }

  return (
    <form onSubmit={enviar} className="flex flex-col gap-4">
      <Campo etiqueta="Nombre" id="prod-nombre" required maxLength={80} autoFocus value={nombre} onChange={(e) => setNombre(e.target.value)} />
      <label className="flex flex-col gap-1.5 text-left text-sm font-medium text-stone-700">
        Descripción (opcional)
        <textarea
          rows={2}
          maxLength={200}
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-base outline-none transition focus:border-marca-600 focus:ring-2 focus:ring-marca-600/20"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-left text-sm font-medium text-stone-700">
        Categoría
        <select
          value={categoriaId}
          onChange={(e) => setCategoriaId(e.target.value)}
          className="h-11 rounded-lg border border-stone-300 bg-white px-3 text-base outline-none focus:border-marca-600"
        >
          {categorias.map((c) => (
            <option key={c.id} value={c.id}>{c.nombre}</option>
          ))}
        </select>
      </label>
      <div className="grid grid-cols-2 gap-3">
        <Campo etiqueta="Precio de venta ($)" id="prod-precio" type="number" inputMode="decimal" min={0} step="any" required value={precio} onChange={(e) => setPrecio(e.target.value)} />
        <Campo etiqueta="Costo ($)" id="prod-costo" type="number" inputMode="decimal" min={0} step="any" value={costo} onChange={(e) => setCosto(e.target.value)} />
      </div>
      <p className="-mt-2 text-xs text-stone-500">El costo es interno: no aparece en la carta de los clientes. Se usa para calcular ganancias.</p>
      <label className="flex items-center gap-2 text-sm font-medium text-stone-700">
        <input type="checkbox" checked={disponible} onChange={(e) => setDisponible(e.target.checked)} className="size-4 accent-marca-600" />
        Disponible en la carta
      </label>
      {error != null && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{mensajeDeError(error)}</p>}
      <Boton type="submit" cargando={guardando}>Guardar</Boton>
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

  if (categorias.isPending || productos.isPending) {
    return <div className="flex justify-center py-20"><Spinner className="size-8" /></div>
  }
  if (categorias.isError || productos.isError) {
    return <p className="rounded-lg bg-red-50 p-4 text-red-700">{mensajeDeError(categorias.error ?? productos.error)}</p>
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

  function borrarCategoria(c: Categoria) {
    const cantidad = prods.filter((p) => p.categoria_id === c.id).length
    if (cantidad > 0) {
      window.alert(`"${c.nombre}" tiene ${cantidad} producto(s). Movelos o eliminalos antes de borrar la categoría.`)
      return
    }
    if (window.confirm(`¿Eliminar la categoría "${c.nombre}"?`)) m.eliminarCategoria.mutate(c.id)
  }

  function borrarProducto(p: Producto) {
    if (window.confirm(`¿Eliminar "${p.nombre}"? Los pedidos anteriores conservan su registro.`)) m.eliminarProducto.mutate(p.id)
  }

  const errorAccion = m.actualizarCategoria.error ?? m.eliminarCategoria.error ?? m.actualizarProducto.error ?? m.eliminarProducto.error

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-stone-900">Carta</h1>
        <Boton onClick={() => setDialogo({ tipo: 'categoria' })}>+ Categoría</Boton>
      </div>
      {errorAccion != null && <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{mensajeDeError(errorAccion)}</p>}

      {cats.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-stone-300 bg-white p-10 text-center">
          <p className="font-semibold text-stone-800">Todavía no hay categorías</p>
          <p className="mt-1 text-sm text-stone-500">Creá la primera (por ejemplo "Entradas" o "Bebidas") y después cargá sus productos.</p>
          <Boton className="mt-4" onClick={() => setDialogo({ tipo: 'categoria' })}>Crear categoría</Boton>
        </div>
      ) : (
        <div className="mt-6 grid gap-6 md:grid-cols-[16rem_1fr]">
          {/* Categorías */}
          <nav aria-label="Categorías" className="flex gap-2 overflow-x-auto md:flex-col md:overflow-visible">
            {cats.map((c) => {
              const cantidad = prods.filter((p) => p.categoria_id === c.id).length
              const activa = c.id === actual?.id
              return (
                <button
                  key={c.id}
                  onClick={() => setSeleccion(c.id)}
                  className={`flex shrink-0 items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left text-sm transition-colors md:shrink ${
                    activa ? 'border-marca-600 bg-marca-50 font-semibold text-stone-900' : 'border-stone-200 bg-white text-stone-700 hover:bg-stone-50'
                  }`}
                >
                  <span className={c.activa ? '' : 'text-stone-400 line-through'}>{c.nombre}</span>
                  <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-500">{cantidad}</span>
                </button>
              )
            })}
          </nav>

          {/* Productos de la categoría */}
          {actual && (
            <section className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="mr-auto text-lg font-bold">{actual.nombre}</h2>
                <Boton variante="secundario" className="h-9" onClick={() => moverCategoria(actual, -1)} aria-label="Mover categoría hacia arriba" disabled={cats[0]?.id === actual.id}>↑</Boton>
                <Boton variante="secundario" className="h-9" onClick={() => moverCategoria(actual, 1)} aria-label="Mover categoría hacia abajo" disabled={cats[cats.length - 1]?.id === actual.id}>↓</Boton>
                <Boton variante="secundario" className="h-9" onClick={() => m.actualizarCategoria.mutate({ id: actual.id, cambios: { activa: !actual.activa } })}>
                  {actual.activa ? 'Ocultar' : 'Mostrar'}
                </Boton>
                <Boton variante="secundario" className="h-9" onClick={() => setDialogo({ tipo: 'categoria', editar: actual })}>Renombrar</Boton>
                <Boton variante="secundario" className="h-9" onClick={() => borrarCategoria(actual)}>Eliminar</Boton>
              </div>
              {!actual.activa && <p className="mt-2 text-sm text-amber-700">Categoría oculta: los clientes no la ven en la carta.</p>}

              <div className="mt-4 flex justify-end">
                <Boton onClick={() => setDialogo({ tipo: 'producto' })}>+ Producto</Boton>
              </div>

              {prodsActual.length === 0 ? (
                <p className="mt-4 rounded-xl border border-dashed border-stone-300 bg-white p-8 text-center text-sm text-stone-500">Esta categoría todavía no tiene productos.</p>
              ) : (
                <ul className="mt-3 divide-y divide-stone-100 overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-stone-200">
                  {prodsActual.map((p) => (
                    <li key={p.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 p-4">
                      <div className="min-w-0 flex-1 basis-48">
                        <p className={`font-semibold ${p.disponible ? 'text-stone-900' : 'text-stone-400'}`}>{p.nombre}</p>
                        {p.descripcion && <p className="line-clamp-1 text-sm text-stone-500">{p.descripcion}</p>}
                      </div>
                      <div className="text-right text-sm tabular-nums">
                        <p className="font-semibold">{formatearPrecio(p.precio)}</p>
                        {usuario.rol === 'admin' && <p className="text-xs text-stone-400">costo {formatearPrecio(p.costo)}</p>}
                      </div>
                      <label className="flex cursor-pointer items-center gap-2 text-xs text-stone-600">
                        <input
                          type="checkbox"
                          checked={p.disponible}
                          onChange={(e) => m.actualizarProducto.mutate({ id: p.id, cambios: { disponible: e.target.checked } })}
                          className="size-4 accent-marca-600"
                        />
                        Disponible
                      </label>
                      <div className="flex gap-2">
                        <Boton variante="secundario" className="h-9" onClick={() => setDialogo({ tipo: 'producto', editar: p })}>Editar</Boton>
                        <Boton variante="secundario" className="h-9" onClick={() => borrarProducto(p)}>Eliminar</Boton>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
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
                m.actualizarProducto.mutate({ id: dialogo.editar.id, cambios: datos }, { onSuccess: cerrar })
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
