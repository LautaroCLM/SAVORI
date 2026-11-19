// Firma una subida directa (PUT) de una foto de producto a un almacenamiento compatible con S3.
// En producción es Cloudflare R2; en desarrollo, el S3 de Supabase local. El navegador sube el archivo
// directo al bucket: la imagen nunca pasa por esta función, solo se firma la URL.
//
// Seguridad:
// - Solo un administrador activo puede pedir una firma (se valida con su propio JWT y RLS).
// - La clave del archivo la decide el servidor, dentro de la carpeta de SU restaurante.
// - La firma fija el tipo de contenido y el tamaño exacto, y vence en 5 minutos.
import { carpetaProductos, clienteS3, ErrorHttp, exigirAdmin, responder, servir, urlObjeto, urlPublica } from '../_shared/almacenamiento.ts'

const TIPOS: Record<string, string> = { 'image/webp': 'webp', 'image/jpeg': 'jpg' }
const TAMANO_MAXIMO = 2 * 1024 * 1024
const VENCE_EN_SEGUNDOS = 300

servir(async (req) => {
  const { restauranteId } = await exigirAdmin(req)

  const { tipo, tamano } = (await req.json()) as { tipo?: string; tamano?: number }
  const extension = tipo ? TIPOS[tipo] : undefined
  if (!extension) throw new ErrorHttp(400, 'Formato no admitido (usá JPG o WebP)')
  if (!Number.isInteger(tamano) || tamano! <= 0 || tamano! > TAMANO_MAXIMO) throw new ErrorHttp(400, 'La imagen supera los 2 MB')

  const clave = `${carpetaProductos(restauranteId)}${crypto.randomUUID()}.${extension}`
  const destino = new URL(urlObjeto(clave))
  destino.searchParams.set('X-Amz-Expires', String(VENCE_EN_SEGUNDOS))
  const firmada = await clienteS3().sign(destino.toString(), {
    method: 'PUT',
    headers: { 'Content-Type': tipo!, 'Content-Length': String(tamano) },
    aws: { signQuery: true, allHeaders: true },
  })

  return responder({ urlSubida: firmada.url, urlPublica: urlPublica(clave) })
})
