import { useState } from 'react'
import { DndContext, PointerSensor, useDraggable, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { ConciergeBell } from 'lucide-react'
import { formatearPrecioCompacto } from '@/lib/formato'
import { cn } from '@/lib/utils'
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
/** Grilla de puntos del plano (patrón SVG plano, sin degradados). */
const PUNTOS_GRILLA = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20'%3E%3Ccircle cx='1' cy='1' r='1' fill='%23e8e2db'/%3E%3C/svg%3E")`
const snap = (v: number) => Math.max(0, Math.round(v / SNAP) * SNAP)

function claseForma(forma: Mesa['forma']) {
  return forma === 'redonda' ? 'rounded-full' : 'rounded-tarjeta'
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
        aria-label={`Mesa ${mesa.numero}, ${ocupada ? 'ocupada' : 'libre'}${info?.listos ? `, ${info.listos} pedido(s) listo(s)` : ''}`}
        {...attributes}
        {...(editando ? listeners : {})}
        style={{ transform: `rotate(${mesa.rotacion}deg)` }}
        className={cn(
          'relative flex size-full flex-col items-center justify-center border-2 text-center transition-[background-color,border-color,box-shadow] duration-200',
          claseForma(mesa.forma),
          ocupada ? 'border-marca-500 bg-marca-50 text-marca-800' : 'border-borde-fuerte bg-superficie text-tinta hover:border-tinta-3',
          editando ? 'cursor-grab touch-none active:cursor-grabbing' : 'cursor-pointer',
          seleccionada && 'ring-4 ring-marca-500/30',
          isDragging && 'shadow-flotante',
        )}
      >
        <span className="flex flex-col items-center" style={{ transform: `rotate(${-mesa.rotacion}deg)` }}>
          <span className="cifras text-xl leading-none font-bold">{mesa.numero}</span>
          <span className={cn('cifras mt-1 text-xs leading-none font-semibold', ocupada ? 'text-marca-700' : 'text-tinta-3')}>
            {ocupada && info?.total != null && info.total > 0 ? formatearPrecioCompacto(info.total) : `${mesa.capacidad} pers.`}
          </span>
        </span>
      </button>
      {!editando && info && info.activos > 0 && (
        <span
          className={cn(
            'cifras pointer-events-none absolute -top-2.5 -right-2.5 z-10 flex h-6 min-w-6 items-center justify-center gap-1 rounded-full border-2 border-superficie px-1.5 text-xs font-bold text-white',
            info.listos > 0 ? 'bg-exito-600 motion-safe:animate-latido' : 'bg-marca-600',
          )}
          title={info.listos > 0 ? `${info.listos} pedido(s) listo(s) para entregar` : `${info.activos} pedido(s) en curso`}
        >
          {info.listos > 0 ? <ConciergeBell aria-hidden size={13} /> : info.activos}
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
    <div
      className="overflow-auto rounded-tarjeta border border-borde bg-superficie"
      style={{ maxHeight: '70dvh', backgroundImage: PUNTOS_GRILLA, backgroundSize: `${SNAP * 2}px ${SNAP * 2}px`, backgroundAttachment: 'local' }}
    >
      <DndContext sensors={sensors} onDragStart={() => setArrastrando(true)} onDragEnd={alSoltar} onDragCancel={() => setArrastrando(false)}>
        <div
          className={`relative ${arrastrando ? 'select-none' : ''}`}
          style={{
            width: ancho,
            height: alto,
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
