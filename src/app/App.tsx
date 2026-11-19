import { MotionConfig } from 'motion/react'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { RouterProvider } from 'react-router-dom'
import { opcionesPersistencia, queryClient } from '@/lib/queryClient'
import { AuthProvider } from '@/features/auth/AuthProvider'
import { ProveedorConfirmacion } from '@/components/Confirmar'
import { router } from './router'

export function App() {
  return (
    // reducedMotion="user": si el sistema pide menos movimiento, los iconos animados no se desplazan
    <MotionConfig reducedMotion="user">
      <PersistQueryClientProvider client={queryClient} persistOptions={opcionesPersistencia}>
        <AuthProvider>
          <ProveedorConfirmacion>
            <RouterProvider router={router} />
          </ProveedorConfirmacion>
        </AuthProvider>
      </PersistQueryClientProvider>
    </MotionConfig>
  )
}
