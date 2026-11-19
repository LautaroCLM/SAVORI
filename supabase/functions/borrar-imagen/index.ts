// Borra del bucket fotos de productos que ya no usa ningún producto (se cambiaron, se quitaron,
// se borró el producto o se subieron y el formulario se cerró sin guardar).
//
// Es seguro llamarla de más: solo borra si
// - quien pide es administrador activo,
// - el archivo está en la carpeta de SU restaurante, y
// - ningún producto del restaurante sigue apuntando a esa URL.
// Si algo no se cumple, responde `borrada: false` y no toca nada.
import { carpetaProductos, claveDesdeUrl, clienteS3, ErrorHttp, exigirAdmin, responder, servir, urlObjeto } from '../_shared/almacenamiento.ts'

servir(async (req) => {
  const { supabase, restauranteId } = await exigirAdmin(req)

  const { url } = (await req.json()) as { url?: string }
  if (typeof url !== 'string') throw new ErrorHttp(400, 'Falta la URL de la foto')

  const clave = claveDesdeUrl(url)
  if (!clave || !clave.startsWith(carpetaProductos(restauranteId))) return responder({ borrada: false, motivo: 'ajena' })

  // RLS: el admin solo ve productos de su restaurante, que es justo donde puede estar la foto
  const { count, error } = await supabase.from('productos').select('id', { count: 'exact', head: true }).eq('imagen_url', url)
  if (error) throw error
  if ((count ?? 0) > 0) return responder({ borrada: false, motivo: 'en_uso' })

  const respuesta = await clienteS3().fetch(urlObjeto(clave, true), { method: 'DELETE' })
  // S3 responde 204 aunque el objeto ya no exista: borrar es idempotente
  if (!respuesta.ok && respuesta.status !== 404) throw new Error(`DELETE ${respuesta.status}: ${await respuesta.text()}`)
  return responder({ borrada: true })
})
