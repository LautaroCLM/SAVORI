import { configDefaults, defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'

// Config compatible con Tauri v2 (fase 5): puerto fijo, sin SSR, variables
// TAURI_ENV_* expuestas y sin limpiar la consola.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  // Las pruebas de seguridad (pruebas/rls) necesitan Supabase local: van aparte con `npm run test:rls`
  test: { exclude: [...configDefaults.exclude, 'pruebas/**'] },
  clearScreen: false,
  envPrefix: ['VITE_', 'TAURI_ENV_'],
  server: {
    port: 5173,
    strictPort: true,
  },
  build: {
    target: 'es2020',
    rollupOptions: {
      output: {
        // Librerías en chunks propios: cambian poco y quedan cacheadas
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          supabase: ['@supabase/supabase-js'],
          query: ['@tanstack/react-query'],
        },
      },
    },
  },
})
