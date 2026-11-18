import { useParams } from 'react-router-dom'
import { useEffect } from 'react'
import { formatearPrecio } from '@/lib/formato'
import { mensajeDeError } from '@/lib/errores'
import { Boton, PantallaCargando, PantallaCentrada } from '@/components/ui'
import { OfflineBanner } from '@/components/OfflineBanner'
import type { ProductoCarta } from '@/services/cartaPublica'
import { useCarta } from './useCarta'

function TarjetaProducto({ producto }: { producto: ProductoCarta }) {
  return (
    <li className="flex gap-4 py-4">
      <div className="min-w-0 flex-1">
        <h3 className="font-semibold text-stone-900">{producto.nombre}</h3>
        {producto.descripcion && <p className="mt-1 line-clamp-2 text-sm text-stone-500">{producto.descripcion}</p>}
        <p className="mt-2 font-semibold text-marca-700 tabular-nums">{formatearPrecio(producto.precio)}</p>
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

/** Carta pública: /m/:token (el cliente no inicia sesión). */
export function CartaPublicaPage() {
  const { token } = useParams<{ token: string }>()
  const carta = useCarta(token)

  useEffect(() => {
    if (carta.data) document.title = `${carta.data.restaurante.nombre} · Carta`
  }, [carta.data])

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

      {categorias.length > 0 && (
        <nav className="sticky top-0 z-10 border-b border-stone-200 bg-white/95 backdrop-blur">
          <ul className="mx-auto flex max-w-2xl gap-2 overflow-x-auto px-4 py-3">
            {categorias.map((c) => (
              <li key={c.id} className="shrink-0">
                <a
                  href={`#cat-${c.id}`}
                  className="block rounded-full border border-stone-200 px-4 py-1.5 text-sm font-medium text-stone-700 active:bg-stone-100"
                >
                  {c.nombre}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      )}

      <main className="mx-auto max-w-2xl px-5 pb-16">
        {categorias.length === 0 ? (
          <p className="py-16 text-center text-stone-500">La carta todavía no tiene productos disponibles.</p>
        ) : (
          categorias.map((c) => (
            <section key={c.id} id={`cat-${c.id}`} className="scroll-mt-16 pt-8">
              <h2 className="text-lg font-bold text-stone-900">{c.nombre}</h2>
              <ul className="divide-y divide-stone-100">
                {c.productos.map((p) => (
                  <TarjetaProducto key={p.id} producto={p} />
                ))}
              </ul>
            </section>
          ))
        )}
      </main>
    </div>
  )
}
