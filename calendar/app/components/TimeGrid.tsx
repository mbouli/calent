'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { cn } from '@/lib/utils'
import { CalendarEvent, Course, ViewMode } from '../types'
import { EventBlock, HOUR_HEIGHT } from './EventBlock'
import { resolveEventColor } from '../lib/courseUtils'
import {
  isSameDay,
  minutesFromMidnight,
  getWeekDays,
  startOfWeek,
  dateAtMinutes,
  formatHourLabel,
  formatTime,
  toZoned,
  fromZoned,
} from '../lib/dateUtils'
import { useAppSettings } from '../lib/settings-context'
import { useT } from '../lib/i18n/useT'

const HOURS = Array.from({ length: 24 }, (_, i) => i)
const TIME_LABEL_W = 56

const DEADLINE_CHIP: Record<string, string> = {
  indigo:  'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/25 dark:text-indigo-200',
  violet:  'bg-violet-100 text-violet-700 dark:bg-violet-500/25 dark:text-violet-200',
  rose:    'bg-rose-100 text-rose-700 dark:bg-rose-500/25 dark:text-rose-200',
  emerald: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/25 dark:text-emerald-200',
  amber:   'bg-amber-100 text-amber-700 dark:bg-amber-500/25 dark:text-amber-200',
  sky:     'bg-sky-100 text-sky-700 dark:bg-sky-500/25 dark:text-sky-200',
}

function layoutEvents(events: CalendarEvent[]) {
  if (!events.length) return []
  const sorted = [...events].sort((a, b) => a.start.getTime() - b.start.getTime())
  const colEnds: Date[] = []
  const eventCols: number[] = []

  for (const ev of sorted) {
    let placed = false
    for (let c = 0; c < colEnds.length; c++) {
      if (ev.start >= colEnds[c]) {
        colEnds[c] = ev.end
        eventCols.push(c)
        placed = true
        break
      }
    }
    if (!placed) {
      colEnds.push(ev.end)
      eventCols.push(colEnds.length - 1)
    }
  }

  return sorted.map((event, i) => {
    let maxCol = eventCols[i]
    for (let j = 0; j < sorted.length; j++) {
      if (sorted[j].start < event.end && sorted[j].end > event.start) {
        maxCol = Math.max(maxCol, eventCols[j])
      }
    }
    return { event, col: eventCols[i], totalCols: maxCol + 1 }
  })
}

const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? '100%' : '-100%', opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit:  (dir: number) => ({ x: dir > 0 ? '-100%' : '100%', opacity: 0 }),
}

interface TimeGridProps {
  events: CalendarEvent[]
  currentDate: Date
  viewMode: ViewMode
  navDirection: number
  animKey: string
  onCreateEvent: (start: Date, end: Date) => void
  onEditEvent: (event: CalendarEvent) => void
  onUpdateEvent: (id: string, updates: Partial<Omit<CalendarEvent, 'id'>>) => void
  onDeleteEvent: (id: string) => void
  courses: Course[]
}

