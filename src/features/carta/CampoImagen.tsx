import { useId, useRef, useState } from 'react'
import { ImagePlus } from 'lucide-react'
import { Aviso, Boton, Spinner } from '@/components/ui'
import { IconoRegenerar } from '@/components/iconos'
import { mensajeDeError } from '@/lib/errores'
import { ErrorImagen, subirImagenProducto } from '@/services/imagenes'

interface Props {
  url: string | null
  onCambiar: (url: string | null) => void
  /** Avisa al formulario que hay una subida en curso (para no guardar a medias). */
  onSubiendo?: (subiendo: boolean) => void
}

/** Foto del producto: se comprime y se sube al elegirla; el producto guarda solo la URL. */
export function CampoImagen({ url, onCambiar, onSubiendo }: Props) {
  const id = useId()
  const entrada = useRef<HTMLInputElement>(null)
  const [subiendo, setSubiendo] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function elegir(archivo: File | undefined) {
    if (!archivo) return
    setError(null)
    setSubiendo(true)
    onSubiendo?.(true)
    try {
      onCambiar(await subirImagenProducto(archivo))
    } catch (e) {
      setError(e instanceof ErrorImagen ? e.message : mensajeDeError(e))
    } finally {
      setSubiendo(false)
      onSubiendo?.(false)
      if (entrada.current) entrada.current.value = ''
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold text-tinta">
        Foto
      </label>
      <div className="flex items-center gap-4">
        <div className="relative grid size-24 shrink-0 place-items-center overflow-hidden rounded-tarjeta border border-borde bg-superficie-2 text-tinta-3">
          {url ? <img src={url} alt="Foto del producto" className="size-full object-cover" /> : <ImagePlus aria-hidden size={26} />}
          {subiendo && (
            <span className="absolute inset-0 grid place-items-center bg-superficie/80">
              <Spinner />
            </span>
          )}
        </div>
        <div className="flex flex-col items-start gap-1">
          <input
            ref={entrada}
            id={id}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
            className="sr-only"
            onChange={(e) => elegir(e.target.files?.[0])}
            disabled={subiendo}
          />
          <Boton type="button" variante="secundario" tamano="sm" icono={url ? IconoRegenerar : ImagePlus} disabled={subiendo} onClick={() => entrada.current?.click()}>
            {subiendo ? 'Subiendo…' : url ? 'Cambiar foto' : 'Subir foto'}
          </Boton>
          {url && !subiendo && (
            <Boton type="button" variante="fantasma" tamano="sm" onClick={() => onCambiar(null)}>
              Quitar
            </Boton>
          )}
          <p className="text-xs leading-relaxed text-tinta-3">Opcional. Se achica sola para que la carta cargue rápido.</p>
        </div>
      </div>
      {error && <Aviso className="mt-1">{error}</Aviso>}
    </div>
  )
}
