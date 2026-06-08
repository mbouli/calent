'use client'

import { useRef, useState, useCallback } from 'react'
import { X } from 'lucide-react'
import { CalendarEvent, Course, EventColor } from '../types'
import { minutesFromMidnight, dateAtMinutes, formatTime, toZoned, fromZoned } from '../lib/dateUtils'
import { useAppSettings } from '../lib/settings-context'
import { resolveEventColor } from '../lib/courseUtils'

export const HOUR_HEIGHT = 64

// Light-mode chips are tinted -50 backgrounds; dark themes use a translucent
// colored fill with lighter text so they read on the dark canvas.
const COLORS: Record<EventColor, { bg: string; border: string; title: string; time: string }> = {
  indigo: { bg: 'bg-indigo-50 dark:bg-indigo-500/20',   border: 'border-l-indigo-500',  title: 'text-indigo-800 dark:text-indigo-200',   time: 'text-indigo-400 dark:text-indigo-300/80'   },
  violet: { bg: 'bg-violet-50 dark:bg-violet-500/20',   border: 'border-l-violet-500',  title: 'text-violet-800 dark:text-violet-200',   time: 'text-violet-400 dark:text-violet-300/80'   },
  rose:   { bg: 'bg-rose-50 dark:bg-rose-500/20',       border: 'border-l-rose-500',    title: 'text-rose-800 dark:text-rose-200',       time: 'text-rose-400 dark:text-rose-300/80'       },
  emerald:{ bg: 'bg-emerald-50 dark:bg-emerald-500/20', border: 'border-l-emerald-500', title: 'text-emerald-800 dark:text-emerald-200', time: 'text-emerald-500 dark:text-emerald-300/80' },
  amber:  { bg: 'bg-amber-50 dark:bg-amber-500/20',     border: 'border-l-amber-500',   title: 'text-amber-800 dark:text-amber-200',     time: 'text-amber-500 dark:text-amber-300/80'     },
  sky:    { bg: 'bg-sky-50 dark:bg-sky-500/20',         border: 'border-l-sky-500',     title: 'text-sky-800 dark:text-sky-200',         time: 'text-sky-500 dark:text-sky-300/80'         },
}

interface EventBlockProps {
  event: CalendarEvent
  col: number
  totalCols: number
  onEdit: () => void
  onDelete: () => void
  onDragEnd: (newStart: Date, newEnd: Date) => void
  containerDay: Date
  timeZone: string
  courses: Course[]
}

export function EventBlock({
  event,
  col,
  totalCols,
  onEdit,
  onDelete,
  onDragEnd,
  containerDay,
  timeZone,
  courses,
}: EventBlockProps) {
  const { hour24 } = useAppSettings()
  // Position and label using the event's wall-clock in the active timezone.
  const zStart = toZoned(event.start, timeZone)
  const zEnd = toZoned(event.end, timeZone)
  const startMinutes = minutesFromMidnight(zStart)
  const endMinutes = minutesFromMidnight(zEnd)
  const durationMinutes = Math.max(endMinutes - startMinutes, 15)

  const top = (startMinutes / 60) * HOUR_HEIGHT
  const height = Math.max((durationMinutes / 60) * HOUR_HEIGHT, 18)
  const widthPct = 100 / totalCols
  const leftPct = (col / totalCols) * 100

  const c = COLORS[resolveEventColor(event, courses)] ?? COLORS.indigo

  const showTime = height > 34
  const lineHeight = 15 // text-xs (12px) × leading-tight (1.25)
  const paddingY = 8    // py-1 top + bottom
  const timeHeight = showTime ? 14 : 0
  const maxTitleLines = Math.max(1, Math.floor((height - paddingY - timeHeight) / lineHeight))

  const dragStartY = useRef<number | null>(null)
  const origStartMinutes = useRef(startMinutes)
  const [isDragging, setIsDragging] = useState(false)
  const [dragDeltaMinutes, setDragDeltaMinutes] = useState(0)

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if ((e.target as HTMLElement).closest('[data-delete]')) return
      e.preventDefault()
      e.stopPropagation()
      e.currentTarget.setPointerCapture(e.pointerId)
      dragStartY.current = e.clientY
      origStartMinutes.current = startMinutes
      setIsDragging(false)
      setDragDeltaMinutes(0)
    },
    [startMinutes]
  )

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (dragStartY.current === null) return
      const deltaY = e.clientY - dragStartY.current
      if (Math.abs(deltaY) > 6) setIsDragging(true)
      const rawDelta = (deltaY / HOUR_HEIGHT) * 60
      setDragDeltaMinutes(Math.round(rawDelta / 15) * 15)
    },
    []
  )

  const onPointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (dragStartY.current === null) return
      if (isDragging && dragDeltaMinutes !== 0) {
        const newStart = Math.max(0, Math.min(origStartMinutes.current + dragDeltaMinutes, 24 * 60 - durationMinutes))
        const newEnd = newStart + durationMinutes
        // containerDay is the zoned calendar day; convert the new wall-clock
        // times back to absolute instants before persisting.
        onDragEnd(
          fromZoned(dateAtMinutes(containerDay, newStart), timeZone),
          fromZoned(dateAtMinutes(containerDay, newEnd), timeZone),
        )
      } else if (!isDragging) {
        onEdit()
      }
      dragStartY.current = null
      setIsDragging(false)
      setDragDeltaMinutes(0)
    },
    [isDragging, dragDeltaMinutes, durationMinutes, containerDay, timeZone, onDragEnd, onEdit]
  )

  const onPointerCancel = useCallback(() => {
    dragStartY.current = null
    setIsDragging(false)
    setDragDeltaMinutes(0)
  }, [])

  const displayTop = top + (isDragging ? (dragDeltaMinutes / 60) * HOUR_HEIGHT : 0)

  return (
    <div
      style={{
        position: 'absolute',
        top: displayTop,
        height,
        left: `calc(${leftPct}% + 2px)`,
        width: `calc(${widthPct}% - 4px)`,
        zIndex: isDragging ? 50 : 10,
        cursor: isDragging ? 'grabbing' : 'grab',
        touchAction: 'none',
        transition: isDragging ? 'none' : 'box-shadow 0.15s',
      }}
      className={`
        rounded-md border-l-2 px-2 py-1 overflow-hidden select-none group
        ${c.bg} ${c.border}
        ${isDragging ? 'shadow-2xl ring-1 ring-black/10 opacity-90' : 'hover:brightness-95 hover:shadow-md'}
      `}
      onClick={(e) => e.stopPropagation()}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
    >
      <div className="flex items-start justify-between gap-1 h-full">
        <div className="min-w-0 flex-1">
          <div
            className={`text-xs font-semibold leading-tight overflow-hidden ${c.title}`}
            style={{
              display: '-webkit-box',
              WebkitBoxOrient: 'vertical',
              WebkitLineClamp: maxTitleLines,
            }}
          >
            {event.title}
          </div>
          {showTime && (
            <div className={`text-[10px] font-mono mt-0.5 ${c.time}`}>
              {formatTime(zStart, !hour24)}–{formatTime(zEnd, !hour24)}
            </div>
          )}
        </div>
        <button
          data-delete="true"
          onClick={(e) => {
            e.stopPropagation()
            onDelete()
          }}
          className={`
            opacity-0 group-hover:opacity-100 transition-opacity shrink-0
            p-0.5 rounded hover:bg-foreground/10 ${c.title}
          `}
        >
          <X size={10} />
        </button>
      </div>
    </div>
  )
}
