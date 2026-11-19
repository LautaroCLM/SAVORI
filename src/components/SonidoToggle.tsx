import { useState } from 'react'
import { BellOff } from 'lucide-react'
import { IconoNotificacion } from '@/components/iconos'
import { Boton } from '@/components/ui'
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
    <Boton variante="secundario" icono={activo ? IconoNotificacion : BellOff} onClick={alternar} aria-pressed={activo} title={activo ? 'Silenciar el aviso de pedidos nuevos' : 'Activar el aviso de pedidos nuevos'}>
      {activo ? 'Sonido activado' : 'Sonido silenciado'}
    </Boton>
  )
}
