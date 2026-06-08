# Custom Event Recurrence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users define a custom event repeat rule — pick weekdays, repeat every N weeks, end on a date or never — materialized into real event rows that auto-extend ("roll forward") as the user navigates.

**Architecture:** Recurrence stays materialized (real rows sharing a `recurrence_group_id`). All date math lives in a new pure module `app/lib/recurrence.ts` (unit-tested with vitest). The custom rule is persisted as a denormalized `recurrence_rule` JSONB column on every row in a series. Open-ended series are topped-up to ~1 year ahead whenever `currentDate` changes.

**Tech Stack:** Next.js 16, React 19, TypeScript, Supabase (schema managed in dashboard), vitest (added here), npm.

---

## File Structure

- `app/lib/recurrence.ts` — **new.** Pure functions: occurrence generation, top-up planning, rule summary. No React, no Supabase. The testable core.
- `app/lib/recurrence.test.ts` — **new.** Vitest unit tests for the above.
- `vitest.config.ts` — **new.** Minimal vitest config.
- `app/types/index.ts` — add `'custom'` to `RecurrenceType`; add `RecurrenceRule`; add `recurrenceRule` to `CalendarEvent`.
- `app/lib/db-types.ts` — add `recurrence_rule` to `EventRow`; map it in `rowToEvent`/`eventToRow`.
- `app/hooks/useCalendarStore.ts` — add `recurrence_rule` to `EVENT_COLUMNS`; run rolling top-up on `currentDate` change.
- `app/u/page.tsx` — `generateRecurringEvents` custom branch; pass rule through `handleSave`.
- `app/components/CustomRecurrenceModal.tsx` — **new.** The day/interval/end builder dialog.
- `app/components/EventModal.tsx` — add "Custom…" option, open the builder, show summary chip, extend `onSave` to carry the rule.
- One-time Supabase SQL (run by the user — see Task 4).

---

## Task 1: Set up vitest test harness

**Files:**
- Create: `vitest.config.ts`
- Modify: `package.json` (devDependencies + `test` script)

- [ ] **Step 1: Install vitest**

Run:
```bash
npm install -D vitest@^3
```
Expected: vitest added to devDependencies, no errors.

- [ ] **Step 2: Add the test script**

In `package.json`, add to the `"scripts"` block (after `"lint": "eslint"`):
```json
    "lint": "eslint",
    "test": "vitest run"
```

- [ ] **Step 3: Create vitest config**

Create `vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['app/**/*.test.ts'],
  },
})
```

- [ ] **Step 4: Verify the runner works (no tests yet)**

Run: `npm test`
Expected: exits 0 with "No test files found" (or similar). The runner is wired up.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json vitest.config.ts
git commit -m "test: add vitest harness"
```

---

## Task 2: Extend the type model

**Files:**
- Modify: `app/types/index.ts`

- [ ] **Step 1: Add `'custom'` to `RecurrenceType` and define `RecurrenceRule`**

In `app/types/index.ts`, replace the `RecurrenceType` line (line 3):
```ts
export type RecurrenceType = 'none' | 'daily' | 'weekdays' | 'weekends' | 'weekly' | 'biweekly' | 'monthly' | 'yearly' | 'custom'

export interface RecurrenceRule {
  daysOfWeek: number[]     // 0 = Sun … 6 = Sat
  intervalWeeks: number    // "every N weeks", >= 1
  endDate: string | null   // ISO date (yyyy-mm-dd), or null = never
  anchorDate: string       // ISO date of occurrence #1 — origin for week counting
}
```

- [ ] **Step 2: Add `recurrenceRule` to `CalendarEvent`**

In the `CalendarEvent` interface, after the `recurrence?: RecurrenceType` line:
```ts
  recurrence?: RecurrenceType
  recurrenceRule?: RecurrenceRule
