'use client'

import { useState, useEffect, useRef } from 'react'
import { Trash2, ChevronDown, ChevronLeft, ChevronRight, Check } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { CalendarEvent, Course, EventColor, RecurrenceRule, RecurrenceType } from '../types'
import { CustomRecurrenceModal } from './CustomRecurrenceModal'
import { summarizeRecurrenceRule } from '../lib/recurrence'
import { isSameDay, isSameMonth, getMonthGrid, addMonths, weekdayLabels, toZoned, fromZoned } from '../lib/dateUtils'
import { useT } from '../lib/i18n/useT'
import { useAppSettings } from '../lib/settings-context'

const COLOR_OPTIONS: { value: EventColor; bg: string; ring: string }[] = [
  { value: 'indigo', bg: 'bg-indigo-500', ring: 'ring-indigo-400' },
  { value: 'violet', bg: 'bg-violet-500', ring: 'ring-violet-400' },
  { value: 'rose', bg: 'bg-rose-500', ring: 'ring-rose-400' },
  { value: 'emerald', bg: 'bg-emerald-500', ring: 'ring-emerald-400' },
  { value: 'amber', bg: 'bg-amber-500', ring: 'ring-amber-400' },
  { value: 'sky', bg: 'bg-sky-500', ring: 'ring-sky-400' },
]

const COURSE_DOT_COLOR: Record<string, string> = {
  indigo: '#818cf8', violet: '#a78bfa', rose: '#fb7185',
  emerald: '#34d399', amber: '#fbbf24', sky: '#38bdf8',
}

