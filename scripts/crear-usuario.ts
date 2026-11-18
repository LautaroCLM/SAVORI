/**
 * Crea un usuario de acceso.
 *
 * Modo 1 · SIN restaurante (el caso normal): crea solo el login. En su primer
 * ingreso la persona crea su propio restaurante o se une con un código.
 *
 *   npm run crear-usuario -- --email juan@laparrilla.com [--password "..."]
 *
 * Modo 2 · CON restaurante: lo agrega directo a un restaurante existente.
 *
 *   npm run crear-usuario -- --email pedro@x.com --restaurante la-parrilla \
 *       --nombre "Pedro" --rol mozo [--password "..."]
 */
import { parseArgs } from 'node:util'
import { ROLES, type Rol, clienteAdmin, fallar, generarPassword, validarEmail, validarPassword } from './_admin.ts'

const { values } = parseArgs({
  options: {
    email: { type: 'string' },
    password: { type: 'string' },
    restaurante: { type: 'string' },
    nombre: { type: 'string' },
    rol: { type: 'string' },
  },
})

const email = values.email?.trim().toLowerCase()
if (!email) {
  fallar('Uso: npm run crear-usuario -- --email x@y.com [--password ...] [--restaurante <slug> --nombre "Nombre" --rol mozo|cocina|admin]')
}
validarEmail(email)

const slug = values.restaurante?.trim()
const nombre = values.nombre?.trim()
const rol = values.rol as Rol | undefined
if (slug && (!nombre || !rol)) fallar('Con --restaurante hay que indicar también --nombre y --rol.')
if (rol && !ROLES.includes(rol)) fallar(`Rol inválido: ${rol}. Opciones: ${ROLES.join(', ')}`)

const passwordGenerada = !values.password
const password = values.password ?? generarPassword()
validarPassword(password)

const supabase = clienteAdmin()

let restaurante: { id: string; nombre: string } | null = null
if (slug) {
  const { data, error } = await supabase.from('restaurantes').select('id, nombre').eq('slug', slug).maybeSingle()
  if (error) fallar(error.message)
  if (!data) fallar(`No existe un restaurante con slug "${slug}".`)
  restaurante = data
}

const { data: usuario, error: errUser } = await supabase.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
})
if (errUser || !usuario.user) fallar(`No se pudo crear el usuario: ${errUser?.message}`)

if (restaurante && nombre && rol) {
  const { error: errPerfil } = await supabase
    .from('perfiles')
    .insert({ id: usuario.user.id, restaurante_id: restaurante.id, nombre, rol })
  if (errPerfil) {
    await supabase.auth.admin.deleteUser(usuario.user.id)
    fallar(`No se pudo crear el perfil: ${errPerfil.message}`)
  }
}

console.log(`
✔ Usuario creado
  Email:      ${email}
  ${passwordGenerada ? `Contraseña: ${password}   ← guardala, no se vuelve a mostrar` : 'Contraseña: (la que indicaste)'}
  ${restaurante ? `Restaurante: ${restaurante.nombre} (${rol})` : 'Sin restaurante: en su primer ingreso va a crear el suyo o unirse con un código.'}
`)
