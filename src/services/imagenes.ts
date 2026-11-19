import { supabase } from '@/lib/supabase'

/** Lado mayor de la foto ya procesada: alcanza para la carta en pantallas de alta densidad. */
const LADO_MAXIMO = 1200
const TAMANO_MAXIMO = 2 * 1024 * 1024

export class ErrorImagen extends Error {}

function aBlob(lienzo: HTMLCanvasElement, tipo: string, calidad: number): Promise<Blob | null> {
  return new Promise((r) => lienzo.toBlob(r, tipo, calidad))
}

/**
 * Achica y recomprime la foto en el navegador (WebP, o JPEG si el navegador no codifica WebP).
 * Una foto de celular de 4 MB queda en ~150–300 KB: carga rápido en la carta y ahorra almacenamiento.
 */
export async function comprimirImagen(archivo: File): Promise<Blob> {
  if (!archivo.type.startsWith('image/')) throw new ErrorImagen('El archivo no es una imagen.')
  let mapa: ImageBitmap
  try {
    mapa = await createImageBitmap(archivo, { imageOrientation: 'from-image' })
  } catch {
    throw new ErrorImagen('No se pudo leer la imagen. Probá con una foto JPG o PNG.')
  }
  const escala = Math.min(1, LADO_MAXIMO / Math.max(mapa.width, mapa.height))
  const lienzo = document.createElement('canvas')
  lienzo.width = Math.round(mapa.width * escala)
  lienzo.height = Math.round(mapa.height * escala)
  const ctx = lienzo.getContext('2d')
  if (!ctx) throw new ErrorImagen('Tu navegador no permite procesar imágenes.')
  ctx.fillStyle = '#ffffff' // las transparencias de un PNG quedan sobre blanco, no negro
  ctx.fillRect(0, 0, lienzo.width, lienzo.height)
  ctx.drawImage(mapa, 0, 0, lienzo.width, lienzo.height)
  mapa.close()

  for (const calidad of [0.82, 0.7, 0.55]) {
    let blob = await aBlob(lienzo, 'image/webp', calidad)
    if (!blob || blob.type !== 'image/webp') blob = await aBlob(lienzo, 'image/jpeg', calidad)
    if (blob && blob.size <= TAMANO_MAXIMO) return blob
  }
  throw new ErrorImagen('La imagen es demasiado pesada incluso comprimida.')
}

/** Comprime la foto, pide una subida firmada y la sube directo al almacenamiento. Devuelve la URL pública. */
export async function subirImagenProducto(archivo: File): Promise<string> {
  if (!navigator.onLine) throw new ErrorImagen('Para subir una foto necesitás conexión a internet.')
  const blob = await comprimirImagen(archivo)

  const { data, error } = await supabase.functions.invoke<{ urlSubida: string; urlPublica: string }>('firmar-imagen', {
    body: { tipo: blob.type, tamano: blob.size },
  })
  if (error || !data) {
    let detalle: string | undefined
    try {
      detalle = (await (error as { context?: Response })?.context?.json())?.error
    } catch {
      /* sin cuerpo legible */
    }
    throw new ErrorImagen(detalle ?? 'No se pudo preparar la subida de la foto.')
  }

  const respuesta = await fetch(data.urlSubida, { method: 'PUT', headers: { 'Content-Type': blob.type }, body: blob })
  if (!respuesta.ok) throw new ErrorImagen('No se pudo subir la foto. Probá de nuevo.')
  return data.urlPublica
}

/**
 * Pide borrar una foto que dejó de usarse. Es "dispara y olvidate": el servidor solo la borra si ningún
 * producto la usa, así que llamarla de más es inofensivo, y si falla (sin conexión) queda un archivo
 * huérfano que no se ve en ningún lado.
 */
export function liberarImagen(url: string | null | undefined): void {
  if (!url || !navigator.onLine) return
  void supabase.functions.invoke('borrar-imagen', { body: { url } }).catch(() => undefined)
}
