import { useState } from 'react'
import { Boton, Selector } from '@/components/ui'
import { IconoRegenerar } from '@/components/iconos'
import type { Mesa } from '@/services/mesas'

type Cambios = Partial<Pick<Mesa, 'ancho' | 'alto' | 'rotacion' | 'forma'>>

const FORMAS: { valor: Mesa['forma']; etiqueta: string }[] = [
  { valor: 'cuadrada', etiqueta: 'Cuadrada' },
  { valor: 'redonda', etiqueta: 'Redonda' },
  { valor: 'rectangular', etiqueta: 'Rectangular' },
]

function Numero({ etiqueta, valor, min, max, onGuardar }: { etiqueta: string; valor: number; min: number; max: number; onGuardar: (v: number) => void }) {
  const [texto, setTexto] = useState(String(valor))
  function guardar() {
    const n = Math.min(max, Math.max(min, Math.round(Number(texto))))
    if (Number.isFinite(n) && n !== valor) onGuardar(n)
    setTexto(String(Number.isFinite(n) ? n : valor))
  }
  return (
    <label className="flex flex-col gap-1.5 text-xs font-semibold text-tinta-2">
      {etiqueta}
      <input
        type="number"
        value={texto}
        min={min}
        max={max}
        onChange={(e) => setTexto(e.target.value)}
        onBlur={guardar}
        onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
        className="cifras h-10 w-24 rounded-control border border-borde-fuerte bg-superficie px-2.5 text-sm shadow-control outline-none focus:border-marca-600 focus:ring-4 focus:ring-marca-600/15"
      />
    </label>
  )
}

/** Ajustes de la mesa elegida en el modo edición del mapa (tamaño, giro y forma). */
export function EditorMesa({ mesa, onCambiar }: { mesa: Mesa; onCambiar: (c: Cambios) => void }) {
  return (
    <div className="mt-4 flex flex-wrap items-end gap-3 rounded-tarjeta border border-borde bg-superficie p-4">
      <p className="cifras mr-2 self-center text-base font-bold">Mesa {mesa.numero}</p>
      <label className="flex flex-col gap-1.5 text-xs font-semibold text-tinta-2">
        Forma
        <Selector value={mesa.forma} onChange={(e) => onCambiar({ forma: e.target.value as Mesa['forma'] })} className="h-10 text-sm" envoltura="w-36">
          {FORMAS.map((f) => (
            <option key={f.valor} value={f.valor}>
              {f.etiqueta}
            </option>
          ))}
        </Selector>
      </label>
      <Numero key={`a-${mesa.id}-${mesa.ancho}`} etiqueta="Ancho (px)" valor={mesa.ancho} min={40} max={400} onGuardar={(v) => onCambiar({ ancho: v })} />
      <Numero key={`h-${mesa.id}-${mesa.alto}`} etiqueta="Alto (px)" valor={mesa.alto} min={40} max={400} onGuardar={(v) => onCambiar({ alto: v })} />
      <Numero key={`r-${mesa.id}-${mesa.rotacion}`} etiqueta="Giro (°)" valor={mesa.rotacion} min={0} max={359} onGuardar={(v) => onCambiar({ rotacion: v })} />
      <Boton variante="secundario" tamano="sm" icono={IconoRegenerar} onClick={() => onCambiar({ rotacion: (mesa.rotacion + 90) % 360 })}>
        Girar 90°
      </Boton>
    </div>
  )
}
