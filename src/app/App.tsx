import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { RouterProvider } from 'react-router-dom'
import { opcionesPersistencia, queryClient } from '@/lib/queryClient'
import { AuthProvider } from '@/features/auth/AuthProvider'
import { router } from './router'

export function App() {
  return (
    <PersistQueryClientProvider client={queryClient} persistOptions={opcionesPersistencia}>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </PersistQueryClientProvider>
  )
}
