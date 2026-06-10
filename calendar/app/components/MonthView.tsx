'use client'

import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { CalendarEvent, Course, EventColor } from '../types'
import { isSameDay, isSameMonth, getMonthGrid, formatTime, weekdayLabels, toZoned } from '../lib/dateUtils'
import { resolveEventColor } from '../lib/courseUtils'
import { useAppSettings } from '../lib/settings-context'
import { useT } from '../lib/i18n/useT'

const EVENT_DOT: Record<EventColor, string> = {
  indigo:  'bg-indigo-400',
  violet:  'bg-violet-400',
  rose:    'bg-rose-400',
  emerald: 'bg-emerald-400',
  amber:   'bg-amber-400',
  sky:     'bg-sky-400',
}

const EVENT_BAR: Record<EventColor, string> = {
  indigo:  'bg-indigo-100 text-indigo-700 border-l-2 border-indigo-400 dark:bg-indigo-500/20 dark:text-indigo-200',
  violet:  'bg-violet-100 text-violet-700 border-l-2 border-violet-400 dark:bg-violet-500/20 dark:text-violet-200',
  rose:    'bg-rose-100 text-rose-700 border-l-2 border-rose-400 dark:bg-rose-500/20 dark:text-rose-200',
  emerald: 'bg-emerald-100 text-emerald-700 border-l-2 border-emerald-400 dark:bg-emerald-500/20 dark:text-emerald-200',
  amber:   'bg-amber-100 text-amber-700 border-l-2 border-amber-400 dark:bg-amber-500/20 dark:text-amber-200',
  sky:     'bg-sky-100 text-sky-700 border-l-2 border-sky-400 dark:bg-sky-500/20 dark:text-sky-200',
}

interface MonthViewProps {
  currentDate: Date
  selectedDay: Date
  events: CalendarEvent[]
  onDayClick: (date: Date) => void
  onSelectDay: (date: Date) => void
  onEventClick: (event: CalendarEvent) => void
  courses: Course[]
}