```

- [ ] **Step 3: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no new errors from `app/types/index.ts`.

- [ ] **Step 4: Commit**

```bash
git add app/types/index.ts
git commit -m "feat(types): add custom recurrence rule type"
```

---

## Task 3: Pure recurrence engine (TDD)

The week origin is **Monday** (the app's `startOfWeek` defaults to Monday-first). Day-of-week numbers are JS `getDay()` values (0=Sun…6=Sat). Offset of a weekday from Monday is `(dow + 6) % 7`.

**Files:**
- Create: `app/lib/recurrence.test.ts`
- Create: `app/lib/recurrence.ts`

- [ ] **Step 1: Write the failing tests**

Create `app/lib/recurrence.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { generateCustomOccurrences, summarizeRecurrenceRule, buildTopUpEvents } from './recurrence'
import type { CalendarEvent, RecurrenceRule } from '../types'

// 2026-06-01 is a Monday.
const at = (iso: string) => new Date(iso)

describe('generateCustomOccurrences', () => {
  it('includes the anchor as occurrence #1 and repeats weekly on one day', () => {
    const anchor = at('2026-06-03T10:00:00') // Wed
    const rule: RecurrenceRule = { daysOfWeek: [3], intervalWeeks: 1, endDate: null, anchorDate: '2026-06-03' }
    const out = generateCustomOccurrences({ anchor, rule, until: at('2026-06-30T23:59:59') })
    expect(out.map(d => d.toISOString().slice(0, 10))).toEqual([
      '2026-06-03', '2026-06-10', '2026-06-17', '2026-06-24',
    ])
  })

  it('preserves the anchor time-of-day on every occurrence', () => {
    const anchor = at('2026-06-03T10:30:00')
    const rule: RecurrenceRule = { daysOfWeek: [3], intervalWeeks: 1, endDate: null, anchorDate: '2026-06-03' }
    const out = generateCustomOccurrences({ anchor, rule, until: at('2026-06-17T23:59:59') })
    expect(out.every(d => d.getHours() === 10 && d.getMinutes() === 30)).toBe(true)
  })

  it('emits every selected weekday within a week, in date order', () => {
    const anchor = at('2026-06-01T09:00:00') // Mon
    const rule: RecurrenceRule = { daysOfWeek: [1, 3, 5], intervalWeeks: 1, endDate: null, anchorDate: '2026-06-01' }
    const out = generateCustomOccurrences({ anchor, rule, until: at('2026-06-12T23:59:59') })
    expect(out.map(d => d.toISOString().slice(0, 10))).toEqual([
      '2026-06-01', '2026-06-03', '2026-06-05', '2026-06-08', '2026-06-10', '2026-06-12',
    ])
  })

  it('respects the every-N-weeks interval', () => {
    const anchor = at('2026-06-01T09:00:00') // Mon
    const rule: RecurrenceRule = { daysOfWeek: [1], intervalWeeks: 2, endDate: null, anchorDate: '2026-06-01' }
    const out = generateCustomOccurrences({ anchor, rule, until: at('2026-07-15T23:59:59') })
    expect(out.map(d => d.toISOString().slice(0, 10))).toEqual([
      '2026-06-01', '2026-06-15', '2026-06-29', '2026-07-13',
    ])
  })

  it('stops on the end date (inclusive of that calendar day)', () => {
    const anchor = at('2026-06-01T09:00:00')
    const rule: RecurrenceRule = { daysOfWeek: [1], intervalWeeks: 1, endDate: '2026-06-15', anchorDate: '2026-06-01' }
    const out = generateCustomOccurrences({ anchor, rule, until: at('2026-12-31T23:59:59') })
    expect(out.map(d => d.toISOString().slice(0, 10))).toEqual([
      '2026-06-01', '2026-06-08', '2026-06-15',
    ])
  })

  it('with `after` set, excludes the anchor and anything <= after (top-up mode)', () => {
    const anchor = at('2026-06-01T09:00:00')
    const rule: RecurrenceRule = { daysOfWeek: [1], intervalWeeks: 1, endDate: null, anchorDate: '2026-06-01' }
    const out = generateCustomOccurrences({ anchor, rule, until: at('2026-06-29T23:59:59'), after: at('2026-06-08T09:00:00') })
    expect(out.map(d => d.toISOString().slice(0, 10))).toEqual([
      '2026-06-15', '2026-06-22', '2026-06-29',
    ])
  })
})

