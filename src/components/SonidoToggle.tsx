import { useState } from 'react'
import { reproducirAviso, setSonidoActivo, sonidoActivo } from '@/lib/sonido'

/** Activa o silencia el aviso sonoro de pedidos nuevos (se recuerda en este dispositivo). */
export function SonidoToggle() {
  const [activo, setActivo] = useState(sonidoActivo)
  function alternar() {
    const nuevo = !activo
    setSonidoActivo(nuevo)
    setActivo(nuevo)
    if (nuevo) reproducirAviso() // también "desbloquea" el audio del navegador con este clic
  }
  return (
    <button
      type="button"
      onClick={alternar}
      aria-pressed={activo}
      className="inline-flex h-11 items-center gap-2 rounded-lg border border-stone-300 bg-white px-3 text-sm font-medium text-stone-700 hover:bg-stone-100"
    >
      <span aria-hidden>{activo ? '🔔' : '🔕'}</span>
      Sonido {activo ? 'activado' : 'silenciado'}
    </button>
  )
}
