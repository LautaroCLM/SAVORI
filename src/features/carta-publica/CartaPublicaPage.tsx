import { useParams } from 'react-router-dom'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useMutation } from '@tanstack/react-query'
import { formatearPrecio } from '@/lib/formato'
import { mensajeDeError } from '@/lib/errores'
import { Boton, PantallaCargando, PantallaCentrada } from '@/components/ui'
import { Logo } from '@/components/Logo'
import { Modal } from '@/components/Modal'
import { OfflineBanner } from '@/components/OfflineBanner'
import { crearPedidoQr, type ProductoCarta } from '@/services/cartaPublica'
import { useCarta } from './useCarta'

function Selector({ cantidad, nombre, onCambiar }: { cantidad: number; nombre: string; onCambiar: (delta: number) => void }) {
  if (cantidad === 0) {
    return (
      <button
        type="button"
        onClick={() => onCambiar(1)}
        aria-label={`Agregar ${nombre}`}
        className="h-9 rounded-full border-2 border-marca-600 px-4 text-sm font-bold text-marca-600 active:bg-marca-50"
      >
        Agregar
      </button>
    )
  }
  return (
    <div className="flex items-center gap-1 rounded-full bg-marca-600 text-white">
      <button type="button" onClick={() => onCambiar(-1)} aria-label={`Quitar ${nombre}`} className="size-9 rounded-full text-xl leading-none">−</button>
      <span className="w-5 text-center text-sm font-bold tabular-nums" aria-live="polite">{cantidad}</span>
      <button type="button" onClick={() => onCambiar(1)} aria-label={`Agregar otro ${nombre}`} className="size-9 rounded-full text-xl leading-none">+</button>
    </div>
  )
}

function TarjetaProducto({ producto, cantidad, onCambiar }: { producto: ProductoCarta; cantidad: number; onCambiar: (delta: number) => void }) {
  return (
    <li className="flex gap-4 py-4">
      <div className="flex min-w-0 flex-1 flex-col">
        <h3 className="font-semibold text-stone-900">{producto.nombre}</h3>
        {producto.descripcion && <p className="mt-1 line-clamp-2 text-sm text-stone-500">{producto.descripcion}</p>}
        <div className="mt-2 flex items-center justify-between gap-3">
          <p className="font-semibold text-marca-700 tabular-nums">{formatearPrecio(producto.precio)}</p>
          <Selector cantidad={cantidad} nombre={producto.nombre} onCambiar={onCambiar} />
        </div>
      </div>
      {producto.imagen_url && (
        <img
          src={producto.imagen_url}
          alt={producto.nombre}
          loading="lazy"
          decoding="async"
          width={96}
          height={96}
          className="size-24 shrink-0 rounded-xl bg-stone-100 object-cover"
        />
      )}
    </li>
  )
}