describe('summarizeRecurrenceRule', () => {
  it('summarizes weekly (interval 1)', () => {
    expect(summarizeRecurrenceRule({ daysOfWeek: [1], intervalWeeks: 1, endDate: null, anchorDate: '2026-06-01' }))
      .toBe('Weekly on Mon')
  })
  it('summarizes every-N-weeks with multiple days in Monday-first order', () => {
    expect(summarizeRecurrenceRule({ daysOfWeek: [3, 1], intervalWeeks: 2, endDate: null, anchorDate: '2026-06-01' }))
      .toBe('Every 2 weeks on Mon, Wed')
  })
})

describe('buildTopUpEvents', () => {
  const baseEvent = (start: string, groupId: string, rule: RecurrenceRule): CalendarEvent => ({
    id: crypto.randomUUID(),
    title: 'Standup',
    start: at(start),
    end: new Date(at(start).getTime() + 30 * 60 * 1000),
    color: 'indigo',
    recurrence: 'custom',
    recurrenceGroupId: groupId,
    recurrenceRule: rule,
  })

  it('extends an open-ended series whose last occurrence is within the buffer of the viewed date', () => {
    const rule: RecurrenceRule = { daysOfWeek: [1], intervalWeeks: 1, endDate: null, anchorDate: '2026-06-01' }
    // Series currently runs 06-01 and 06-08 only; viewing near the end.
    const events = [baseEvent('2026-06-01T09:00:00', 'g1', rule), baseEvent('2026-06-08T09:00:00', 'g1', rule)]
    const out = buildTopUpEvents(events, at('2026-06-08T00:00:00'), { bufferWeeks: 8, aheadWeeks: 4 })
    // New occurrences strictly after 06-08, up to ~4 weeks past the viewed date.
    expect(out.length).toBeGreaterThan(0)
    expect(out.every(e => e.start > at('2026-06-08T09:00:00'))).toBe(true)
    expect(out.every(e => e.recurrenceGroupId === 'g1')).toBe(true)
  })

  it('does not extend a series ending before the buffer window', () => {
    const rule: RecurrenceRule = { daysOfWeek: [1], intervalWeeks: 1, endDate: null, anchorDate: '2026-06-01' }
    const events = [baseEvent('2026-06-01T09:00:00', 'g1', rule)]
    // Last occurrence (06-01) is far ahead of the viewed date, well outside buffer.
    const out = buildTopUpEvents(events, at('2026-01-01T00:00:00'), { bufferWeeks: 8, aheadWeeks: 4 })
    expect(out).toEqual([])
  })

  it('ignores non-custom and closed-ended series', () => {
    const closed: RecurrenceRule = { daysOfWeek: [1], intervalWeeks: 1, endDate: '2026-06-08', anchorDate: '2026-06-01' }
    const events = [baseEvent('2026-06-08T09:00:00', 'g2', closed)]
    const out = buildTopUpEvents(events, at('2026-06-08T00:00:00'), { bufferWeeks: 8, aheadWeeks: 4 })
    expect(out).toEqual([])
  })
})
```

- [ ] **Step 2: Run the tests to confirm they fail**

Run: `npm test`
Expected: FAIL — `recurrence.ts` does not exist / exports undefined.

- [ ] **Step 3: Implement the engine**

Create `app/lib/recurrence.ts`:
```ts
import { startOfWeek, addDays } from './dateUtils'
import type { CalendarEvent, RecurrenceRule } from '../types'

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] // index = getDay()
const MONDAY_FIRST_ORDER = [1, 2, 3, 4, 5, 6, 0]                          // for display ordering

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
  const monday = startOfWeek(anchor) // Monday of the anchor's week, time = anchor's day midnight-ish per dateUtils
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
export function summarizeRecurrenceRule(rule: RecurrenceRule): string {
  const ordered = MONDAY_FIRST_ORDER.filter(d => rule.daysOfWeek.includes(d))
  const dayList = ordered.map(d => WEEKDAY_LABELS[d]).join(', ')
  const freq = rule.intervalWeeks === 1 ? 'Weekly' : `Every ${rule.intervalWeeks} weeks`
  return `${freq} on ${dayList}`
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
```

- [ ] **Step 4: Run the tests to confirm they pass**

Run: `npm test`
Expected: PASS — all `generateCustomOccurrences`, `summarizeRecurrenceRule`, and `buildTopUpEvents` tests green.

- [ ] **Step 5: Commit**

```bash
git add app/lib/recurrence.ts app/lib/recurrence.test.ts
git commit -m "feat(recurrence): pure custom-recurrence engine + top-up planner"
```

---

## Task 4: Persist the rule (DB mapping + SQL)

**Files:**
- Modify: `app/lib/db-types.ts`
- Modify: `app/hooks/useCalendarStore.ts:8-9` (`EVENT_COLUMNS`)

- [ ] **Step 1: Run the one-time Supabase SQL (user action)**

In the Supabase SQL editor, run:
```sql
alter table events add column recurrence_rule jsonb;
```
Then check the `recurrence` column type:
```sql
select data_type, udt_name from information_schema.columns
where table_name = 'events' and column_name = 'recurrence';
```
- If `data_type` is `text`/`character varying` → no further change needed.
- If `data_type` is `USER-DEFINED` (a PG enum, name in `udt_name`) → also run:
  ```sql
  alter type <udt_name> add value 'custom';
  ```

Expected: column added; `'custom'` is a valid `recurrence` value.

- [ ] **Step 2: Add `recurrence_rule` to `EventRow` and the mappers**

In `app/lib/db-types.ts`:

Add the import at the top (extend the existing import line):
```ts
import { CalendarEvent, Course, EventColor, RecurrenceRule, RecurrenceType, Sticky, StickyItem } from '../types'
```

Add to `EventRow` (after `recurrence_group_id`):
```ts
  recurrence_group_id: string | null
  recurrence_rule: RecurrenceRule | null
```

In `rowToEvent`, after the `recurrenceGroupId` line:
```ts
    recurrenceGroupId: r.recurrence_group_id ?? undefined,
    recurrenceRule: r.recurrence_rule ?? undefined,
```

In `eventToRow`, after the `recurrenceGroupId` line:
```ts
  if ('recurrenceGroupId' in e) row.recurrence_group_id = e.recurrenceGroupId ?? null
  if ('recurrenceRule' in e) row.recurrence_rule = e.recurrenceRule ?? null
```

- [ ] **Step 3: Add the column to the select list**

In `app/hooks/useCalendarStore.ts`, update `EVENT_COLUMNS` (line 8-9):
```ts
const EVENT_COLUMNS =
  'id, title, start, "end", color, notes, all_day, recurrence, recurrence_group_id, recurrence_rule, course_id, type'
```

- [ ] **Step 4: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 5: Commit**

```bash
git add app/lib/db-types.ts app/hooks/useCalendarStore.ts
git commit -m "feat(db): persist recurrence_rule on event rows"
```

---

## Task 5: Generate custom series on save

**Files:**
- Modify: `app/u/page.tsx:33-76` (`generateRecurringEvents`)
- Modify: `app/u/page.tsx:155-164` (`handleSave`)

- [ ] **Step 1: Add the custom branch to `generateRecurringEvents`**

In `app/u/page.tsx`, update the import from `../lib/dateUtils` and add the recurrence import:
```ts
import { startOfWeek, addDays, addMonths } from '../lib/dateUtils'
import { generateCustomOccurrences } from '../lib/recurrence'
import { CalendarEvent, RecurrenceType, RecurrenceRule } from '../types'
```

Change the `generateRecurringEvents` signature and add the custom branch. Replace the signature line and the `make` setup:
```ts
function generateRecurringEvents(
  base: Omit<CalendarEvent, 'id'>,
  recurrence: RecurrenceType,
  rule?: RecurrenceRule,
): Omit<CalendarEvent, 'id'>[] {
  const duration = base.end.getTime() - base.start.getTime()
  const groupId = crypto.randomUUID()
  const make = (start: Date): Omit<CalendarEvent, 'id'> => ({
    ...base,
    start,
    end: new Date(start.getTime() + duration),
    recurrenceGroupId: groupId,
    recurrence,
    recurrenceRule: rule,
  })

  if (recurrence === 'custom' && rule) {
    // Materialize ~1 year ahead; open-ended series get topped up later on navigate.
    const until = addDays(base.start, 52 * 7)
    return generateCustomOccurrences({ anchor: base.start, rule, until }).map(make)
  }

  const results: Omit<CalendarEvent, 'id'>[] = [make(base.start)]
```
(Leave the rest of the preset branches — `daily`/`weekdays`/etc. — unchanged below this point.)

- [ ] **Step 2: Thread the rule through `handleSave`**

Replace `handleSave` (lines 155-164):
```ts
  const handleSave = (
    data: Omit<CalendarEvent, 'id'>,
    recurrence: RecurrenceType,
    rule?: RecurrenceRule,
  ) => {
    if (modal.event) {
      // Editing a custom rule applies to this & future: drop future, regenerate forward.
      if (recurrence === 'custom' && rule) {
        deleteFutureEvents(modal.event.id)
        createEvents(generateRecurringEvents({ ...data, start: data.start }, recurrence, rule))
      } else {
        updateEvent(modal.event.id, data)
      }
    } else if (recurrence === 'none') {
      createEvent(data)
    } else if (recurrence === 'custom') {
      createEvents(generateRecurringEvents(data, recurrence, rule))
    } else {
      createEvents(generateRecurringEvents(data, recurrence))
    }
    setModal({ open: false })
  }
```

- [ ] **Step 3: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no new errors. (`EventModal`'s `onSave` will be widened in Task 7; the extra optional arg is compatible.)

- [ ] **Step 4: Commit**

```bash
git add app/u/page.tsx
git commit -m "feat(events): materialize custom recurrence on save"
```

---

## Task 6: Custom recurrence builder dialog

A self-contained dialog that takes an anchor date + optional existing rule and returns a `RecurrenceRule`. The anchor's own weekday is always selected and cannot be toggled off.

**Files:**
- Create: `app/components/CustomRecurrenceModal.tsx`

- [ ] **Step 1: Build the component**

Create `app/components/CustomRecurrenceModal.tsx`:
```tsx
'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { RecurrenceRule } from '../types'

const DAYS: { dow: number; label: string }[] = [
  { dow: 1, label: 'M' }, { dow: 2, label: 'T' }, { dow: 3, label: 'W' },
  { dow: 4, label: 'T' }, { dow: 5, label: 'F' }, { dow: 6, label: 'S' }, { dow: 0, label: 'S' },
]

const toIso = (d: Date) => d.toISOString().slice(0, 10)

interface Props {
  open: boolean
  anchor: Date                 // the event's start date — its weekday is locked on
  initialRule?: RecurrenceRule
  onDone: (rule: RecurrenceRule) => void
  onClose: () => void
}

export function CustomRecurrenceModal({ open, anchor, initialRule, onDone, onClose }: Props) {
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
          <DialogTitle className="text-sm font-semibold text-foreground">Custom repeat</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 mt-1">
          {/* Days of week */}
          <div>
            <p className="text-xs text-muted-foreground/60 mb-1.5">Repeat on</p>
            <div className="flex gap-1.5">
              {DAYS.map(({ dow, label }) => {
                const active = days.includes(dow)
                const locked = dow === anchorDow
                return (
                  <button
                    key={dow}
                    type="button"
                    onClick={() => toggleDay(dow)}
                    aria-pressed={active}
                    className={`h-8 w-8 rounded-full text-xs font-medium transition-colors ${
                      active ? 'bg-indigo-500 text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    } ${locked ? 'cursor-default opacity-90' : ''}`}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Interval */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground/60">Every</span>
            <Input
              type="number"
              min={1}
              value={interval}
              onChange={(e) => setInterval(Math.max(1, Number(e.target.value) || 1))}
              className="w-16 h-8 text-sm bg-muted/50 border-border"
            />
            <span className="text-xs text-muted-foreground/60">week(s)</span>
          </div>

          {/* End */}
          <div>
            <p className="text-xs text-muted-foreground/60 mb-1.5">Ends</p>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 text-xs text-foreground">
                <input type="radio" checked={endMode === 'never'} onChange={() => setEndMode('never')} />
                Never
              </label>
              <label className="flex items-center gap-1.5 text-xs text-foreground">
                <input type="radio" checked={endMode === 'on'} onChange={() => setEndMode('on')} />
                On
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
              Cancel
            </button>
            <button type="button" onClick={handleDone} className="px-3 py-1.5 rounded-md text-xs font-medium bg-indigo-500 text-white hover:bg-indigo-600 transition-colors">
              Done
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no new errors. (Confirm `@/components/ui/dialog` and `@/components/ui/input` import paths match how `EventModal.tsx` imports them; mirror those exact paths.)

- [ ] **Step 3: Commit**

```bash
git add app/components/CustomRecurrenceModal.tsx
git commit -m "feat(ui): custom recurrence builder dialog"
```

---

## Task 7: Wire the builder into EventModal

**Files:**
- Modify: `app/components/EventModal.tsx` (imports, `RECURRENCE_OPTIONS`, `onSave` type, state, dropdown trigger label, "Custom…" item, builder render, `handleSave`)

- [ ] **Step 1: Add imports, the option, and the rule state**

In `app/components/EventModal.tsx`:

Extend the types import (line 21) and add the builder + summary imports:
```ts
import { CalendarEvent, Course, EventColor, RecurrenceRule, RecurrenceType } from '../types'
import { CustomRecurrenceModal } from './CustomRecurrenceModal'
import { summarizeRecurrenceRule } from '../lib/recurrence'
```

Add `'custom'` to `RECURRENCE_OPTIONS` (after the `yearly` entry, line ~206):
```ts
  { value: 'yearly',    label: 'Yearly'        },
  { value: 'custom',    label: 'Custom…'       },
```

Widen the `onSave` prop type (line 215):
```ts
  onSave: (data: Omit<CalendarEvent, 'id'>, recurrence: RecurrenceType, rule?: RecurrenceRule) => void
```

Add state next to the existing `recurrence` state (line ~229):
```ts
  const [recurrence, setRecurrence] = useState<RecurrenceType>('none')
  const [recurrenceRule, setRecurrenceRule] = useState<RecurrenceRule | undefined>(undefined)
  const [customOpen, setCustomOpen] = useState(false)
```

In the edit-init `useEffect` (after `setRecurrence(event.recurrence ?? 'none')`, line ~242):
```ts
      setRecurrence(event.recurrence ?? 'none')
      setRecurrenceRule(event.recurrenceRule)
```
And in the create branch (after `setRecurrence('none')`, line ~254):
```ts
      setRecurrence('none')
      setRecurrenceRule(undefined)
```

- [ ] **Step 2: Show the rule summary on the trigger and open the builder from the option**

Replace the dropdown trigger label (line ~421):
```tsx
                  {recurrence === 'custom' && recurrenceRule
                    ? summarizeRecurrenceRule(recurrenceRule)
                    : RECURRENCE_OPTIONS.find(o => o.value === recurrence)?.label}
```

In the `RECURRENCE_OPTIONS.filter(...).map(...)` item `onClick` (line ~434), branch for custom:
```tsx
                      onClick={() => {
                        if (value === 'custom') { setCustomOpen(true) }
                        else { setRecurrence(value); setRecurrenceRule(undefined) }
                      }}
```

- [ ] **Step 3: Render the builder and capture its result**

Just before the closing of the modal's content (after the Repeat `</div>` block, near line ~443), add:
```tsx
            <CustomRecurrenceModal
              open={customOpen}
              anchor={baseDate}
              initialRule={recurrence === 'custom' ? recurrenceRule : undefined}
              onClose={() => setCustomOpen(false)}
              onDone={(rule) => { setRecurrence('custom'); setRecurrenceRule(rule) }}
            />
```

- [ ] **Step 4: Pass the rule through `handleSave`**

In `EventModal`'s `handleSave` (line ~262), update the `onSave` call to pass the rule:
```ts
    onSave(
      {
        title: title.trim(),
        start: applyTime(baseDate, startStr),
        end: type === 'deadline' ? applyTime(baseDate, startStr) : applyTime(baseDate, endStr),
        color,
        notes,
        type,
        courseId: courseId || undefined,
      },
      recurrence,
      recurrence === 'custom' ? recurrenceRule : undefined,
    )
```

- [ ] **Step 5: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 6: Commit**

```bash
git add app/components/EventModal.tsx
git commit -m "feat(ui): custom repeat option + builder in event modal"
```

---

## Task 8: Rolling top-up on navigate

**Files:**
- Modify: `app/hooks/useCalendarStore.ts` (imports + a `useEffect` keyed on `currentDate`)

- [ ] **Step 1: Add the top-up effect**

In `app/hooks/useCalendarStore.ts`:

Add the import:
```ts
import { buildTopUpEvents } from '../lib/recurrence'
```

After the initial-load `useEffect` (after line 26) and after `createEvents` is defined, add an effect that extends open-ended custom series when the viewed date changes. Place it after the `createEvents` declaration so the dependency is in scope:
```ts
  // Roll open-ended custom series forward as the user navigates toward their tail.
  useEffect(() => {
    if (loading) return
    const additions = buildTopUpEvents(events, currentDate, { bufferWeeks: 8, aheadWeeks: 52 })
    if (additions.length > 0) createEvents(additions)
    // `events` intentionally omitted from deps: createEvents updates it, and we only
    // want to react to date changes / load completion, not to our own insertions.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDate, loading, createEvents])
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Run the full test suite + build**

Run: `npm test && npm run build`
Expected: tests PASS; build succeeds.

- [ ] **Step 4: Commit**

```bash
git add app/hooks/useCalendarStore.ts
git commit -m "feat(events): roll open-ended custom series forward on navigate"
```

---

## Task 9: Manual verification

**Files:** none (manual).

- [ ] **Step 1: Run the app**

Run: `npm run dev`, open the app, sign in.

- [ ] **Step 2: Create a custom event**

Create an event on a weekday → Repeat → "Custom…". Confirm: the event's own weekday chip is selected and not toggleable; add another day; set "Every 2 weeks"; leave "Never". Save.
Expected: occurrences appear on both weekdays, every 2 weeks, ~1 year out. The Repeat trigger shows e.g. "Every 2 weeks on Mon, Wed".

- [ ] **Step 3: End-date variant**

Create another custom event with Ends → "On" a date ~3 weeks out.
Expected: no occurrences after that date.

- [ ] **Step 4: Edit this & future**

Open a middle occurrence of the first series, change the title and the days, Save.
Expected: that occurrence and later ones reflect the change; earlier ones keep the old title/days.

- [ ] **Step 5: Roll-forward**

Navigate ~10–11 months forward on the "Never" series.
Expected: occurrences continue to exist past the original ~1-year horizon (top-up fired). Reload and confirm they persisted.

- [ ] **Step 6: Delete recurring**

Delete an occurrence → confirm the existing DeleteRecurringModal (this / this & future / all) works on the custom series.

---

## Self-Review Notes

- **Spec coverage:** custom rule type (T2), persistence + SQL (T4), generation semantics incl. anchor-as-#1 and locked weekday (T3 + T6), rolling top-up on navigate (T3 `buildTopUpEvents` + T8), separate builder popover (T6), weeks-only interval (T6), edit this-&-future (T5), delete reuse (T9 manual). Existing preset weekday/weekend filtering left untouched.
- **No new test framework for React** — the risky pure logic is unit-tested; UI/store wiring verified via `tsc`, `build`, and manual steps, matching the repo's no-React-test convention.
- **Type consistency:** `RecurrenceRule` shape, `generateCustomOccurrences`/`buildTopUpEvents`/`summarizeRecurrenceRule` signatures are identical across tasks.
- **Verify-during-impl:** exact `@/components/ui/*` import paths in Task 6 must mirror `EventModal.tsx`; the `recurrence` column type check in Task 4 decides whether the `ALTER TYPE` is needed.
```
