// Piezas comunes de las funciones de fotos: CORS, respuestas, permisos y el cliente S3 (R2 en producción).
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2.49.4'
import { AwsClient } from 'npm:aws4fetch@1.0.20'

export const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

export function responder(cuerpo: unknown, estado = 200) {
  return new Response(JSON.stringify(cuerpo), { status: estado, headers: { ...CORS, 'Content-Type': 'application/json' } })
}

export function variable(nombre: string): string {
  const valor = Deno.env.get(nombre)
  if (!valor) throw new Error(`Falta la variable ${nombre}`)
  return valor
}

/** Error con respuesta HTTP propia (permisos, datos inválidos). */
export class ErrorHttp extends Error {
  constructor(
    public estado: number,
    mensaje: string,
  ) {
    super(mensaje)
  }
}

export interface Admin {
  supabase: SupabaseClient
  restauranteId: string
}

/**
 * Valida que el pedido venga de un administrador activo. Devuelve un cliente con SU JWT:
 * todo lo que se lea después pasa por RLS y solo ve datos de su restaurante.
 */
export async function exigirAdmin(req: Request): Promise<Admin> {
  const autorizacion = req.headers.get('Authorization')
  if (!autorizacion) throw new ErrorHttp(401, 'Falta la sesión')
  const supabase = createClient(variable('SUPABASE_URL'), variable('SUPABASE_ANON_KEY'), {
    global: { headers: { Authorization: autorizacion } },
    auth: { persistSession: false },
  })
  const { data: usuario, error: errorUsuario } = await supabase.auth.getUser(autorizacion.replace(/^Bearer\s+/i, ''))
  if (errorUsuario || !usuario.user) throw new ErrorHttp(401, 'Sesión inválida')
  const { data: perfil, error } = await supabase.from('perfiles').select('restaurante_id, rol, activo').eq('id', usuario.user.id).maybeSingle()
  if (error) throw error
  if (!perfil || !perfil.activo || perfil.rol !== 'admin') throw new ErrorHttp(403, 'Solo un administrador puede gestionar fotos')
  return { supabase, restauranteId: perfil.restaurante_id }
}

/** Carpeta de fotos de productos de un restaurante dentro del bucket. */
export const carpetaProductos = (restauranteId: string) => `restaurantes/${restauranteId}/productos/`

export function urlPublica(clave: string) {
  return `${variable('IMAGENES_URL_PUBLICA').replace(/\/$/, '')}/${clave}`
}

/** Inversa de `urlPublica`: la clave del objeto, o `null` si la URL no es de nuestro bucket. */
export function claveDesdeUrl(url: string): string | null {
  const base = `${variable('IMAGENES_URL_PUBLICA').replace(/\/$/, '')}/`
  if (!url.startsWith(base)) return null
  const clave = decodeURIComponent(url.slice(base.length))
  // Sin rutas relativas ni subcarpetas inesperadas: solo `restaurantes/<id>/productos/<archivo>`
  if (!/^restaurantes\/[0-9a-f-]{36}\/productos\/[0-9a-f-]{36}\.(webp|jpg)$/.test(clave)) return null
  return clave
}

export function clienteS3() {
  return new AwsClient({
    accessKeyId: variable('IMAGENES_S3_ACCESS_KEY_ID'),
    secretAccessKey: variable('IMAGENES_S3_SECRET_ACCESS_KEY'),
    region: Deno.env.get('IMAGENES_S3_REGION') ?? 'auto',
    service: 's3',
  })
}

/**
 * URL S3 del objeto. `interna` es para pedidos que hace la propia función (borrar): en desarrollo la función
 * corre dentro de Docker y no llega a 127.0.0.1, así que usa IMAGENES_S3_ENDPOINT_INTERNO. En R2 no hace falta.
 */
export function urlObjeto(clave: string, interna = false) {
  const endpoint = (interna && Deno.env.get('IMAGENES_S3_ENDPOINT_INTERNO')) || variable('IMAGENES_S3_ENDPOINT')
  return `${endpoint.replace(/\/$/, '')}/${variable('IMAGENES_BUCKET')}/${clave}`
}

/** Envuelve el manejador: CORS, método POST y errores con su código. */
export function servir(manejador: (req: Request) => Promise<Response>) {
  Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
    if (req.method !== 'POST') return responder({ error: 'Método no permitido' }, 405)
    try {
      return await manejador(req)
    } catch (e) {
      if (e instanceof ErrorHttp) return responder({ error: e.message }, e.estado)
      console.error(e)
      return responder({ error: 'No se pudo completar la operación con la foto' }, 500)
    }
  })
}
