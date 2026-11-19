import { useCallback, useRef, type ComponentType, type FocusEvent, type HTMLAttributes, type RefAttributes } from 'react'

/** Lo que exponen los iconos de lucide-animated. */
export interface ControlIcono {
  startAnimation: () => void
  stopAnimation: () => void
}

/** Un icono animado: componente con `size` y una referencia para dispararlo. */
export type IconoAnimado = ComponentType<HTMLAttributes<HTMLDivElement> & { size?: number } & RefAttributes<ControlIcono>>

/**
 * Anima el icono cuando el usuario interactúa con el CONTROL que lo contiene (botón, enlace, fila),
 * no solo al pasar sobre el dibujo: hover, foco de teclado y toque. El movimiento reducido del sistema
 * lo resuelve `MotionConfig reducedMotion="user"` en la raíz de la app.
 */
export function useIconoAnimado() {
  const ref = useRef<ControlIcono>(null)
  // `?.()` también en el método: un icono estático de Lucide recibe la ref como <svg> y no se anima.
  // Se dispara en el cuadro siguiente: si el control recién se montó (p. ej. el botón Cerrar que el
  // diálogo enfoca al abrirse), arrancar en el mismo tick dejaba el dibujo congelado en opacidad 0.
  const animar = useCallback(() => {
    requestAnimationFrame(() => ref.current?.startAnimation?.())
  }, [])
  const detener = useCallback(() => {
    requestAnimationFrame(() => ref.current?.stopAnimation?.())
  }, [])
  // El foco solo anima cuando viene del teclado; el foco automático de un diálogo no es una interacción.
  const alEnfocar = useCallback(
    (e: FocusEvent<HTMLElement>) => {
      if (e.currentTarget.matches(':focus-visible')) animar()
    },
    [animar],
  )
  return {
    ref,
    animar,
    /** Props para el elemento interactivo que contiene el icono. */
    disparadores: { onMouseEnter: animar, onMouseLeave: detener, onFocus: alEnfocar, onBlur: detener, onPointerDown: animar },
  }
}

/**
 * La ref de animación se pasa por spread: un icono animado la usa para `startAnimation`;
 * uno estático de Lucide la recibe como su <svg> y el gancho la ignora sin romper.
 */
export function conRef(ref: unknown): object {
  return { ref }
}
