'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { RecurrenceRule } from '../types'
import { useT } from '../lib/i18n/useT'

// Weekday picker order (Mon…Sun). Labels are localized at render via Intl.
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0]

const toIso = (d: Date) => d.toISOString().slice(0, 10)

interface Props {
  open: boolean
  anchor: Date                 // the event's start date — its weekday is locked on
  initialRule?: RecurrenceRule
  onDone: (rule: RecurrenceRule) => void
  onClose: () => void
}

export function CustomRecurrenceModal({ open, anchor, initialRule, onDone, onClose }: Props) {
  const { t, locale } = useT()
  // Localized one-letter weekday labels indexed by getDay() (0=Sun … 6=Sat).
  const narrowFmt = new Intl.DateTimeFormat(locale, { weekday: 'narrow' })
  const dayLabel = (dow: number) => narrowFmt.format(new Date(2024, 0, 7 + dow))
  const anchorDow = anchor.getDay()
  const [days, setDays] = useState<number[]>([anchorDow])
  const [interval, setInterval] = useState(1)
  const [endMode, setEndMode] = useState<'never' | 'on'>('never')
  const [endDate, setEndDate] = useState<string>(toIso(anchor))

  useEffect(() => {
    if (!open) return
    if (initialRule) {
      setDays(initialRule.daysOfWeek.includes(anchorDow) ? initialRule.daysOfWeek : [...initialRule.daysOfWeek, anchorDow])
      setInterval(Math.max(1, initialRule.intervalWeeks))
      setEndMode(initialRule.endDate ? 'on' : 'never')
      setEndDate(initialRule.endDate ?? toIso(anchor))
    } else {
      setDays([anchorDow])
      setInterval(1)
      setEndMode('never')
      setEndDate(toIso(anchor))
    }
  }, [open, initialRule, anchorDow, anchor])

  const toggleDay = (dow: number) => {
    if (dow === anchorDow) return // locked on
    setDays(prev => prev.includes(dow) ? prev.filter(d => d !== dow) : [...prev, dow])
  }

  const handleDone = () => {
    onDone({
      daysOfWeek: [...days].sort((a, b) => a - b),
      intervalWeeks: Math.max(1, interval),
      endDate: endMode === 'on' ? endDate : null,
      anchorDate: toIso(anchor),
    })
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-xs bg-background border border-border shadow-xl">
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold text-foreground">{t('recurrence.customTitle')}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 mt-1">
          {/* Days of week */}
          <div>
            <p className="text-xs text-muted-foreground/60 mb-1.5">{t('recurrence.repeatOn')}</p>
            <div className="flex gap-1.5">
              {DAY_ORDER.map((dow) => {
                const active = days.includes(dow)
                const locked = dow === anchorDow
                return (
                  <button
                    key={dow}
                    type="button"
                    onClick={() => toggleDay(dow)}
                    aria-pressed={active}
                    className={`h-8 w-8 rounded-full text-xs font-medium transition-colors uppercase ${
                      active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    } ${locked ? 'cursor-default opacity-90' : ''}`}
                  >
                    {dayLabel(dow)}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Interval */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground/60">{t('recurrence.every')}</span>
            <Input
              type="number"
              min={1}
              value={interval}
              onChange={(e) => setInterval(Math.max(1, Number(e.target.value) || 1))}
              className="w-16 h-8 text-sm bg-muted/50 border-border"
            />
            <span className="text-xs text-muted-foreground/60">{t('recurrence.weeksUnit')}</span>
          </div>

          {/* End */}
          <div>
            <p className="text-xs text-muted-foreground/60 mb-1.5">{t('recurrence.ends')}</p>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 text-xs text-foreground">
                <input type="radio" checked={endMode === 'never'} onChange={() => setEndMode('never')} />
                {t('recurrence.endsNever')}
              </label>
              <label className="flex items-center gap-1.5 text-xs text-foreground">
                <input type="radio" checked={endMode === 'on'} onChange={() => setEndMode('on')} />
                {t('recurrence.endsOn')}
              </label>
              {endMode === 'on' && (
                <Input
                  type="date"
                  value={endDate}
                  min={toIso(anchor)}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="h-8 text-sm bg-muted/50 border-border flex-1"
                />
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="px-3 py-1.5 rounded-md text-xs font-medium text-muted-foreground hover:bg-muted transition-colors">
              {t('common.cancel')}
            </button>
            <button type="button" onClick={handleDone} className="px-3 py-1.5 rounded-md text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
              {t('common.done')}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
