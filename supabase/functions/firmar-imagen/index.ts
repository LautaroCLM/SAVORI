// Firma una subida directa (PUT) de una foto de producto a un almacenamiento compatible con S3.
// En producción es Cloudflare R2; en desarrollo, el S3 de Supabase local. El navegador sube el archivo
// directo al bucket: la imagen nunca pasa por esta función, solo se firma la URL.
//
// Seguridad:
// - Solo un administrador activo puede pedir una firma (se valida con su propio JWT y RLS).
// - La clave del archivo la decide el servidor, dentro de la carpeta de SU restaurante.
// - La firma fija el tipo de contenido y el tamaño exacto, y vence en 5 minutos.
import { createClient } from 'npm:@supabase/supabase-js@2.49.4'
import { AwsClient } from 'npm:aws4fetch@1.0.20'

const TIPOS: Record<string, string> = { 'image/webp': 'webp', 'image/jpeg': 'jpg' }
const TAMANO_MAXIMO = 2 * 1024 * 1024
const VENCE_EN_SEGUNDOS = 300

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function responder(cuerpo: unknown, estado = 200) {
  return new Response(JSON.stringify(cuerpo), { status: estado, headers: { ...CORS, 'Content-Type': 'application/json' } })
}

function variable(nombre: string): string {
  const valor = Deno.env.get(nombre)
  if (!valor) throw new Error(`Falta la variable ${nombre}`)
  return valor
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return responder({ error: 'Método no permitido' }, 405)

  try {
    const autorizacion = req.headers.get('Authorization')
    if (!autorizacion) return responder({ error: 'Falta la sesión' }, 401)

    // Cliente con el JWT del usuario: la lectura de su perfil pasa por RLS
    const supabase = createClient(variable('SUPABASE_URL'), variable('SUPABASE_ANON_KEY'), {
      global: { headers: { Authorization: autorizacion } },
      auth: { persistSession: false },
    })
    const { data: usuario, error: errorUsuario } = await supabase.auth.getUser(autorizacion.replace(/^Bearer\s+/i, ''))
    if (errorUsuario || !usuario.user) return responder({ error: 'Sesión inválida' }, 401)

    const { data: perfil, error: errorPerfil } = await supabase
      .from('perfiles')
      .select('restaurante_id, rol, activo')
      .eq('id', usuario.user.id)
      .maybeSingle()
    if (errorPerfil) throw errorPerfil
    if (!perfil || !perfil.activo || perfil.rol !== 'admin') return responder({ error: 'Solo un administrador puede subir fotos' }, 403)

    const { tipo, tamano } = (await req.json()) as { tipo?: string; tamano?: number }
    const extension = tipo ? TIPOS[tipo] : undefined
    if (!extension) return responder({ error: 'Formato no admitido (usá JPG o WebP)' }, 400)
    if (!Number.isInteger(tamano) || tamano! <= 0 || tamano! > TAMANO_MAXIMO) return responder({ error: 'La imagen supera los 2 MB' }, 400)

    const clave = `restaurantes/${perfil.restaurante_id}/productos/${crypto.randomUUID()}.${extension}`
    const endpoint = variable('IMAGENES_S3_ENDPOINT').replace(/\/$/, '')
    const bucket = variable('IMAGENES_BUCKET')

    const aws = new AwsClient({
      accessKeyId: variable('IMAGENES_S3_ACCESS_KEY_ID'),
      secretAccessKey: variable('IMAGENES_S3_SECRET_ACCESS_KEY'),
      region: Deno.env.get('IMAGENES_S3_REGION') ?? 'auto',
      service: 's3',
    })
    const destino = new URL(`${endpoint}/${bucket}/${clave}`)
    destino.searchParams.set('X-Amz-Expires', String(VENCE_EN_SEGUNDOS))
    const firmada = await aws.sign(destino.toString(), {
      method: 'PUT',
      headers: { 'Content-Type': tipo!, 'Content-Length': String(tamano) },
      aws: { signQuery: true, allHeaders: true },
    })

    return responder({
      urlSubida: firmada.url,
      urlPublica: `${variable('IMAGENES_URL_PUBLICA').replace(/\/$/, '')}/${clave}`,
    })
  } catch (e) {
    console.error(e)
    return responder({ error: 'No se pudo preparar la subida' }, 500)
  }
})
