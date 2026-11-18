import { useState } from 'react'
import { DndContext, PointerSensor, useDraggable, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { formatearPrecio } from '@/lib/formato'
import type { Mesa } from '@/services/mesas'

export interface InfoMesa {
  /** Pedidos activos (pendientes, en preparación o listos). */
  activos: number
  /** Pedidos listos esperando que el mozo los lleve. */
  listos: number
  /** Total acumulado de la cuenta abierta. */
  total: number | null
}

interface MapaProps {
  mesas: Mesa[]
  info: Record<string, InfoMesa>
  editando: boolean
  seleccionadaId: string | null
  onSeleccionar: (mesa: Mesa) => void
  onMover: (mesa: Mesa, x: number, y: number) => void
}

const SNAP = 10
const snap = (v: number) => Math.max(0, Math.round(v / SNAP) * SNAP)

function claseForma(forma: Mesa['forma']) {
  return forma === 'redonda' ? 'rounded-full' : 'rounded-xl'
}

function NodoMesa({ mesa, info, editando, seleccionada, onClick }: { mesa: Mesa; info?: InfoMesa; editando: boolean; seleccionada: boolean; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: mesa.id, disabled: !editando })
  const ocupada = mesa.estado === 'ocupada'
  return (
    <div
      ref={setNodeRef}
      style={{
        left: mesa.x,
        top: mesa.y,
        width: mesa.ancho,
        height: mesa.alto,
        transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
        zIndex: isDragging ? 30 : seleccionada ? 20 : 1,
      }}
      className="absolute"
    >
      <button
        type="button"
        onClick={onClick}
        aria-label={`Mesa ${mesa.numero}, ${ocupada ? 'ocupada' : 'libre'}`}
        {...attributes}
        {...(editando ? listeners : {})}
        style={{ transform: `rotate(${mesa.rotacion}deg)` }}
        className={`relative flex size-full flex-col items-center justify-center border-2 text-center shadow-sm transition-colors ${claseForma(mesa.forma)} ${
          ocupada ? 'border-rose-500 bg-rose-50 text-rose-950' : 'border-emerald-500 bg-emerald-50 text-emerald-950'
        } ${editando ? 'cursor-grab touch-none active:cursor-grabbing' : 'cursor-pointer hover:brightness-95'} ${
          seleccionada ? 'ring-4 ring-marca-500/40' : ''
        } ${isDragging ? 'shadow-xl' : ''}`}
      >
        <span className="text-lg leading-none font-extrabold" style={{ transform: `rotate(${-mesa.rotacion}deg)` }}>{mesa.numero}</span>
        <span className="mt-0.5 text-[10px] leading-none opacity-70" style={{ transform: `rotate(${-mesa.rotacion}deg)` }}>
          {ocupada && info?.total != null && info.total > 0 ? formatearPrecio(info.total) : `${mesa.capacidad} pers.`}
        </span>
      </button>
      {!editando && info && info.activos > 0 && (
        <span
          className={`pointer-events-none absolute -top-2 -right-2 z-10 flex min-w-6 items-center justify-center rounded-full px-1.5 py-0.5 text-xs font-bold text-white shadow ${
            info.listos > 0 ? 'animate-pulse bg-emerald-600' : 'bg-amber-500'
          }`}
          title={info.listos > 0 ? `${info.listos} pedido(s) listo(s) para entregar` : `${info.activos} pedido(s) en curso`}
        >
          {info.listos > 0 ? '✓' : info.activos}
        </span>
      )}
    </div>
  )
}

/** Plano del salón. En modo edición las mesas se arrastran (con imán a una grilla de 10 px). */
export function MapaSalon({ mesas, info, editando, seleccionadaId, onSeleccionar, onMover }: MapaProps) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))
  const [arrastrando, setArrastrando] = useState(false)

  const ancho = Math.max(720, ...mesas.map((m) => m.x + m.ancho + 60))
  const alto = Math.max(420, ...mesas.map((m) => m.y + m.alto + 60))

  function alSoltar(e: DragEndEvent) {
    setArrastrando(false)
    const mesa = mesas.find((m) => m.id === e.active.id)
    if (!mesa) return
    const x = snap(mesa.x + e.delta.x)
    const y = snap(mesa.y + e.delta.y)
    if (x !== mesa.x || y !== mesa.y) onMover(mesa, x, y)
  }

  return (
    <div className="overflow-auto rounded-2xl bg-white shadow-sm ring-1 ring-stone-200" style={{ maxHeight: '70dvh' }}>
      <DndContext sensors={sensors} onDragStart={() => setArrastrando(true)} onDragEnd={alSoltar} onDragCancel={() => setArrastrando(false)}>
        <div
          className={`relative ${arrastrando ? 'select-none' : ''}`}
          style={{
            width: ancho,
            height: alto,
            backgroundImage: 'radial-gradient(circle, #d6d3d1 1px, transparent 1px)',
            backgroundSize: `${SNAP * 2}px ${SNAP * 2}px`,
          }}
        >
          {mesas.map((m) => (
            <NodoMesa key={m.id} mesa={m} info={info[m.id]} editando={editando} seleccionada={m.id === seleccionadaId} onClick={() => onSeleccionar(m)} />
          ))}
        </div>
      </DndContext>
    </div>
  )
}
