/**
 * Crea un restaurante + su usuario admin + su perfil.
 *
 *   npm run crear-restaurante -- --nombre "La Parrilla de Juan" --slug la-parrilla \
 *       --email juan@laparrilla.com --admin-nombre "Juan Pérez" [--password "..."]
 *
 * Si no pasás --password se genera una aleatoria y se muestra al final.
 * Si algún paso falla, se deshace lo creado (no quedan restaurantes huérfanos).
 */
import { parseArgs } from 'node:util'
import { clienteAdmin, fallar, generarPassword, validarEmail, validarPassword } from './_admin.ts'

const { values } = parseArgs({
  options: {
    nombre: { type: 'string' },
    slug: { type: 'string' },
    email: { type: 'string' },
    'admin-nombre': { type: 'string' },
    password: { type: 'string' },
  },
})

const nombre = values.nombre?.trim()
const email = values.email?.trim().toLowerCase()
const adminNombre = values['admin-nombre']?.trim()
if (!nombre || !email || !adminNombre) {
  fallar(
    'Uso: npm run crear-restaurante -- --nombre "Nombre" --email admin@resto.com --admin-nombre "Nombre Apellido" [--slug mi-resto] [--password ...]',
  )
}

const slug =
  values.slug?.trim() ??
  nombre
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) fallar(`Slug inválido: "${slug}" (solo a-z, 0-9 y guiones)`)
validarEmail(email)
const passwordGenerada = !values.password
const password = values.password ?? generarPassword()
validarPassword(password)

const supabase = clienteAdmin()

// 1) Restaurante
const { data: restaurante, error: errResto } = await supabase
  .from('restaurantes')
  .insert({ nombre, slug })
  .select('id')
  .single()
if (errResto) {
  fallar(errResto.code === '23505' ? `Ya existe un restaurante con el slug "${slug}".` : errResto.message)
}

// 2) Usuario de auth (email ya confirmado: no se envía mail)
const { data: usuario, error: errUser } = await supabase.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  user_metadata: { nombre: adminNombre },
})
if (errUser || !usuario.user) {
  await supabase.from('restaurantes').delete().eq('id', restaurante.id)
  fallar(`No se pudo crear el usuario: ${errUser?.message}`)
}

// 3) Perfil
const { error: errPerfil } = await supabase.from('perfiles').insert({
  id: usuario.user.id,
  restaurante_id: restaurante.id,
  nombre: adminNombre,
  rol: 'admin',
})
if (errPerfil) {
  await supabase.auth.admin.deleteUser(usuario.user.id)
  await supabase.from('restaurantes').delete().eq('id', restaurante.id)
  fallar(`No se pudo crear el perfil: ${errPerfil.message}`)
}

console.log(`
✔ Restaurante creado
  Nombre:         ${nombre}
  Slug:           ${slug}
  Restaurante ID: ${restaurante.id}

✔ Usuario admin
  Email:          ${email}
  ${passwordGenerada ? `Contraseña:     ${password}   ← guardala, no se vuelve a mostrar` : 'Contraseña:     (la que indicaste)'}
`)