/** Carta pública: /m/:token (el cliente no inicia sesión y puede hacer su pedido). */
export function CartaPublicaPage() {
  const { token } = useParams<{ token: string }>()
  const carta = useCarta(token)
  const [cantidades, setCantidades] = useState<Record<string, number>>({})
  const [notas, setNotas] = useState('')
  const [resumenAbierto, setResumenAbierto] = useState(false)
  const [enviado, setEnviado] = useState(false)

  const enviar = useMutation({
    mutationFn: (items: { producto_id: string; cantidad: number }[]) => crearPedidoQr(token!, items, notas),
    onSuccess: () => {
      setCantidades({})
      setNotas('')
      setResumenAbierto(false)
      setEnviado(true)
    },
  })

  useEffect(() => {
    if (carta.data) document.title = `${carta.data.restaurante.nombre} · Carta`
  }, [carta.data])

  const productos = useMemo(() => new Map(carta.data?.categorias.flatMap((c) => c.productos).map((p) => [p.id, p]) ?? []), [carta.data])
  const lineas = Object.entries(cantidades).filter(([id, c]) => c > 0 && productos.has(id))
  const unidades = lineas.reduce((s, [, c]) => s + c, 0)
  const total = lineas.reduce((s, [id, c]) => s + (productos.get(id)?.precio ?? 0) * c, 0)

  function cambiar(id: string, delta: number) {
    setEnviado(false)
    setCantidades((prev) => ({ ...prev, [id]: Math.max(0, Math.min(50, (prev[id] ?? 0) + delta)) }))
  }

  function confirmar(e: FormEvent) {
    e.preventDefault()
    enviar.mutate(lineas.map(([producto_id, cantidad]) => ({ producto_id, cantidad })))
  }

  if (carta.isPending) return <PantallaCargando />

  if (carta.isError) {
    return (
      <>
        <OfflineBanner />
        <PantallaCentrada>
          <p className="text-stone-600">{mensajeDeError(carta.error)}</p>
          <Boton onClick={() => carta.refetch()}>Reintentar</Boton>
        </PantallaCentrada>
      </>
    )
  }

  if (!carta.data) {
    return (
      <PantallaCentrada>
        <h1 className="text-xl font-bold">QR no válido</h1>
        <p className="max-w-xs text-stone-600">Este código no corresponde a ninguna mesa activa. Pedile ayuda al mozo.</p>
      </PantallaCentrada>
    )
  }

  const { restaurante, mesa, categorias } = carta.data

  return (
    <div className="min-h-dvh bg-white">
      <OfflineBanner />
      <header className="bg-stone-900 px-5 pt-8 pb-6 text-white">
        <div className="mx-auto max-w-2xl">
          <p className="text-xs font-semibold tracking-wider text-marca-100/80 uppercase">Mesa {mesa.numero}</p>
          <h1 className="mt-1 text-2xl font-bold">{restaurante.nombre}</h1>
        </div>
      </header>

      {enviado && (
        <div role="status" className="border-b border-emerald-200 bg-emerald-50 px-5 py-4 text-emerald-900">
          <div className="mx-auto flex max-w-2xl items-start justify-between gap-3">
            <p className="text-sm">
              <b>¡Pedido enviado!</b> Ya le avisamos a la cocina. Si necesitás algo más, podés seguir pidiendo desde acá.
            </p>
            <button onClick={() => setEnviado(false)} aria-label="Cerrar aviso" className="text-emerald-700 underline">Cerrar</button>
          </div>
        </div>
      )}

      {categorias.length > 0 && (
        <nav className="sticky top-0 z-10 border-b border-stone-200 bg-white/95 backdrop-blur">
          <ul className="mx-auto flex max-w-2xl gap-2 overflow-x-auto px-4 py-3">
            {categorias.map((c) => (
              <li key={c.id} className="shrink-0">
                <a href={`#cat-${c.id}`} className="block rounded-full border border-stone-200 px-4 py-1.5 text-sm font-medium text-stone-700 active:bg-stone-100">
                  {c.nombre}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      )}

      <main className={`mx-auto max-w-2xl px-5 ${unidades > 0 ? 'pb-32' : 'pb-16'}`}>
        {categorias.length === 0 ? (
          <p className="py-16 text-center text-stone-500">La carta todavía no tiene productos disponibles.</p>
        ) : (
          categorias.map((c) => (
            <section key={c.id} id={`cat-${c.id}`} className="scroll-mt-16 pt-8">
              <h2 className="text-lg font-bold text-stone-900">{c.nombre}</h2>
              <ul className="divide-y divide-stone-100">
                {c.productos.map((p) => (
                  <TarjetaProducto key={p.id} producto={p} cantidad={cantidades[p.id] ?? 0} onCambiar={(d) => cambiar(p.id, d)} />
                ))}
              </ul>
            </section>
          ))
        )}
      </main>

      <footer className="border-t border-stone-100 px-5 py-8 text-center">
        <p className="text-[11px] tracking-wider text-stone-400 uppercase">Carta digital por</p>
        <Logo className="mx-auto mt-2 h-5 opacity-80" />
      </footer>

      {unidades > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-stone-200 bg-white/95 p-4 backdrop-blur" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
          <div className="mx-auto max-w-2xl">
            <Boton className="h-12 w-full text-base" onClick={() => setResumenAbierto(true)}>
              Ver mi pedido · {unidades} {unidades === 1 ? 'producto' : 'productos'} · {formatearPrecio(total)}
            </Boton>
          </div>
        </div>
      )}

      <Modal abierto={resumenAbierto} onCerrar={() => setResumenAbierto(false)} titulo={`Tu pedido · Mesa ${mesa.numero}`}>
        <form onSubmit={confirmar} className="flex flex-col gap-4">
          <ul className="divide-y divide-stone-100">
            {lineas.map(([id, c]) => {
              const p = productos.get(id)
              if (!p) return null
              return (
                <li key={id} className="flex items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{p.nombre}</p>
                    <p className="text-xs text-stone-500 tabular-nums">{formatearPrecio(p.precio)} c/u</p>
                  </div>
                  <Selector cantidad={c} nombre={p.nombre} onCambiar={(d) => cambiar(id, d)} />
                </li>
              )
            })}
          </ul>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-stone-700">
            ¿Alguna aclaración? (opcional)
            <textarea rows={2} maxLength={300} value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Ej: sin cebolla, la bebida sin hielo" className="rounded-lg border border-stone-300 px-3 py-2 text-base outline-none focus:border-marca-600" />
          </label>
          {enviar.isError && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{mensajeDeError(enviar.error)}</p>}
          <div className="flex items-center justify-between text-base font-bold">
            <span>Total</span>
            <span className="tabular-nums">{formatearPrecio(total)}</span>
          </div>
          <Boton type="submit" className="h-12 text-base" cargando={enviar.isPending} disabled={unidades === 0}>Enviar pedido</Boton>
          <p className="text-center text-xs text-stone-500">El total se confirma al cerrar la cuenta con el mozo.</p>
        </form>
      </Modal>
    </div>
  )
}
