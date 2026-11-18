import { useEffect, useState } from 'react'

/** Devuelve `Date.now()` y lo refresca cada `ms` (para relojes de "hace X min"). */
export function useAhora(ms = 30_000): number {
  const [ahora, setAhora] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setAhora(Date.now()), ms)
    return () => clearInterval(id)
  }, [ms])
  return ahora
}
