/** Une clases condicionales (lo usan los iconos animados y los componentes de UI). */
export function cn(...clases: Array<string | false | null | undefined>): string {
  return clases.filter(Boolean).join(' ')
}
