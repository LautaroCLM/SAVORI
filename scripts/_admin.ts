/**
 * Utilidades compartidas por los scripts de administración.
 * Usan la SERVICE ROLE KEY: correrlos SOLO desde tu PC, nunca en el frontend.
 */
import { createClient } from '@supabase/supabase-js'
import { randomBytes } from 'node:crypto'
import { config } from 'dotenv'

// .env.scripts tiene prioridad (ahí va la service role key), después .env.local
config({ path: ['.env.scripts', '.env.local', '.env'], quiet: true })

export function clienteAdmin() {
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    fallar('Faltan SUPABASE_URL y/o SUPABASE_SERVICE_ROLE_KEY (ver .env.example → .env.scripts).')
  }
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export function generarPassword(): string {
  return randomBytes(12).toString('base64url')
}

export function validarEmail(email: string) {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fallar(`Email inválido: ${email}`)
}

export function validarPassword(password: string) {
  if (password.length < 8) fallar('La contraseña debe tener al menos 8 caracteres.')
}

export function fallar(mensaje: string): never {
  console.error(`\n✖ ${mensaje}\n`)
  process.exit(1)
}

export const ROLES = ['admin', 'mozo', 'cocina'] as const
export type Rol = (typeof ROLES)[number]
