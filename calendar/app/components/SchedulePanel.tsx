'use client'

import { cn } from '@/lib/utils'
import { CalendarEvent, EventColor, ViewMode } from '../types'
import { isSameDay, getWeekDays, startOfWeek, formatTime, toZoned } from '../lib/dateUtils'
import { useAppSettings } from '../lib/settings-context'
import { useT } from '../lib/i18n/useT'

const DOT: Record<EventColor, string> = {
  indigo: 'bg-indigo-400', violet: 'bg-violet-400', rose: 'bg-rose-400',
  emerald: 'bg-emerald-400', amber: 'bg-amber-400', sky: 'bg-sky-400',
}

function getDays(currentDate: Date, viewMode: ViewMode, weekStartsOnMonday: boolean, today: Date): Date[] {
  if (viewMode === 'day') return [currentDate]
  if (viewMode === 'week') {
    const weekDays = getWeekDays(startOfWeek(currentDate, weekStartsOnMonday))
    const todayIdx = weekDays.findIndex(d => isSameDay(d, today))
    if (todayIdx >= 0) {
      return [...weekDays.slice(todayIdx), ...weekDays.slice(0, todayIdx)]
    }
    return weekDays
  }

  // Month: all days of the month, starting from today if we're viewing the current month
  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const allDays = Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1))

  const todayIdx = allDays.findIndex(d => isSameDay(d, today))
  if (todayIdx >= 0) {
    return [...allDays.slice(todayIdx), ...allDays.slice(0, todayIdx)]
  }
  return allDays
}

interface SchedulePanelProps {
  events: CalendarEvent[]
  currentDate: Date
  viewMode: ViewMode
  onEditEvent: (event: CalendarEvent) => void
}

export function SchedulePanel({ events, currentDate, viewMode, onEditEvent }: SchedulePanelProps) {
  const { startWeekMonday, hour24, timezone } = useAppSettings()
  const { t, locale } = useT()
  const today = toZoned(new Date(), timezone)
  const days = getDays(currentDate, viewMode, startWeekMonday, today)

  const eventsForDay = (day: Date) =>
    events
      .filter(e => isSameDay(toZoned(e.start, timezone), day))
      .sort((a, b) => a.start.getTime() - b.start.getTime())

  return (
    <>
      <div className="px-4 py-2.5 border-b border-border/30 bg-background shrink-0">
        <span className="text-xs font-medium text-muted-foreground">
          {t('schedule.title')}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {days.map((day, i) => {
          const dayEvents = eventsForDay(day)
          const isToday = isSameDay(day, today)
          return (
            <div key={day.toDateString()} className="px-3 py-2 border-b border-border/20">
              {/* Day label — matches TimeGrid header style */}
              <div className="flex items-center gap-1.5 mb-2">
                <span className={cn(
                  'text-sm',
                  isToday ? 'text-muted-foreground' : 'text-muted-foreground/60'
                )}>
                  {day.toLocaleDateString(locale, { weekday: 'short' })}
                </span>
                <span className={cn(
                  'text-sm font-semibold w-7 h-7 flex items-center justify-center rounded-md transition-all',
                  isToday ? 'bg-primary text-primary-foreground' : 'text-foreground'
                )}>
                  {day.getDate()}
                </span>
              </div>

              {/* Events */}
              {dayEvents.length === 0 ? (
                <p className="text-xs text-muted-foreground/30 italic">{t('schedule.noEvents')}</p>
              ) : (
                <div className="space-y-1.5">
                  {dayEvents.map(ev => (
                    <button
                      key={ev.id}
                      onClick={() => onEditEvent(ev)}
                      className="w-full flex items-start gap-2 text-left group/ev"
                    >
                      <div className={cn('w-2 h-2 rounded-full mt-1 flex-shrink-0', DOT[ev.color])} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground truncate group-hover/ev:text-foreground transition-colors">
                          {ev.title}
                        </p>
                        <p className="text-[10px] text-muted-foreground/40">
                          {ev.type === 'deadline'
                            ? formatTime(toZoned(ev.start, timezone), !hour24)
                            : `${formatTime(toZoned(ev.start, timezone), !hour24)}–${formatTime(toZoned(ev.end, timezone), !hour24)}`}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </>
  )
}
