import { startOfWeek, addDays } from './dateUtils'
import type { CalendarEvent, RecurrenceRule } from '../types'
import type { Translate } from './i18n/useT'

const MONDAY_FIRST_ORDER = [1, 2, 3, 4, 5, 6, 0]                          // for display ordering

// Localized short weekday names indexed by getDay() (0=Sun … 6=Sat).
function weekdayShortNames(locale: string): string[] {
  const fmt = new Intl.DateTimeFormat(locale, { weekday: 'short' })
  // 2024-01-07 is a Sunday → index 0 aligns with getDay().
  return Array.from({ length: 7 }, (_, i) => fmt.format(new Date(2024, 0, 7 + i)))
}

// Offset (0-6) of a getDay() weekday from the Monday that starts its week.
function offsetFromMonday(dow: number): number {
  return (dow + 6) % 7
}

// Combine a date's calendar day with a reference datetime's time-of-day.
function withTimeOf(day: Date, ref: Date): Date {
  const d = new Date(day)
  d.setHours(ref.getHours(), ref.getMinutes(), ref.getSeconds(), ref.getMilliseconds())
  return d
}

// End of the calendar day for an ISO date string (yyyy-mm-dd), local time.
function endOfIsoDay(iso: string): Date {
  const d = new Date(`${iso}T00:00:00`)
  d.setHours(23, 59, 59, 999)
  return d
}

interface GenerateArgs {
  anchor: Date            // occurrence #1 (date + time)
  rule: RecurrenceRule
  until: Date             // inclusive cap (horizon)
  after?: Date            // exclusive lower bound; when set, anchor is NOT auto-included (top-up)
}

// Generate occurrence start datetimes for a custom weekly rule.
export function generateCustomOccurrences({ anchor, rule, until, after }: GenerateArgs): Date[] {
  const cap = rule.endDate ? new Date(Math.min(until.getTime(), endOfIsoDay(rule.endDate).getTime())) : until
  const lowerExclusive = after ? after.getTime() : anchor.getTime() // strictly-greater bound for generated dates
  const monday = startOfWeek(anchor) // Monday of the anchor's week
  const days = [...rule.daysOfWeek].sort((a, b) => offsetFromMonday(a) - offsetFromMonday(b))
  const interval = Math.max(1, rule.intervalWeeks)

  const results: Date[] = []
  if (after === undefined) results.push(anchor) // anchor is always occurrence #1 on initial generation

  for (let week = 0; ; week++) {
    if (week % interval !== 0) continue
    const weekStart = addDays(monday, week * 7)
    if (weekStart.getTime() > cap.getTime()) break
    for (const dow of days) {
      const day = addDays(weekStart, offsetFromMonday(dow))
      const occ = withTimeOf(day, anchor)
      if (occ.getTime() > lowerExclusive && occ.getTime() <= cap.getTime()) {
        results.push(occ)
      }
    }
  }
  return results
}

// Short, human label for the dropdown chip. End-date is shown separately in the UI.
export function summarizeRecurrenceRule(rule: RecurrenceRule, t: Translate, locale = 'en-US'): string {
  const names = weekdayShortNames(locale)
  const ordered = MONDAY_FIRST_ORDER.filter(d => rule.daysOfWeek.includes(d))
  const dayList = ordered.map(d => names[d]).join(', ')
  const freq = rule.intervalWeeks === 1
    ? t('recurrence.summaryWeekly')
    : t('recurrence.summaryEveryWeeks', { count: rule.intervalWeeks })
  return t('recurrence.summaryOn', { freq, days: dayList })
}

interface TopUpOpts {
  bufferWeeks: number  // extend if the last occurrence is within this many weeks of the viewed date
  aheadWeeks: number   // how far past the viewed date to generate
}

// For each open-ended custom series whose tail is near the viewed date, build the
// new (id-less) events needed to extend it. Returns [] when nothing needs extending.
export function buildTopUpEvents(
  events: CalendarEvent[],
  viewedDate: Date,
  { bufferWeeks, aheadWeeks }: TopUpOpts,
): Omit<CalendarEvent, 'id'>[] {
  const groups = new Map<string, CalendarEvent[]>()
  for (const e of events) {
    if (e.recurrence !== 'custom' || !e.recurrenceGroupId || !e.recurrenceRule) continue
    if (e.recurrenceRule.endDate !== null) continue // only open-ended series roll forward
    const arr = groups.get(e.recurrenceGroupId) ?? []
    arr.push(e)
    groups.set(e.recurrenceGroupId, arr)
  }

  const out: Omit<CalendarEvent, 'id'>[] = []
  const bufferMs = bufferWeeks * 7 * 24 * 60 * 60 * 1000
  const until = addDays(viewedDate, aheadWeeks * 7)

  for (const arr of groups.values()) {
    const latest = arr.reduce((a, b) => (a.start >= b.start ? a : b))
    if (latest.start.getTime() - viewedDate.getTime() > bufferMs) continue // tail too far ahead, skip
    const anchor = new Date(latest.recurrenceRule!.anchorDate + 'T00:00:00')
    const template = arr[0]
    const duration = template.end.getTime() - template.start.getTime()
    const newStarts = generateCustomOccurrences({
      anchor: withTimeOf(anchor, latest.start),
      rule: latest.recurrenceRule!,
      until,
      after: latest.start,
    })
    for (const start of newStarts) {
      out.push({
        title: template.title,
        start,
        end: new Date(start.getTime() + duration),
        color: template.color,
        notes: template.notes,
        allDay: template.allDay,
        recurrence: 'custom',
        recurrenceGroupId: template.recurrenceGroupId,
        recurrenceRule: latest.recurrenceRule,
        courseId: template.courseId,
        type: template.type,
      })
    }
  }
  return out
}
