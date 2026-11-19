import { useParams } from 'react-router-dom'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useMutation } from '@tanstack/react-query'
import { QrCode, UtensilsCrossed } from 'lucide-react'
import { formatearPrecio } from '@/lib/formato'
import { mensajeDeError } from '@/lib/errores'
import { AreaTexto, Aviso, Boton, ControlCantidad, EstadoVacio, PantallaCargando, PantallaCentrada, Punto } from '@/components/ui'
import { IconoCarrito, IconoEnviar, IconoRegenerar } from '@/components/iconos'
import { Logo } from '@/components/Logo'
import { Modal } from '@/components/Modal'
import { OfflineBanner } from '@/components/OfflineBanner'
import { crearPedidoQr, type ProductoCarta } from '@/services/cartaPublica'
import { useCarta } from './useCarta'

function TarjetaProducto({ producto, cantidad, onCambiar }: { producto: ProductoCarta; cantidad: number; onCambiar: (delta: number) => void }) {
  return (
    <li className="flex gap-4 py-4">
      <div className="flex min-w-0 flex-1 flex-col">
        <h3 className="text-base font-semibold text-tinta">{producto.nombre}</h3>
        {producto.descripcion && <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-tinta-2">{producto.descripcion}</p>}
        <div className="mt-auto flex items-center justify-between gap-3 pt-3">
          <p className="cifras text-base font-bold text-tinta">{formatearPrecio(producto.precio)}</p>
          <ControlCantidad variante="pastilla" cantidad={cantidad} nombre={producto.nombre} onCambiar={onCambiar} />
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
          className="size-24 shrink-0 rounded-tarjeta border border-borde bg-superficie-2 object-cover"
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
          <h1 className="text-xl font-bold">No pudimos abrir la carta</h1>
          <p className="max-w-xs text-tinta-2">{mensajeDeError(carta.error)}</p>
          <Boton icono={IconoRegenerar} onClick={() => carta.refetch()}>
            Reintentar
          </Boton>
        </PantallaCentrada>
      </>
    )
  }

  if (!carta.data) {
    return (
      <PantallaCentrada>
        <span className="grid size-14 place-items-center rounded-full bg-superficie-2 text-tinta-2">
          <QrCode aria-hidden size={26} />
        </span>
        <h1 className="text-xl font-bold">QR no válido</h1>
        <p className="max-w-xs text-tinta-2">Este código no corresponde a ninguna mesa activa. Pedile ayuda al mozo.</p>
      </PantallaCentrada>
    )
  }

  const { restaurante, mesa, categorias } = carta.data

  return (
    <div className="min-h-dvh bg-superficie">
      <OfflineBanner />
      <header className="border-b border-borde px-5 pt-8 pb-5">
        <div className="mx-auto max-w-2xl">
          <span className="inline-flex items-center gap-2 rounded-full bg-marca-50 px-3 py-1 text-sm font-semibold text-marca-800">
            <Punto tono="marca" />
            Mesa {mesa.numero}
          </span>
          <h1 className="mt-3 text-[1.75rem] leading-tight font-bold tracking-[-0.02em] text-tinta">{restaurante.nombre}</h1>
          <p className="mt-1 text-sm text-tinta-2">Elegí lo que quieras y enviá el pedido: llega directo a la cocina.</p>
        </div>
      </header>

      {enviado && (
        <div className="mx-auto max-w-2xl px-5 pt-5">
          <Aviso
            tono="exito"
            titulo="¡Pedido enviado!"
            accion={
              <Boton variante="fantasma" tamano="sm" onClick={() => setEnviado(false)}>
                Cerrar
              </Boton>
            }
          >
            Ya le avisamos a la cocina. Si necesitás algo más, podés seguir pidiendo desde acá.
          </Aviso>
        </div>
      )}

      {categorias.length > 0 && (
        <nav aria-label="Categorías" className="sticky top-0 z-10 border-b border-borde bg-superficie">
          <ul className="sin-barra mx-auto flex max-w-2xl gap-2 overflow-x-auto px-5 py-3">
            {categorias.map((c) => (
              <li key={c.id} className="shrink-0">
                <a
                  href={`#cat-${c.id}`}
                  className="flex h-11 items-center rounded-full border border-borde px-4 text-sm font-semibold text-tinta-2 transition-colors hover:border-borde-fuerte hover:text-tinta active:bg-superficie-2"
                >
                  {c.nombre}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      )}

      <main className={`mx-auto max-w-2xl px-5 ${unidades > 0 ? 'pb-32' : 'pb-16'}`}>
        {categorias.length === 0 ? (
          <EstadoVacio className="mt-8" icono={UtensilsCrossed} titulo="La carta todavía no tiene productos" descripcion="Pedile la carta al mozo mientras tanto." />
        ) : (
          categorias.map((c) => (
            <section key={c.id} id={`cat-${c.id}`} className="scroll-mt-20 pt-8">
              <h2 className="text-xl font-bold tracking-[-0.01em] text-tinta">{c.nombre}</h2>
              <ul className="divide-y divide-borde">
                {c.productos.map((p) => (
                  <TarjetaProducto key={p.id} producto={p} cantidad={cantidades[p.id] ?? 0} onCambiar={(d) => cambiar(p.id, d)} />
                ))}
              </ul>
            </section>
          ))
        )}
      </main>

      <footer className="border-t border-borde px-5 py-8 text-center">
        <p className="text-xs text-tinta-3">Carta digital por</p>
        <Logo className="mx-auto mt-2 h-5 opacity-80" />
      </footer>

      {unidades > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-borde bg-superficie p-4" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
          <div className="mx-auto max-w-2xl">
            <Boton tamano="lg" icono={IconoCarrito} className="w-full text-base" onClick={() => setResumenAbierto(true)}>
              <span className="flex-1 text-left">
                Ver mi pedido · {unidades} {unidades === 1 ? 'producto' : 'productos'}
              </span>
              <span className="cifras">{formatearPrecio(total)}</span>
            </Boton>
          </div>
        </div>
      )}

      <Modal abierto={resumenAbierto} onCerrar={() => setResumenAbierto(false)} titulo="Tu pedido" descripcion={`Mesa ${mesa.numero}`}>
        <form onSubmit={confirmar} className="flex flex-col gap-5">
          <ul className="divide-y divide-borde">
            {lineas.map(([id, c]) => {
              const p = productos.get(id)
              if (!p) return null
              return (
                <li key={id} className="flex items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{p.nombre}</p>
                    <p className="cifras text-xs text-tinta-3">{formatearPrecio(p.precio)} c/u</p>
                  </div>
                  <ControlCantidad variante="pastilla" cantidad={c} nombre={p.nombre} onCambiar={(d) => cambiar(id, d)} />
                </li>
              )
            })}
          </ul>
          <AreaTexto etiqueta="¿Alguna aclaración?" id="qr-notas" maxLength={300} value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Opcional · Ej: sin cebolla, la bebida sin hielo" />
          {enviar.isError && <Aviso>{mensajeDeError(enviar.error)}</Aviso>}
          <div className="flex items-baseline justify-between border-t border-borde pt-4">
            <span className="text-sm font-semibold text-tinta-2">Total</span>
            <span className="cifras text-2xl font-bold tracking-[-0.02em]">{formatearPrecio(total)}</span>
          </div>
          <Boton type="submit" tamano="lg" icono={IconoEnviar} className="text-base" cargando={enviar.isPending} disabled={unidades === 0}>
            Enviar pedido
          </Boton>
          <p className="text-center text-xs text-tinta-3">El total se confirma al cerrar la cuenta con el mozo.</p>
        </form>
      </Modal>
    </div>
  )
}
