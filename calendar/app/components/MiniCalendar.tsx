'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ViewMode } from '../types'
import {
  isSameDay,
  isSameMonth,
  startOfWeek,
  getMonthGrid,
  addMonths,
  weekdayLabels,
  toZoned,
} from '../lib/dateUtils'
import { useAppSettings } from '../lib/settings-context'
import { useT } from '../lib/i18n/useT'

interface MiniCalendarProps {
  selectedDate: Date
  viewMode: ViewMode
  onSelectDate: (date: Date) => void
}

export function MiniCalendar({ selectedDate, viewMode, onSelectDate }: MiniCalendarProps) {
  const { startWeekMonday, timezone } = useAppSettings()
  const { locale } = useT()
  const [viewDate, setViewDate] = useState(new Date(selectedDate))

  const weekdays = weekdayLabels(locale, startWeekMonday, 'narrow')
  const grid = getMonthGrid(viewDate, startWeekMonday)
  const today = toZoned(new Date(), timezone)

  const weekStart = startOfWeek(selectedDate, startWeekMonday)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 6)
  const inSelectedWeek = (d: Date) =>
    viewMode === 'week' && d >= weekStart && d <= weekEnd

  const monthLabel = viewDate.toLocaleDateString(locale, {
    month: 'long',
    year: 'numeric',
  })

  return (
    <aside className="flex-1 bg-background px-3 py-4 flex flex-col gap-4">
      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setViewDate(addMonths(viewDate, -1))}
          className="p-1 rounded hover:bg-foreground/5 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft size={13} />
        </button>
        <span className="text-[11px] font-semibold text-muted-foreground tracking-wide capitalize">
          {monthLabel}
        </span>
        <button
          onClick={() => setViewDate(addMonths(viewDate, 1))}
          className="p-1 rounded hover:bg-foreground/5 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronRight size={13} />
        </button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7">
        {weekdays.map((d, i) => (
          <div
            key={i}
            className="text-[9px] font-semibold text-muted-foreground/40 text-center py-0.5 uppercase tracking-wide"
          >
            {d}
          </div>
        ))}

        {/* Day cells */}
        {grid.map((day, i) => {
          if (!day) return <div key={i} />

          const isToday    = isSameDay(day, today)
          const isSelected = isSameDay(day, selectedDate) && viewMode === 'day'
          const isWeek     = inSelectedWeek(day)
          const isCurrentMonth = isSameMonth(day, viewDate)
          const colIndex   = i % 7
          const isWeekBand = isWeek && !isToday && !isSelected

          return (
            <div
              key={i}
              className={cn(
                isWeekBand && 'bg-muted',
                isWeekBand && colIndex === 0 && 'rounded-l-md',
                isWeekBand && colIndex === 6 && 'rounded-r-md',
              )}
            >
              <button
                onClick={() => onSelectDate(day)}
                className={cn(
                  'text-[11px] w-7 h-7 mx-auto flex items-center justify-center rounded-md transition-all duration-100',
                  isToday
                    ? 'bg-primary text-primary-foreground font-semibold'
                    : isSelected
                    ? 'bg-primary text-primary-foreground font-semibold'
                    : isWeek
                    ? 'text-foreground font-medium hover:bg-muted'
                    : isCurrentMonth
                    ? 'text-foreground hover:bg-muted'
                    : 'text-muted-foreground hover:bg-muted'
                )}
              >
                {day.getDate()}
              </button>
            </div>
          )
        })}
      </div>
    </aside>
  )
}
