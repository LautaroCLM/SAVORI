const CLAVE = 'savori:sonido'

export function sonidoActivo(): boolean {
  try {
    return localStorage.getItem(CLAVE) !== 'off'
  } catch {
    return true
  }
}

export function setSonidoActivo(activo: boolean) {
  try {
    localStorage.setItem(CLAVE, activo ? 'on' : 'off')
  } catch {
    /* sin almacenamiento: queda activo */
  }
}

let ctx: AudioContext | null = null

/** Dos tonos cortos (generados con Web Audio, sin archivos). Necesita una interacción previa del usuario. */
export function reproducirAviso() {
  if (!sonidoActivo()) return
  try {
    ctx ??= new AudioContext()
    if (ctx.state === 'suspended') void ctx.resume()
    const ahora = ctx.currentTime
    ;[660, 880].forEach((freq, i) => {
      const osc = ctx!.createOscillator()
      const gain = ctx!.createGain()
      osc.type = 'sine'
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0.0001, ahora + i * 0.16)
      gain.gain.exponentialRampToValueAtTime(0.25, ahora + i * 0.16 + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, ahora + i * 0.16 + 0.14)
      osc.connect(gain).connect(ctx!.destination)
      osc.start(ahora + i * 0.16)
      osc.stop(ahora + i * 0.16 + 0.15)
    })
  } catch {
    /* el navegador bloqueó el audio: se ignora */
  }
}