export function MonthView({ currentDate, selectedDay, events, onDayClick, onSelectDay, onEventClick, courses }: MonthViewProps) {
  const { startWeekMonday, hour24, timezone } = useAppSettings()
  const { t, locale } = useT()
  const weekdays = weekdayLabels(locale, startWeekMonday, 'short')
  const grid = getMonthGrid(currentDate, startWeekMonday)
  const today = toZoned(new Date(), timezone)

  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const weeks: (Date | null)[][] = []
  for (let i = 0; i < grid.length; i += 7) weeks.push(grid.slice(i, i + 7))

  const eventsForDay = (day: Date) =>
    events
      .filter((e) => isSameDay(toZoned(e.start, timezone), day))
      .sort((a, b) => a.start.getTime() - b.start.getTime())

  const selectedDayEvents = eventsForDay(selectedDay)

  const handleDayClick = (day: Date) => {
    if (isMobile) {
      onSelectDay(day)
    } else {
      onDayClick(day)
    }
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Month grid */}
      <div className={cn('flex flex-col', isMobile ? 'shrink-0' : 'flex-1 overflow-hidden')}>
        {/* Weekday header */}
        <div className="grid grid-cols-7 border-b border-border shrink-0">
          {weekdays.map((d, i) => (
            <div key={i} className="py-2 text-center text-xs font-medium text-muted-foreground/60 border-l first:border-l-0 border-border/30 capitalize">
              {d}
            </div>
          ))}
        </div>

        {/* Week rows */}
        <div
          className={cn('grid', !isMobile && 'flex-1 overflow-hidden')}
          style={
            isMobile
              ? { gridTemplateRows: `repeat(${weeks.length}, 48px)` }
              : { gridTemplateRows: `repeat(${weeks.length}, 1fr)` }
          }
        >
          {weeks.map((week, wi) => (
            <div key={wi} className="grid grid-cols-7 border-b border-border/30 last:border-b-0">
              {week.map((day, di) => {
                if (!day) return (
                  <div key={di} className="border-l first:border-l-0 border-border/30 bg-muted/50" />
                )

                const isToday    = isSameDay(day, today)
                const isSelected = isMobile && isSameDay(day, selectedDay)
                const isCurrent  = isSameMonth(day, currentDate)
                const dayEvents  = eventsForDay(day)

                return (
                  <div
                    key={di}
                    onClick={() => handleDayClick(day)}
                    className={cn(
                      'border-l first:border-l-0 border-border/30 cursor-pointer overflow-hidden transition-colors',
                      isMobile
                        ? cn('flex flex-col items-center justify-center gap-0.5 p-1',
                            isSelected && !isToday && 'bg-muted')
                        : cn('p-1.5 group hover:bg-muted', !isCurrent && 'bg-muted/50')
                    )}
                  >
                    {/* Day number */}
                    <span
                      className={cn(
                        'flex items-center justify-center transition-all',
                        isMobile
                          ? cn('text-xs w-6 h-6 rounded-full',
                              isToday
                                ? 'bg-primary text-primary-foreground font-semibold'
                                : isSelected
                                ? 'bg-muted text-foreground font-semibold'
                                : isCurrent
                                ? 'text-foreground'
                                : 'text-muted-foreground')
                          : cn('text-xs font-medium w-6 h-6 rounded-md mb-1',
                              isToday
                                ? 'bg-primary text-primary-foreground'
                                : isCurrent
                                ? 'text-foreground'
                                : 'text-muted-foreground')
                      )}
                    >
                      {day.getDate()}
                    </span>

                    {/* Mobile: event dots */}
                    {isMobile && dayEvents.length > 0 && (
                      <div className="flex gap-[3px] justify-center">
                        {dayEvents.slice(0, 3).map((ev) => (
                          <div key={ev.id} className={cn('w-1 h-1 rounded-full', EVENT_DOT[resolveEventColor(ev, courses)])} />
                        ))}
                      </div>
                    )}

                    {/* Desktop: event bars */}
                    {!isMobile && (() => {
                      const dayDeadlines    = dayEvents.filter(e => e.type === 'deadline')
                      const dayNonDeadlines = dayEvents.filter(e => e.type !== 'deadline')
                      const showCount = 3
                      return (
                        <div className="space-y-0.5">
                          {dayDeadlines.slice(0, 2).map(ev => (
                            <button
                              key={ev.id}
                              onClick={(e) => { e.stopPropagation(); onEventClick(ev) }}
                              className={`w-full text-left text-[10px] font-medium px-1 py-0.5 rounded truncate block ${EVENT_BAR[resolveEventColor(ev, courses)]}`}
                            >
                              ◆ {ev.title}
                            </button>
                          ))}
                          {dayNonDeadlines.slice(0, Math.max(0, showCount - dayDeadlines.length)).map(ev => (
                            <button
                              key={ev.id}
                              onClick={(e) => { e.stopPropagation(); onEventClick(ev) }}
                              className={`w-full text-left text-[10px] font-medium px-1 py-0.5 rounded truncate block ${EVENT_BAR[resolveEventColor(ev, courses)]}`}
                            >
                              {ev.title}
                            </button>
                          ))}
                          {dayEvents.length > showCount && (
                            <p className="text-[10px] text-muted-foreground/60 px-1">
                              {t('common.more', { count: dayEvents.length - showCount })}
                            </p>
                          )}
                        </div>
                      )
                    })()}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Mobile: selected day event list */}
      {isMobile && (
        <div className="flex-1 overflow-y-auto border-t border-border">
          {/* Sticky day header */}
          <div className="px-4 py-2.5 border-b border-border/30 bg-background sticky top-0 z-10">
            <div className="flex items-center gap-2">
              <span className={cn('text-sm', isSameDay(selectedDay, today) ? 'text-muted-foreground' : 'text-muted-foreground/60')}>
                {selectedDay.toLocaleDateString(locale, { weekday: 'short' })}
              </span>
              <span className={cn(
                'text-sm font-semibold w-7 h-7 flex items-center justify-center rounded-md',
                isSameDay(selectedDay, today) ? 'bg-primary text-primary-foreground' : 'text-foreground'
              )}>
                {selectedDay.getDate()}
              </span>
              <span className="text-xs text-muted-foreground/40 capitalize">
                {selectedDay.toLocaleDateString(locale, { month: 'long', year: 'numeric' })}
              </span>
            </div>
          </div>

          {/* Event list */}
          <div className="px-4 py-2">
            {selectedDayEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground/40 italic py-6 text-center">{t('common.noEvents')}</p>
            ) : (
              <div className="divide-y divide-border/20">
                {selectedDayEvents.map(ev => (
                  <button
                    key={ev.id}
                    onClick={() => onEventClick(ev)}
                    className="w-full flex items-start gap-3 text-left py-3 active:bg-muted transition-colors"
                  >
                    <div className={cn('w-2 h-2 rounded-full mt-1.5 shrink-0', EVENT_DOT[resolveEventColor(ev, courses)])} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{ev.title}</p>
                      <p className="text-xs text-muted-foreground/50 mt-0.5">
                        {formatTime(toZoned(ev.start, timezone), !hour24)} – {formatTime(toZoned(ev.end, timezone), !hour24)}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
