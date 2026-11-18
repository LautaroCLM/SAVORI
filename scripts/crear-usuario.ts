/**
 * Agrega un usuario (mozo, cocina u otro admin) a un restaurante existente.
 *
 *   npm run crear-usuario -- --restaurante la-parrilla --email mozo@laparrilla.com \
 *       --nombre "Pedro" --rol mozo [--password "..."]
 */
import { parseArgs } from 'node:util'
import { ROLES, type Rol, clienteAdmin, fallar, generarPassword, validarEmail, validarPassword } from './_admin.ts'

const { values } = parseArgs({
  options: {
    restaurante: { type: 'string' },
    email: { type: 'string' },
    nombre: { type: 'string' },
    rol: { type: 'string' },
    password: { type: 'string' },
  },
})

const slug = values.restaurante?.trim()
const email = values.email?.trim().toLowerCase()
const nombre = values.nombre?.trim()
const rol = values.rol as Rol | undefined
if (!slug || !email || !nombre || !rol) {
  fallar('Uso: npm run crear-usuario -- --restaurante <slug> --email x@y.com --nombre "Nombre" --rol mozo|cocina|admin [--password ...]')
}
if (!ROLES.includes(rol)) fallar(`Rol inválido: ${rol}. Opciones: ${ROLES.join(', ')}`)
validarEmail(email)
const passwordGenerada = !values.password
const password = values.password ?? generarPassword()
validarPassword(password)

const supabase = clienteAdmin()

const { data: restaurante, error: errResto } = await supabase
  .from('restaurantes')
  .select('id, nombre')
  .eq('slug', slug)
  .maybeSingle()
if (errResto) fallar(errResto.message)
if (!restaurante) fallar(`No existe un restaurante con slug "${slug}".`)

const { data: usuario, error: errUser } = await supabase.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  user_metadata: { nombre },
})
if (errUser || !usuario.user) fallar(`No se pudo crear el usuario: ${errUser?.message}`)

const { error: errPerfil } = await supabase
  .from('perfiles')
  .insert({ id: usuario.user.id, restaurante_id: restaurante.id, nombre, rol })
if (errPerfil) {
  await supabase.auth.admin.deleteUser(usuario.user.id)
  fallar(`No se pudo crear el perfil: ${errPerfil.message}`)
}

console.log(`
✔ Usuario creado en "${restaurante.nombre}"
  Email:      ${email}
  Rol:        ${rol}
  ${passwordGenerada ? `Contraseña: ${password}   ← guardala, no se vuelve a mostrar` : 'Contraseña: (la que indicaste)'}
`)
