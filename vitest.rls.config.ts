import { defineConfig } from 'vitest/config'

// Pruebas de seguridad contra Supabase LOCAL (necesita `npx supabase start`). Corren en serie:
// algunas suspenden y reactivan cuentas y no deben pisarse entre sí.
export default defineConfig({
  test: {
    include: ['pruebas/rls/**/*.test.ts'],
    environment: 'node',
    fileParallelism: false,
    sequence: { concurrent: false },
    testTimeout: 20_000,
    hookTimeout: 60_000,
  },
})
