'use client'

import { useState, useEffect } from 'react'
import { CalendarEvent, Course } from '../types'
import {
  resolveEventColor,
  getUpcomingDeadlines,
  getPastDueDeadlines,
  formatDeadlineRelative,
} from '../lib/courseUtils'
import { cn } from '@/lib/utils'
import { toZoned } from '../lib/dateUtils'
import { useAppSettings } from '../lib/settings-context'
import { useT } from '../lib/i18n/useT'

const DOT: Record<string, string> = {
  indigo:  'bg-indigo-400',
  violet:  'bg-violet-400',
  rose:    'bg-rose-400',
  emerald: 'bg-emerald-400',
  amber:   'bg-amber-400',
  sky:     'bg-sky-400',
}

interface DeadlinePanelProps {
  events: CalendarEvent[]
  courses: Course[]
  onDeadlineClick: (event: CalendarEvent) => void
}

export function DeadlinePanel({ events, courses, onDeadlineClick }: DeadlinePanelProps) {
  const { t } = useT()
  const { timezone } = useAppSettings()
  const [now, setNow] = useState(() => new Date())

  // Tick every minute so relative times stay accurate
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(id)
  }, [])

  const upcoming = getUpcomingDeadlines(events)
  const pastDue  = getPastDueDeadlines(events)
  const hasAny   = upcoming.length > 0 || pastDue.length > 0

  return (
    <div className="px-3 py-3 border-t border-border/20">
      <p className="text-[10px] font-semibold text-muted-foreground/40 uppercase tracking-widest mb-2">
        {t('deadlines.title')}
      </p>

      {!hasAny && (
        <p className="text-[10px] text-muted-foreground/30 italic">{t('deadlines.none')}</p>
      )}

      <div className="overflow-y-auto max-h-40 space-y-0.5">
        {pastDue.map(ev => (
          <button
            key={ev.id}
            onClick={() => onDeadlineClick(ev)}
            className="w-full flex items-center gap-2 py-1 text-left group"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0" />
            <span className="flex-1 text-[11px] text-rose-400/80 truncate group-hover:text-rose-500 transition-colors">
              {ev.title}
            </span>
            <span className="text-[10px] text-rose-400/50 shrink-0 tabular-nums">
              {formatDeadlineRelative(toZoned(ev.start, timezone), toZoned(now, timezone), t)}
            </span>
          </button>
        ))}

        {upcoming.map(ev => {
          const color = resolveEventColor(ev, courses)
          return (
            <button
              key={ev.id}
              onClick={() => onDeadlineClick(ev)}
              className="w-full flex items-center gap-2 py-1 text-left group"
            >
              <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', DOT[color])} />
              <span className="flex-1 text-[11px] text-foreground/70 truncate group-hover:text-foreground transition-colors">
                {ev.title}
              </span>
              <span className="text-[10px] text-muted-foreground/40 shrink-0 tabular-nums">
                {formatDeadlineRelative(toZoned(ev.start, timezone), toZoned(now, timezone), t)}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