export function TimeGrid({
  events,
  currentDate,
  viewMode,
  navDirection,
  animKey,
  onCreateEvent,
  onEditEvent,
  onUpdateEvent,
  onDeleteEvent,
  courses,
}: TimeGridProps) {
  const { startWeekMonday, hour24, timezone } = useAppSettings()
  const { locale } = useT()
  const scrollRef = useRef<HTMLDivElement>(null)
  const [rawNow, setRawNow] = useState(() => new Date())

  useEffect(() => {
    const id = setInterval(() => setRawNow(new Date()), 60_000)
    return () => clearInterval(id)
  }, [])

  // Render the whole grid in the chosen timezone by working with zoned dates.
  const now = toZoned(rawNow, timezone)
  const nowMinutes = minutesFromMidnight(now)
  const nowTop = (nowMinutes / 60) * HOUR_HEIGHT

  const days =
    viewMode === 'week' ? getWeekDays(startOfWeek(currentDate, startWeekMonday)) : [currentDate]

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTop = Math.max(0, nowTop - el.clientHeight * 0.75)
  }, [viewMode]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleColumnClick = (day: Date, e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const y = e.clientY - rect.top
    const snapped = Math.floor((y / HOUR_HEIGHT * 60) / 15) * 15
    const clamped = Math.min(snapped, 24 * 60 - 60)
    // `day` carries the zoned calendar date; convert the picked wall-clock back
    // to an absolute instant before persisting.
    onCreateEvent(
      fromZoned(dateAtMinutes(day, clamped), timezone),
      fromZoned(dateAtMinutes(day, clamped + 60), timezone),
    )
  }

  const isToday = (d: Date) => isSameDay(d, now)
  const showsToday = days.some(d => isToday(d))

  // Zoned start for an event, used for day-bucketing and positioning.
  const zonedStart = (e: CalendarEvent) => toZoned(e.start, timezone)

  const timeEvents = events.filter(e => e.type !== 'deadline')
  const deadlinesByDay = new Map<string, CalendarEvent[]>()
  const hasAnyDeadlines = events.some(e => e.type === 'deadline')
  for (const ev of events.filter(e => e.type === 'deadline')) {
    const key = zonedStart(ev).toDateString()
    if (!deadlinesByDay.has(key)) deadlinesByDay.set(key, [])
    deadlinesByDay.get(key)!.push(ev)
  }

  const nowTimeLabel = hour24
    ? formatTime(now, false)
    : now.toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit', hour12: true })

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Sticky day-header row */}
      <div className="flex shrink-0 border-b border-border/40 bg-background" style={{ paddingLeft: TIME_LABEL_W }}>
        <div className="flex-1 relative overflow-hidden h-14">
          <AnimatePresence initial={false} custom={navDirection}>
            <motion.div
              key={animKey}
              className="absolute inset-0 flex"
              custom={navDirection}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
            >
              {days.map((day, i) => (
                <div
                  key={i}
                  className="flex-1 min-w-0 flex items-center justify-center border-l border-border/30"
                >
                  <div className="flex flex-col items-center gap-0.5 md:flex-row md:gap-1.5">
                    <span className={cn(
                      'text-sm',
                      isToday(day) ? 'text-muted-foreground' : 'text-muted-foreground/60'
                    )}>
                      {day.toLocaleDateString(locale, { weekday: 'short' })}
                    </span>
                    <span className={cn(
                      'text-sm font-semibold w-7 h-7 flex items-center justify-center rounded-md transition-all',
                      isToday(day)
                        ? 'bg-primary text-primary-foreground'
                        : 'text-foreground'
                    )}>
                      {day.getDate()}
                    </span>
                  </div>
                </div>
              ))}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Deadline chips row — always rendered when any deadlines exist so the
          inner AnimatePresence slide matches the day-header and body animations */}
      {hasAnyDeadlines && (
        <div
          className="flex shrink-0 border-b border-border/30 bg-background"
          style={{ paddingLeft: TIME_LABEL_W }}
        >
          <div className="flex-1 relative overflow-hidden h-[34px]">
            <AnimatePresence initial={false} custom={navDirection}>
              <motion.div
                key={animKey}
                className="absolute inset-0 flex"
                custom={navDirection}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
              >
                {days.map((day, i) => {
                  const chips = deadlinesByDay.get(day.toDateString()) ?? []
                  return (
                    <div
                      key={i}
                      className="flex-1 flex flex-col gap-0.5 px-1 py-1 border-l border-border/30 first:border-l-0 overflow-hidden"
                    >
                      {chips.slice(0, 1).map(ev => {
                        const chip = DEADLINE_CHIP[resolveEventColor(ev, courses)] ?? DEADLINE_CHIP.indigo
                        return (
                          <button
                            key={ev.id}
                            onClick={() => onEditEvent(ev)}
                            className={cn('flex items-center gap-1 px-1.5 py-0.5 rounded text-left w-full hover:opacity-80 transition-opacity', chip)}
                          >
                            <span className="text-[9px] font-medium truncate">
                              ◆ {ev.title}
                            </span>
                          </button>
                        )
                      })}
                      {chips.length > 1 && (
                        <span className="text-[9px] text-muted-foreground/50 px-1">
                          +{chips.length - 1} more
                        </span>
                      )}
                    </div>
                  )
                })}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Scrollable body */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="flex" style={{ height: HOUR_HEIGHT * 24 }}>
          {/* Hour labels */}
          <div className="shrink-0 relative" style={{ width: TIME_LABEL_W, minWidth: TIME_LABEL_W }}>
            {HOURS.map((h) => {
              const tooClose = showsToday && Math.abs(nowMinutes - h * 60) < 14
              return (
                <div
                  key={h}
                  style={{ top: h * HOUR_HEIGHT }}
                  className="absolute w-full flex justify-end pr-3"
                >
                  {h > 0 && !tooClose && (
                    <span className="text-[10px] text-muted-foreground/50 -translate-y-1/2 tabular-nums">
                      {formatHourLabel(h, !hour24)}
                    </span>
                  )}
                </div>
              )
            })}

            {/* Current time label in red */}
            {showsToday && (
              <div
                style={{ top: nowTop }}
                className="absolute w-full flex justify-end pr-3 z-10 pointer-events-none"
              >
                <span className="text-[10px] font-semibold text-rose-500 -translate-y-1/2 tabular-nums whitespace-nowrap">
                  {nowTimeLabel}
                </span>
              </div>
            )}
          </div>

          {/* Animated day columns */}
          <div className="flex-1 relative overflow-hidden">

            <AnimatePresence initial={false} custom={navDirection}>
              <motion.div
                key={animKey}
                className="absolute inset-0 flex"
                custom={navDirection}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
              >
                {days.map((day, di) => {
                  const dayEvents = timeEvents.filter((e) => isSameDay(zonedStart(e), day))
                  const laid = layoutEvents(dayEvents)
                  return (
                    <div
                      key={di}
                      className="flex-1 relative border-l border-border/30"
                      style={{ height: HOUR_HEIGHT * 24 }}
                      onClick={(e) => handleColumnClick(day, e)}
                    >
                      {/* Hour lines */}
                      {HOURS.map((h) => (
                        <div
                          key={h}
                          style={{ top: h * HOUR_HEIGHT }}
                          className="absolute inset-x-0 h-px bg-border/60"
                        />
                      ))}
                      {/* 30-min lines */}
                      {HOURS.map((h) => (
                        <div
                          key={`half-${h}`}
                          style={{ top: h * HOUR_HEIGHT + HOUR_HEIGHT / 2 }}
                          className="absolute inset-x-0 h-px bg-border/35"
                        />
                      ))}
                      {/* 15-min lines */}
                      {HOURS.map((h) => (
                        <div
                          key={`q15-${h}`}
                          style={{ top: h * HOUR_HEIGHT + HOUR_HEIGHT * 0.25 }}
                          className="absolute inset-x-0 h-px bg-border/20"
                        />
                      ))}
                      {/* 45-min lines */}
                      {HOURS.map((h) => (
                        <div
                          key={`q45-${h}`}
                          style={{ top: h * HOUR_HEIGHT + HOUR_HEIGHT * 0.75 }}
                          className="absolute inset-x-0 h-px bg-border/20"
                        />
                      ))}

                      {/* Current time indicator — solid for today, dashed for other columns in the same week */}
                      {isToday(day) ? (
                        <div
                          style={{ top: nowTop }}
                          className="absolute inset-x-0 pointer-events-none"
                        >
                          <div className="absolute w-2 h-2 rounded-full bg-rose-500 -left-1 -translate-y-1/2 shadow-[0_0_5px_2px_rgba(239,68,68,0.35)]" />
                          <div className="h-px bg-rose-500/70" />
                        </div>
                      ) : showsToday && (
                        <div
                          style={{ top: nowTop }}
                          className="absolute inset-x-0 pointer-events-none border-t border-dashed border-rose-400/40"
                        />
                      )}

                      {laid.map(({ event, col, totalCols }) => (
                        <EventBlock
                          key={event.id}
                          event={event}
                          col={col}
                          totalCols={totalCols}
                          onEdit={() => onEditEvent(event)}
                          onDelete={() => onDeleteEvent(event.id)}
                          onDragEnd={(s, e) => onUpdateEvent(event.id, { start: s, end: e })}
                          containerDay={day}
                          timeZone={timezone}
                          courses={courses}
                        />
                      ))}
                    </div>
                  )
                })}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  )
}