function toTimeStr(d: Date) {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

const TIME_OPTIONS = Array.from({ length: 96 }, (_, i) => {
  const h = Math.floor(i / 4)
  const m = (i % 4) * 15
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
})

// ─── DatePickerDropdown ───────────────────────────────────────────────────────

function DatePickerDropdown({ value, onChange }: { value: Date; onChange: (d: Date) => void }) {
  const { locale } = useT()
  const [viewMonth, setViewMonth] = useState(new Date(value))
  const [open, setOpen] = useState(false)
  const today = new Date()

  useEffect(() => { setViewMonth(new Date(value)) }, [value])

  const grid = getMonthGrid(viewMonth)
  const label = value.toLocaleDateString(locale, { weekday: 'short', month: 'short', day: 'numeric' })
  const monthLabel = viewMonth.toLocaleDateString(locale, { month: 'short', year: 'numeric' })
  const narrowWeekdays = weekdayLabels(locale, true, 'narrow')

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-muted border border-border hover:bg-muted transition-colors text-foreground outline-none">
        {label}
        <ChevronDown size={11} className="text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="p-2 w-[196px]">
        <div className="flex items-center justify-between mb-2">
          <button
            onClick={() => setViewMonth(addMonths(viewMonth, -1))}
            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft size={12} />
          </button>
          <span className="text-[11px] font-semibold text-muted-foreground">{monthLabel}</span>
          <button
            onClick={() => setViewMonth(addMonths(viewMonth, 1))}
            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronRight size={12} />
          </button>
        </div>
        <div className="grid grid-cols-7">
          {narrowWeekdays.map((d, i) => (
            <div key={i} className="text-[9px] font-semibold text-muted-foreground/40 text-center py-0.5">
              {d}
            </div>
          ))}
          {grid.map((day, i) => {
            if (!day) return <div key={i} />
            const isToday    = isSameDay(day, today)
            const isSelected = isSameDay(day, value)
            const isCurrentMonth = isSameMonth(day, viewMonth)
            return (
              <button
                key={i}
                onClick={() => { onChange(day); setOpen(false) }}
                className={cn(
                  'text-[11px] w-6 h-6 mx-auto flex items-center justify-center rounded transition-all',
                  isSelected
                    ? 'bg-primary text-primary-foreground font-semibold'
                    : isToday
                    ? 'bg-muted text-foreground font-semibold'
                    : isCurrentMonth
                    ? 'text-foreground hover:bg-muted'
                    : 'text-muted-foreground hover:bg-muted'
                )}
              >
                {day.getDate()}
              </button>
            )
          })}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// ─── TimeDropdown ─────────────────────────────────────────────────────────────

function TimeDropdown({ value, onChange }: { value: string; onChange: (t: string) => void }) {
  const [open, setOpen] = useState(false)
  const [inputVal, setInputVal] = useState(value)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Sync input when value changes externally (modal reset)
  useEffect(() => { setInputVal(value) }, [value])

  // Auto-scroll to selected time when dropdown opens
  useEffect(() => {
    if (!open) return
    requestAnimationFrame(() => {
      scrollRef.current?.querySelector('[data-selected="true"]')?.scrollIntoView({ block: 'center' })
    })
  }, [open])

  const commit = (raw: string) => {
    const parts = raw.trim().split(':')
    if (parts.length === 2) {
      const h = parseInt(parts[0], 10)
      const m = parseInt(parts[1], 10)
      if (!isNaN(h) && !isNaN(m) && h >= 0 && h <= 23 && m >= 0 && m <= 59) {
        const normalized = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
        onChange(normalized)
        setInputVal(normalized)
        return
      }
    }
    setInputVal(value) // revert to last valid
  }

  const options = TIME_OPTIONS.includes(value)
    ? TIME_OPTIONS
    : [...TIME_OPTIONS, value].sort()

  return (
    <div className="flex items-center">
      <input
        type="text"
        value={inputVal}
        onChange={e => setInputVal(e.target.value)}
        onBlur={e => commit(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') commit(inputVal) }}
        placeholder="HH:MM"
        className="w-[52px] h-7 font-mono text-xs px-2 bg-muted border border-border border-r-0 rounded-l-md outline-none focus:bg-card focus:border-ring transition-colors text-foreground"
      />
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger className="h-7 px-1.5 bg-muted border border-border rounded-r-md hover:bg-muted transition-colors outline-none flex items-center">
          <ChevronDown size={11} className="text-muted-foreground" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="p-0 min-w-[90px]">
          <div ref={scrollRef} className="max-h-48 overflow-y-auto py-1">
            {options.map(t => (
              <DropdownMenuItem
                key={t}
                data-selected={t === value ? 'true' : undefined}
                onClick={() => { onChange(t); setInputVal(t) }}
                className={cn('font-mono text-xs gap-3', t === value && 'font-semibold')}
              >
                {t}
                {t === value && <Check size={11} className="ml-auto text-foreground" />}
              </DropdownMenuItem>
            ))}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

function applyTime(base: Date, timeStr: string): Date {
  const [h, m] = timeStr.split(':').map(Number)
  const d = new Date(base)
  d.setHours(h, m, 0, 0)
  return d
}

const RECURRENCE_OPTIONS: { value: RecurrenceType; labelKey: string }[] = [
  { value: 'none',      labelKey: 'recurrence.never'    },
  { value: 'daily',     labelKey: 'recurrence.daily'    },
  { value: 'weekdays',  labelKey: 'recurrence.weekdays' },
  { value: 'weekends',  labelKey: 'recurrence.weekends' },
  { value: 'weekly',    labelKey: 'recurrence.weekly'   },
  { value: 'biweekly',  labelKey: 'recurrence.biweekly' },
  { value: 'monthly',   labelKey: 'recurrence.monthly'  },
  { value: 'yearly',    labelKey: 'recurrence.yearly'   },
  { value: 'custom',    labelKey: 'recurrence.custom'   },
]

interface Props {
  open: boolean
  event?: CalendarEvent
  defaultStart?: Date
  defaultEnd?: Date
  defaultTitle?: string
  onSave: (data: Omit<CalendarEvent, 'id'>, recurrence: RecurrenceType, rule?: RecurrenceRule) => void
  onDelete?: () => void
  onClose: () => void
  courses: Course[]
  onOpenCourses?: () => void
}

export function EventModal({ open, event, defaultStart, defaultEnd, defaultTitle, onSave, onDelete, onClose, courses, onOpenCourses }: Props) {
  const { t, locale } = useT()
  const { timezone } = useAppSettings()
  const [title, setTitle] = useState('')
  const [startStr, setStartStr] = useState('09:00')
  const [endStr, setEndStr] = useState('10:00')
  const [color, setColor] = useState<EventColor>('indigo')
  const [notes, setNotes] = useState('')
  const [baseDate, setBaseDate] = useState(new Date())
  const [recurrence, setRecurrence] = useState<RecurrenceType>('none')
  const [recurrenceRule, setRecurrenceRule] = useState<RecurrenceRule | undefined>(undefined)
  const [customOpen, setCustomOpen] = useState(false)
  const [type, setType]         = useState<'event' | 'deadline'>('event')
  const [courseId, setCourseId] = useState<string | undefined>(undefined)

  useEffect(() => {
    if (!open) return
    if (event) {
      // Show the event's wall-clock in the active timezone.
      const zStart = toZoned(event.start, timezone)
      const zEnd = toZoned(event.end, timezone)
      setTitle(event.title)
      setStartStr(toTimeStr(zStart))
      setEndStr(toTimeStr(zEnd))
      setColor(event.color)
      setNotes(event.notes ?? '')
      setBaseDate(zStart)
      setRecurrence(event.recurrence ?? 'none')
      setRecurrenceRule(event.recurrenceRule)
      setType(event?.type ?? 'event')
      setCourseId(event?.courseId)
    } else {
      setTitle(defaultTitle ?? '')
      const s = toZoned(defaultStart ?? new Date(), timezone)
      const e = toZoned(defaultEnd ?? new Date((defaultStart ?? new Date()).getTime() + 60 * 60 * 1000), timezone)
      setStartStr(toTimeStr(s))
      setEndStr(toTimeStr(e))
      setColor('indigo')
      setNotes('')
      setBaseDate(s)
      setRecurrence('none')
      setRecurrenceRule(undefined)
      setType('event')
      setCourseId(undefined)
    }
  }, [open, event, defaultStart, defaultEnd, defaultTitle, timezone])

  const valid = title.trim().length > 0

  const handleSave = () => {
    if (!valid) return
    // baseDate + times are wall-clock in the active timezone; convert the
    // chosen instants back to absolute time before persisting.
    const startInstant = fromZoned(applyTime(baseDate, startStr), timezone)
    const endInstant = fromZoned(applyTime(baseDate, type === 'deadline' ? startStr : endStr), timezone)
    onSave(
      {
        title: title.trim(),
        start: startInstant,
        end: endInstant,
        color,
        notes,
        type,
        courseId: courseId || undefined,
      },
      recurrence,
      recurrence === 'custom' ? recurrenceRule : undefined,
    )
    onClose()
  }

  return (
    <>
    <Dialog open={open && !customOpen} onOpenChange={(v) => { if (!v && !customOpen) onClose() }}>
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-xs overflow-hidden bg-background border border-border shadow-xl">
        <div className="relative">

          <DialogHeader>
            <DialogTitle className="text-sm font-semibold text-foreground">
              {event
                ? (event.type === 'deadline' ? t('event.deadline') : t('event.event'))
                : (type === 'deadline' ? t('event.newDeadline') : t('event.newEvent'))}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 mt-1">
            {/* Title */}
            <Input
              placeholder={t('event.addTitle')}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              autoFocus
              className="
              text-xl bg-transparent border-0 border-b border-border
              rounded-none px-0 h-auto pb-2 focus-visible:ring-0 focus-visible:border-primary
              placeholder:text-muted-foreground/40 transition-colors
            "
            />

            {/* Type toggle */}
            <div className="flex rounded-md overflow-hidden border border-border w-fit">
              {(['event', 'deadline'] as const).map(ty => (
                <button
                  key={ty}
                  type="button"
                  onClick={() => setType(ty)}
                  className={cn(
                    'px-3 py-1 text-xs font-medium transition-colors',
                    type === ty
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  )}
                >
                  {ty === 'deadline' ? t('event.typeDeadline') : t('event.typeEvent')}
                </button>
              ))}
            </div>

            {/* Date */}
            <div>
              <p className="text-xs text-muted-foreground/60 mb-1.5">{t('event.date')}</p>
              <DatePickerDropdown value={baseDate} onChange={setBaseDate} />
            </div>

            {/* Time */}
            <div>
              {type === 'event' ? (
                <>
                  <p className="text-xs text-muted-foreground/60 mb-1.5">{t('event.time')}</p>
                  <div className="flex items-center gap-2">
                    <TimeDropdown value={startStr} onChange={setStartStr} />
                    <span className="text-muted-foreground/40 text-xs">→</span>
                    <TimeDropdown value={endStr} onChange={setEndStr} />
                  </div>
                </>
              ) : (
                <>
                  <p className="text-xs text-muted-foreground/60 mb-1.5">{t('event.dueAt')}</p>
                  <TimeDropdown value={startStr} onChange={setStartStr} />
                </>
              )}
            </div>

            {/* Color */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-muted-foreground/60">{t('event.color')}</p>
                {courseId && (
                  <span className="text-[10px] text-muted-foreground/40">{t('event.setByLabel')}</span>
                )}
              </div>
              <div className={cn('flex gap-2', courseId && 'opacity-30 pointer-events-none')}>
                {COLOR_OPTIONS.map((c) => (
                  <button
                    key={c.value}
                    onClick={() => setColor(c.value)}
                    className={`
                    w-6 h-6 rounded-full transition-all duration-150
                    ${c.bg}
                    ${color === c.value
                        ? `ring-2 ring-offset-2 ring-offset-background ${c.ring} scale-110`
                        : 'opacity-40 hover:opacity-75 hover:scale-105'
                      }
                  `}
                    aria-label={c.value}
                  />
                ))}
              </div>
            </div>

            {/* Course selector */}
            {courses.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground/60 mb-1.5">{t('event.label')}</p>
                <div className="flex flex-wrap gap-1.5">
                  {courses.map(course => (
                    <button
                      key={course.id}
                      type="button"
                      onClick={() => setCourseId(courseId === course.id ? undefined : course.id)}
                      className={cn(
                        'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all',
                        courseId === course.id
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-border text-muted-foreground hover:border-muted-foreground'
                      )}
                    >
                      <span
                        style={{
                          width: 8, height: 8, borderRadius: '50%',
                          backgroundColor: COURSE_DOT_COLOR[course.color] ?? '#818cf8',
                          display: 'inline-block', flexShrink: 0,
                        }}
                      />
                      {course.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {courses.length === 0 && onOpenCourses && (
              <button
                type="button"
                onClick={onOpenCourses}
                className="text-xs text-muted-foreground/50 hover:text-muted-foreground underline underline-offset-2 transition-colors"
              >
                {t('event.addLabel')}
              </button>
            )}

            {/* Repeat */}
            <div>
              <p className="text-xs text-muted-foreground/60 mb-1.5">{t('event.repeat')}</p>
              <DropdownMenu>
                <DropdownMenuTrigger className="w-full flex items-center justify-between gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-muted border border-border hover:bg-muted transition-colors text-foreground outline-none">
                  {recurrence === 'custom' && recurrenceRule
                    ? summarizeRecurrenceRule(recurrenceRule, t, locale)
                    : t(RECURRENCE_OPTIONS.find(o => o.value === recurrence)?.labelKey ?? 'recurrence.never')}
                  <ChevronDown size={11} className="text-muted-foreground" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-[140px]">
                  {RECURRENCE_OPTIONS.filter(({ value }) => {
                    const dow = baseDate.getDay()
                    const isWeekend = dow === 0 || dow === 6
                    if (value === 'weekdays') return !isWeekend
                    if (value === 'weekends') return isWeekend
                    return true
                  }).map(({ value, labelKey }) => (
                    <DropdownMenuItem
                      key={value}
                      onClick={() => {
                        if (value === 'custom') { setCustomOpen(true) }
                        else { setRecurrence(value); setRecurrenceRule(undefined) }
                      }}
                      className="flex items-center justify-between gap-3"
                    >
                      {t(labelKey)}
                      {recurrence === value && <Check size={13} className="text-foreground" />}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Notes */}
            <Textarea
              placeholder={t('event.addNotes')}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="bg-muted/50 border-border resize-none min-h-[72px] text-sm placeholder:text-muted-foreground/40 focus-visible:border-primary"
            />
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between mt-5">
            <div>
              {onDelete && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onDelete}
                  className="text-rose-400/70 hover:text-rose-400 hover:bg-rose-500/10 h-8 px-3"
                >
                  <Trash2 size={13} className="mr-1.5" />
                  {t('common.delete')}
                </Button>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-8 px-3 text-muted-foreground hover:text-foreground"
              >
                {t('common.cancel')}
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={!valid}
                className="h-8 px-4 bg-primary hover:bg-primary/90 text-primary-foreground border-0 disabled:opacity-30"
              >
                {event ? t('common.save') : t('common.create')}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    <CustomRecurrenceModal
      open={customOpen}
      anchor={baseDate}
      initialRule={recurrence === 'custom' ? recurrenceRule : undefined}
      onClose={() => setCustomOpen(false)}
      onDone={(rule) => { setRecurrence('custom'); setRecurrenceRule(rule) }}
    />
    </>
  )
}
