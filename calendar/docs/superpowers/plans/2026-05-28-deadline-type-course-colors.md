# Deadline Type + Course Colors Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add course color-coding and a dedicated deadline event type to Calent, forming the foundation for student-focused scheduling.

**Architecture:** A new `useCoursesStore` hook (same `useState + localStorage` pattern as `useCalendarStore`) stores named courses with colors. Events gain two optional fields: `courseId` and `type`. A `courseUtils.ts` utility module provides `resolveEventColor` (used by every rendering component) and deadline helpers. All changes are client-only.

**Tech Stack:** Next.js 15, React, TypeScript, Tailwind, existing shadcn/ui components, no new dependencies.

---

## File Map

| File | Action |
|---|---|
| `app/types/index.ts` | Add `Course` interface; add `courseId?`, `type?` to `CalendarEvent` |
| `app/lib/courseUtils.ts` | **New** — `resolveEventColor`, `suggestEventsForCourse`, `getUpcomingDeadlines`, `getPastDueDeadlines`, `formatDeadlineRelative` |
| `app/hooks/useCoursesStore.ts` | **New** — `useState + localStorage` store for courses |
| `app/hooks/useCalendarStore.ts` | Add `stripCourseId` action |
| `app/components/ColorPicker.tsx` | **New** — shared 6-swatch picker extracted from StickyCard |
| `app/components/StickyCard.tsx` | Replace inline swatches with `<ColorPicker>` |
| `app/components/DeadlinePanel.tsx` | **New** — sidebar deadline list |
| `app/components/EventBlock.tsx` | Accept `courses` prop; use `resolveEventColor` |
| `app/components/TimeGrid.tsx` | Accept `courses` prop; add deadline chip row; pass `courses` to `EventBlock`; filter deadlines out of time slots |
| `app/components/MonthView.tsx` | Accept `courses` prop; add deadline pills; use `resolveEventColor` |
| `app/components/EventModal.tsx` | Add type toggle + course selector; accept `courses` prop |
| `app/components/SettingsModal.tsx` | Add "Courses" tab; accept `courses`, course actions |
| `app/u/page.tsx` | Wire `useCoursesStore`; pass `courses` down; add `DeadlinePanel`; coordinate cascade delete |

---

## Task 1: Types + courseUtils

**Files:**
- Modify: `app/types/index.ts`
- Create: `app/lib/courseUtils.ts`

- [ ] **Step 1: Update `app/types/index.ts`**

Replace the file content with:

```typescript
export type EventColor = 'indigo' | 'rose' | 'emerald' | 'amber' | 'violet' | 'sky'

export type RecurrenceType = 'none' | 'daily' | 'weekdays' | 'weekends' | 'weekly' | 'biweekly' | 'monthly' | 'yearly'

export interface Course {
  id: string
  name: string
  color: EventColor
}

export interface CalendarEvent {
  id: string
  title: string
  start: Date
  end: Date
  color: EventColor
  notes?: string
  allDay?: boolean
  recurrenceGroupId?: string
  recurrence?: RecurrenceType
  courseId?: string
  type?: 'event' | 'deadline'
}

export type ViewMode = 'week' | 'day' | 'month'

export interface StickyItem {
  id: string
  text: string
  done: boolean
}

export interface Sticky {
  id: string
  title: string
  color: EventColor
  items: StickyItem[]
  body?: string
  order: number
}
```

- [ ] **Step 2: Create `app/lib/courseUtils.ts`**

```typescript
import { CalendarEvent, Course, EventColor } from '../types'

export function resolveEventColor(event: CalendarEvent, courses: Course[]): EventColor {
  if (event.courseId) {
    const course = courses.find(c => c.id === event.courseId)
    if (course) return course.color
  }
  return event.color
}

export function suggestEventsForCourse(
  courseName: string,
  events: CalendarEvent[]
): CalendarEvent[] {
  const needle = courseName.toLowerCase().trim()
  if (!needle) return []
  return events.filter(
    e =>
      e.recurrence &&
      e.recurrence !== 'none' &&
      e.title.toLowerCase().includes(needle) &&
      !e.courseId
  )
}

export function getUpcomingDeadlines(events: CalendarEvent[]): CalendarEvent[] {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return events
    .filter(e => e.type === 'deadline' && e.start >= today)
    .sort((a, b) => a.start.getTime() - b.start.getTime())
}

export function getPastDueDeadlines(events: CalendarEvent[]): CalendarEvent[] {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return events
    .filter(e => e.type === 'deadline' && e.start < today)
    .sort((a, b) => b.start.getTime() - a.start.getTime())
}

export function formatDeadlineRelative(date: Date): string {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(date)
  target.setHours(0, 0, 0, 0)
  const diff = Math.round((target.getTime() - today.getTime()) / 86_400_000)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Tomorrow'
  if (diff < 0) return `${Math.abs(diff)}d ago`
  if (diff < 7) return `${diff} days`
  return `${Math.ceil(diff / 7)}w`
}
```

- [ ] **Step 3: Verify build is clean**

```bash
npm run build
```

Expected: compiles with no TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add app/types/index.ts app/lib/courseUtils.ts
git commit -m "feat: add Course type, courseId/type fields, courseUtils helpers"
```

---

## Task 2: useCoursesStore

**Files:**
- Create: `app/hooks/useCoursesStore.ts`

- [ ] **Step 1: Create the store**

```typescript
'use client'

import { useState, useEffect, useCallback } from 'react'
import { Course } from '../types'

const STORAGE_KEY = 'calent-courses'

export function useCoursesStore() {
  const [courses, setCourses] = useState<Course[]>([])

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) setCourses(JSON.parse(stored))
    } catch {
      setCourses([])
    }
  }, [])

  const persist = useCallback((next: Course[]) => {
    setCourses(next)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  }, [])

  const createCourse = useCallback(
    (data: Omit<Course, 'id'>): Course => {
      const course: Course = { ...data, id: crypto.randomUUID() }
      persist([...courses, course])
      return course
    },
    [courses, persist]
  )

  const updateCourse = useCallback(
    (id: string, patch: Partial<Omit<Course, 'id'>>) => {
      persist(courses.map(c => (c.id === id ? { ...c, ...patch } : c)))
    },
    [courses, persist]
  )

  const deleteCourse = useCallback(
    (id: string) => {
      persist(courses.filter(c => c.id !== id))
    },
    [courses, persist]
  )

  return { courses, createCourse, updateCourse, deleteCourse }
}
```

- [ ] **Step 2: Add `stripCourseId` to `app/hooks/useCalendarStore.ts`**

After the `deleteEvent` callback, add:

```typescript
const stripCourseId = useCallback(
  (courseId: string) => {
    persist(
      events.map(e =>
        e.courseId === courseId ? { ...e, courseId: undefined } : e
      )
    )
  },
  [events, persist]
)
```

And add `stripCourseId` to the return object.

- [ ] **Step 3: Verify build**

```bash
npm run build
```

Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add app/hooks/useCoursesStore.ts app/hooks/useCalendarStore.ts
git commit -m "feat: add useCoursesStore and stripCourseId action"
```

---

## Task 3: Shared ColorPicker component

**Files:**
- Create: `app/components/ColorPicker.tsx`
- Modify: `app/components/StickyCard.tsx`

- [ ] **Step 1: Create `app/components/ColorPicker.tsx`**

```tsx
'use client'

import { EventColor } from '../types'
import { cn } from '@/lib/utils'

const SWATCHES: { value: EventColor; cls: string }[] = [
  { value: 'indigo',  cls: 'bg-indigo-400'  },
  { value: 'violet',  cls: 'bg-violet-400'  },
  { value: 'rose',    cls: 'bg-rose-400'    },
  { value: 'emerald', cls: 'bg-emerald-400' },
  { value: 'amber',   cls: 'bg-amber-400'   },
  { value: 'sky',     cls: 'bg-sky-400'     },
]

interface ColorPickerProps {
  value: EventColor
  onChange: (color: EventColor) => void
  disabled?: boolean
}

export function ColorPicker({ value, onChange, disabled }: ColorPickerProps) {
  return (
    <div className={cn('flex gap-1.5', disabled && 'opacity-40 pointer-events-none')}>
      {SWATCHES.map(({ value: c, cls }) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          aria-label={c}
          disabled={disabled}
          className={cn(
            'w-5 h-5 rounded-full transition-all',
            cls,
            value === c && 'ring-2 ring-offset-1 ring-gray-400 scale-110'
          )}
        />
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Update `StickyCard.tsx` to use `ColorPicker`**

Add this import near the top of `app/components/StickyCard.tsx`:

```typescript
import { ColorPicker } from './ColorPicker'
```

Find the color picker popover content inside `StickyCard` (the `div` with `className="absolute right-0 bottom-7 bg-white rounded-lg shadow-lg border border-border p-2 flex gap-1.5 z-30"`) and replace the entire `div` with:

```tsx
<div
  className="absolute right-0 bottom-7 bg-white rounded-lg shadow-lg border border-border p-2 z-30"
  onMouseLeave={() => setShowColorPicker(false)}
>
  <ColorPicker
    value={sticky.color}
    onChange={c => { onChangeColor(c); setShowColorPicker(false) }}
  />
</div>
```

- [ ] **Step 3: Remove the now-unused `COLOR_SWATCH` constant from `StickyCard.tsx`**

Delete these lines from `StickyCard.tsx`:

```typescript
const COLOR_SWATCH: Record<EventColor, string> = {
  indigo: 'bg-indigo-400', violet: 'bg-violet-400', rose: 'bg-rose-400',
  emerald: 'bg-emerald-400', amber: 'bg-amber-400', sky: 'bg-sky-400',
}
```

- [ ] **Step 4: Verify build**

```bash
npm run build
```

Expected: clean. Stickies color picker still works.

- [ ] **Step 5: Commit**

```bash
git add app/components/ColorPicker.tsx app/components/StickyCard.tsx
git commit -m "feat: extract shared ColorPicker component"
```

---

## Task 4: DeadlinePanel sidebar component

**Files:**
- Create: `app/components/DeadlinePanel.tsx`

- [ ] **Step 1: Create `app/components/DeadlinePanel.tsx`**

```tsx
'use client'

import { CalendarEvent, Course } from '../types'
import {
  resolveEventColor,
  getUpcomingDeadlines,
  getPastDueDeadlines,
  formatDeadlineRelative,
} from '../lib/courseUtils'
import { cn } from '@/lib/utils'

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
  const upcoming = getUpcomingDeadlines(events)
  const pastDue  = getPastDueDeadlines(events)
  const hasAny   = upcoming.length > 0 || pastDue.length > 0

  return (
    <div className="px-3 py-3 border-t border-border/20">
      <p className="text-[10px] font-semibold text-muted-foreground/40 uppercase tracking-widest mb-2">
        Deadlines
      </p>

      {!hasAny && (
        <p className="text-[10px] text-muted-foreground/30 italic">No upcoming deadlines</p>
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
              {formatDeadlineRelative(ev.start)}
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
                {formatDeadlineRelative(ev.start)}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add app/components/DeadlinePanel.tsx
git commit -m "feat: add DeadlinePanel sidebar component"
```

---

## Task 5: EventBlock — resolveEventColor

**Files:**
- Modify: `app/components/EventBlock.tsx`

- [ ] **Step 1: Add `courses` prop and `resolveEventColor` import**

At the top of `app/components/EventBlock.tsx`, add to existing imports:

```typescript
import { Course } from '../types'
import { resolveEventColor } from '../lib/courseUtils'
```

- [ ] **Step 2: Add `courses` to the props interface**

```typescript
interface EventBlockProps {
  event: CalendarEvent
  col: number
  totalCols: number
  onEdit: () => void
  onDelete: () => void
  onDragEnd: (newStart: Date, newEnd: Date) => void
  containerDay: Date
  courses: Course[]
}
```

Add `courses` to the destructured props:

```typescript
export function EventBlock({
  event,
  col,
  totalCols,
  onEdit,
  onDelete,
  onDragEnd,
  containerDay,
  courses,
}: EventBlockProps) {
```

- [ ] **Step 3: Use `resolveEventColor` instead of `event.color` directly**

Find line 47 (the line that reads `const c = COLORS[event.color] ?? COLORS.indigo`) and replace it with:

```typescript
const c = COLORS[resolveEventColor(event, courses)] ?? COLORS.indigo
```

- [ ] **Step 4: Verify build**

```bash
npm run build
```

Expected: TypeScript will now require `courses` everywhere `EventBlock` is used — errors in `TimeGrid.tsx` are expected here. They are fixed in Task 6.

- [ ] **Step 5: Commit** (after Task 6 fixes the TypeScript errors)

Hold this commit until Task 6 is complete.

---

## Task 6: TimeGrid — deadline chips + pass courses through

**Files:**
- Modify: `app/components/TimeGrid.tsx`

- [ ] **Step 1: Add imports**

Add to existing imports at the top of `app/components/TimeGrid.tsx`:

```typescript
import { Course } from '../types'
import { isSameDay as isSameD } from '../lib/dateUtils'
```

(Note: `isSameDay` is already imported as `isSameDay` — use the existing import.)

- [ ] **Step 2: Add `courses` to `TimeGridProps`**

```typescript
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
```

Add `courses` to the destructured props in the `TimeGrid` function signature.

- [ ] **Step 3: Filter deadlines out of time-slot events and build per-day deadline map**

Inside the `TimeGrid` function body, directly before the `return` statement, add:

```typescript
const timeEvents = events.filter(e => e.type !== 'deadline')
const deadlinesByDay = new Map<string, CalendarEvent[]>()
for (const ev of events.filter(e => e.type === 'deadline')) {
  const key = ev.start.toDateString()
  if (!deadlinesByDay.has(key)) deadlinesByDay.set(key, [])
  deadlinesByDay.get(key)!.push(ev)
}
```

Replace all references to `events` used for time-slot rendering (passed to `layoutEvents` inside the day columns) with `timeEvents`. Search for `layoutEvents(events.filter(...)` or `events.filter(e => isSameDay(...))` inside the animated day columns and replace `events` with `timeEvents` in those filters.

- [ ] **Step 4: Add color map and deadline chip row between day-header and scrollable body**

First, add this constant near the top of `TimeGrid.tsx` (after the existing `const HOURS = ...` line):

```typescript
const DEADLINE_CHIP: Record<string, { bg: string; text: string }> = {
  indigo:  { bg: '#e0e7ff', text: '#3730a3' },
  violet:  { bg: '#ede9fe', text: '#5b21b6' },
  rose:    { bg: '#ffe4e6', text: '#9f1239' },
  emerald: { bg: '#d1fae5', text: '#065f46' },
  amber:   { bg: '#fef3c7', text: '#92400e' },
  sky:     { bg: '#e0f2fe', text: '#0c4a6e' },
}
```

Then after the closing `</div>` of the sticky day-header row and before the `<div ref={scrollRef} ...>` scrollable body, insert:

```tsx
{/* Deadline chips — shown when any visible day has deadlines */}
{days.some(d => (deadlinesByDay.get(d.toDateString()) ?? []).length > 0) && (
  <div
    className="flex shrink-0 border-b border-border/30 bg-background"
    style={{ paddingLeft: TIME_LABEL_W }}
  >
    <div className="flex-1 flex">
      {days.map((day, i) => {
        const chips = deadlinesByDay.get(day.toDateString()) ?? []
        return (
          <div
            key={i}
            className="flex-1 flex flex-col gap-0.5 px-1 py-1 border-l border-border/30 first:border-l-0 min-h-[28px]"
          >
            {chips.slice(0, 2).map(ev => {
              const chip = DEADLINE_CHIP[resolveEventColor(ev, courses)] ?? DEADLINE_CHIP.indigo
              return (
                <button
                  key={ev.id}
                  onClick={() => onEditEvent(ev)}
                  className="flex items-center gap-1 px-1.5 py-0.5 rounded text-left w-full hover:opacity-80 transition-opacity"
                  style={{ backgroundColor: chip.bg }}
                >
                  <span className="text-[9px] font-medium truncate" style={{ color: chip.text }}>
                    ◆ {ev.title}
                  </span>
                </button>
              )
            })}
            {chips.length > 2 && (
              <span className="text-[9px] text-muted-foreground/50 px-1">
                +{chips.length - 2} more
              </span>
            )}
          </div>
        )
      })}
    </div>
  </div>
)}
```

Also add `resolveEventColor` import at the top of `TimeGrid.tsx`:

```typescript
import { resolveEventColor } from '../lib/courseUtils'
```

- [ ] **Step 5: Pass `courses` to every `EventBlock` render**

Inside the animated day columns, find each `<EventBlock ... />` usage and add `courses={courses}` prop.

- [ ] **Step 6: Verify build**

```bash
npm run build
```

Expected: clean.

- [ ] **Step 7: Commit Tasks 5 + 6 together**

```bash
git add app/components/EventBlock.tsx app/components/TimeGrid.tsx
git commit -m "feat: pass courses to EventBlock/TimeGrid, add deadline chip row"
```

---

## Task 7: MonthView — deadline pills + resolveEventColor

**Files:**
- Modify: `app/components/MonthView.tsx`

- [ ] **Step 1: Add imports**

```typescript
import { Course } from '../types'
import { resolveEventColor } from '../lib/courseUtils'
```

- [ ] **Step 2: Add `courses` to `MonthViewProps`**

```typescript
interface MonthViewProps {
  currentDate: Date
  events: CalendarEvent[]
  onDayClick: (date: Date) => void
  onEventClick: (event: CalendarEvent) => void
  courses: Course[]
}
```

Add `courses` to the destructured props.

- [ ] **Step 3: Replace all `ev.color` with `resolveEventColor(ev, courses)`**

There are 3 occurrences in `MonthView.tsx` — lines 150, 164, and 218 in the original file. Change each:

```typescript
// Line 150 — mobile dot
EVENT_DOT[resolveEventColor(ev, courses)]

// Line 164 — desktop event bar
EVENT_BAR[resolveEventColor(ev, courses)]

// Line 218 — mobile selected-day dot
EVENT_DOT[resolveEventColor(ev, courses)]
```

- [ ] **Step 4: Add deadline pills in desktop day cells**

Inside the desktop event rendering block (the `!isMobile && (...)` block), before the `dayEvents.slice(0, 3).map(...)` loop for event bars, add deadline pills:

```tsx
{/* Deadline pills — rendered above event bars */}
{!isMobile && (() => {
  const dayDeadlines = dayEvents.filter(e => e.type === 'deadline')
  const dayNonDeadlines = dayEvents.filter(e => e.type !== 'deadline')
  return (
    <>
      {dayDeadlines.slice(0, 2).map(ev => (
        <button
          key={ev.id}
          onClick={(e) => { e.stopPropagation(); onEventClick(ev) }}
          className={`w-full text-left text-[10px] font-medium px-1 py-0.5 rounded truncate block mb-0.5 ${EVENT_BAR[resolveEventColor(ev, courses)]}`}
        >
          ◆ {ev.title}
        </button>
      ))}
      {dayNonDeadlines.slice(0, Math.max(0, 3 - dayDeadlines.length)).map(ev => (
        <button
          key={ev.id}
          onClick={(e) => { e.stopPropagation(); onEventClick(ev) }}
          className={`w-full text-left text-[10px] font-medium px-1 py-0.5 rounded truncate block ${EVENT_BAR[resolveEventColor(ev, courses)]}`}
        >
          {ev.title}
        </button>
      ))}
      {dayEvents.length > 3 && (
        <p className="text-[10px] text-muted-foreground/60 px-1">
          +{dayEvents.length - 3} more
        </p>
      )}
    </>
  )
})()}
```

Replace the existing `dayEvents.slice(0, 3).map(...)` desktop block entirely with the above.

- [ ] **Step 5: Verify build**

```bash
npm run build
```

Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add app/components/MonthView.tsx
git commit -m "feat: add deadline pills and course color resolution to MonthView"
```

---

## Task 8: EventModal — type toggle + course selector

**Files:**
- Modify: `app/components/EventModal.tsx`

- [ ] **Step 1: Update imports and Props**

Add to imports:

```typescript
import { CalendarEvent, Course, EventColor, RecurrenceType } from '../types'
```

Update the `Props` interface:

```typescript
interface Props {
  open: boolean
  event?: CalendarEvent
  defaultStart?: Date
  defaultEnd?: Date
  onSave: (data: Omit<CalendarEvent, 'id'>, recurrence: RecurrenceType) => void
  onDelete?: () => void
  onClose: () => void
  courses: Course[]
  onOpenCourses?: () => void
}
```

Add `courses` and `onOpenCourses` to the destructured props.

- [ ] **Step 2: Add new state fields**

After the existing `const [recurrence, setRecurrence] = useState<RecurrenceType>('none')` line, add:

```typescript
const [type, setType]       = useState<'event' | 'deadline'>('event')
const [courseId, setCourseId] = useState<string | undefined>(undefined)
```

- [ ] **Step 3: Reset new fields in the `useEffect`**

Inside the existing `useEffect` that resets form state on `open`, add:

```typescript
setType(event?.type ?? 'event')
setCourseId(event?.courseId)
```

- [ ] **Step 4: Include new fields in `handleSave`**

Replace the `onSave(...)` call in `handleSave` with:

```typescript
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
  recurrence
)
```

- [ ] **Step 5: Add type toggle UI — place after the title `<Input>` and before the Times grid**

```tsx
{/* Type toggle */}
<div className="flex rounded-md overflow-hidden border border-border w-fit">
  {(['event', 'deadline'] as const).map(t => (
    <button
      key={t}
      type="button"
      onClick={() => setType(t)}
      className={cn(
        'px-3 py-1 text-xs font-medium capitalize transition-colors',
        type === t
          ? 'bg-gray-900 text-white'
          : 'text-muted-foreground hover:text-foreground hover:bg-gray-50'
      )}
    >
      {t}
    </button>
  ))}
</div>
```

- [ ] **Step 6: Conditionally hide End time when type === 'deadline'**

Wrap the End time input in a conditional:

```tsx
<div className="grid grid-cols-2 gap-3">
  {/* Start always shown */}
  <div>
    <p className="text-xs text-muted-foreground/60 mb-1.5">Start</p>
    <Input
      type="time"
      value={startStr}
      onChange={(e) => setStartStr(e.target.value)}
      className="bg-muted/50 border-border font-mono text-sm focus-visible:border-indigo-400"
    />
  </div>
  {/* End only shown for events */}
  {type === 'event' && (
    <div>
      <p className="text-xs text-muted-foreground/60 mb-1.5">End</p>
      <Input
        type="time"
        value={endStr}
        onChange={(e) => setEndStr(e.target.value)}
        className="bg-muted/50 border-border font-mono text-sm focus-visible:border-indigo-400"
      />
    </div>
  )}
</div>
```

- [ ] **Step 7: Add course selector — place after the Color section**

First add this color map constant near the top of `EventModal.tsx` (after the `COLOR_OPTIONS` array):

```typescript
const COURSE_DOT_COLOR: Record<string, string> = {
  indigo: '#818cf8', violet: '#a78bfa', rose: '#fb7185',
  emerald: '#34d399', amber: '#fbbf24', sky: '#38bdf8',
}
```

Then add the course selector UI:

```tsx
{/* Course */}
{courses.length > 0 && (
  <div>
    <p className="text-xs text-muted-foreground/60 mb-1.5">Course</p>
    <div className="flex flex-wrap gap-1.5">
      {courses.map(course => (
        <button
          key={course.id}
          type="button"
          onClick={() => setCourseId(courseId === course.id ? undefined : course.id)}
          className={cn(
            'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all',
            courseId === course.id
              ? 'border-gray-900 bg-gray-900 text-white'
              : 'border-border text-muted-foreground hover:border-gray-400'
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
    Add a course
  </button>
)}
```

- [ ] **Step 8: Lock color picker when a course is selected**

Find the Color section and replace the static `<p>` label with:

```tsx
<div className="flex items-center justify-between mb-2">
  <p className="text-xs text-muted-foreground/60">Color</p>
  {courseId && (
    <span className="text-[10px] text-muted-foreground/40">Set by course</span>
  )}
</div>
```

Wrap the color swatches `div` to disable when course selected:

```tsx
<div className={cn('flex gap-2', courseId && 'opacity-30 pointer-events-none')}>
  {COLOR_OPTIONS.map((c) => (
    /* existing swatch buttons unchanged */
  ))}
</div>
```

- [ ] **Step 9: Update the dialog title to reflect type**

Replace the static `{event ? 'Event' : 'Event'}` with:

```tsx
{event ? (event.type === 'deadline' ? 'Deadline' : 'Event') : (type === 'deadline' ? 'New Deadline' : 'New Event')}
```

- [ ] **Step 10: Verify build**

```bash
npm run build
```

Expected: TypeScript errors where `EventModal` is used without new required props — fixed in Task 10.

- [ ] **Step 11: Commit** (after Task 10 wires the props)

Hold until Task 10.

---

## Task 9: SettingsModal — Courses tab

**Files:**
- Modify: `app/components/SettingsModal.tsx`

- [ ] **Step 1: Update imports and Props**

Add imports:

```typescript
import { Plus, Pencil } from 'lucide-react'
import { Course, EventColor } from '../types'
import { ColorPicker } from './ColorPicker'
import { suggestEventsForCourse } from '../lib/courseUtils'
import { CalendarEvent } from '../types'
```

Update `SettingsModalProps`:

```typescript
interface SettingsModalProps {
  open: boolean
  settings: Settings
  onUpdateSettings: (updates: Partial<Settings>) => void
  onClose: () => void
  courses: Course[]
  events: CalendarEvent[]
  onCreateCourse: (data: Omit<Course, 'id'>) => void
  onUpdateCourse: (id: string, patch: Partial<Omit<Course, 'id'>>) => void
  onDeleteCourse: (id: string) => void
  initialTab?: Category
}
```

- [ ] **Step 2: Add 'courses' to CATEGORIES and Category type**

```typescript
type Category = 'preferences' | 'customization' | 'account' | 'courses'

const CATEGORIES: { id: Category; label: string }[] = [
  { id: 'preferences',   label: 'Preferences'  },
  { id: 'customization', label: 'Customization' },
  { id: 'courses',       label: 'Courses'       },
  { id: 'account',       label: 'Account'       },
]
```

- [ ] **Step 3: Add color map and `CoursesSection` component above `SettingsModal`**

First add this constant near the top of `SettingsModal.tsx`:

```typescript
const COURSE_DOT: Record<string, string> = {
  indigo: '#818cf8', violet: '#a78bfa', rose: '#fb7185',
  emerald: '#34d399', amber: '#fbbf24', sky: '#38bdf8',
}
```

Then add `CoursesSection`:

```tsx
function CoursesSection({
  courses,
  events,
  onCreateCourse,
  onUpdateCourse,
  onDeleteCourse,
}: {
  courses: Course[]
  events: CalendarEvent[]
  onCreateCourse: (data: Omit<Course, 'id'>) => void
  onUpdateCourse: (id: string, patch: Partial<Omit<Course, 'id'>>) => void
  onDeleteCourse: (id: string) => void
}) {
  const [adding, setAdding]           = useState(false)
  const [newName, setNewName]         = useState('')
  const [newColor, setNewColor]       = useState<EventColor>('indigo')
  const [editingId, setEditingId]     = useState<string | null>(null)
  const [deleteId, setDeleteId]       = useState<string | null>(null)
  const [suggestions, setSuggestions] = useState<CalendarEvent[]>([])

  const handleNameBlur = () => {
    setSuggestions(suggestEventsForCourse(newName, events))
  }

  const handleCreate = () => {
    if (!newName.trim()) return
    onCreateCourse({ name: newName.trim(), color: newColor })
    setAdding(false)
    setNewName('')
    setNewColor('indigo')
    setSuggestions([])
  }

  return (
    <div>
      <SectionLabel>Your courses</SectionLabel>

      {courses.length === 0 && !adding && (
        <p className="text-xs text-muted-foreground/50 mb-4">
          No courses yet. Add one to color-code your events.
        </p>
      )}

      <div className="space-y-1 mb-3">
        {courses.map(course => (
          <div key={course.id} className="flex items-center gap-2 py-2 border-b border-border/20 last:border-0">
            {editingId === course.id ? (
              <>
                <input
                  autoFocus
                  defaultValue={course.name}
                  onBlur={e => { onUpdateCourse(course.id, { name: e.target.value }); setEditingId(null) }}
                  onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
                  className="flex-1 text-sm bg-transparent outline-none border-b border-border"
                />
                <ColorPicker
                  value={course.color}
                  onChange={color => onUpdateCourse(course.id, { color })}
                />
              </>
            ) : (
              <>
                <span
                  style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: COURSE_DOT[course.color] ?? '#818cf8', flexShrink: 0, display: 'inline-block' }}
                />
                <span className="flex-1 text-sm text-gray-800">{course.name}</span>
                <button onClick={() => setEditingId(course.id)} className="text-gray-400 hover:text-gray-700 transition-colors">
                  <Pencil size={11} />
                </button>
                {deleteId === course.id ? (
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-muted-foreground/60">Delete?</span>
                    <button onClick={() => { onDeleteCourse(course.id); setDeleteId(null) }} className="text-xs text-rose-500 font-medium hover:text-rose-600">Yes</button>
                    <button onClick={() => setDeleteId(null)} className="text-xs text-muted-foreground/60 hover:text-gray-700">No</button>
                  </div>
                ) : (
                  <button onClick={() => setDeleteId(course.id)} className="text-gray-400 hover:text-rose-400 transition-colors">
                    <Trash2 size={11} />
                  </button>
                )}
              </>
            )}
          </div>
        ))}
      </div>

      {adding ? (
        <div className="space-y-3 p-3 bg-gray-50/80 rounded-lg border border-border/40">
          <input
            autoFocus
            placeholder="Course name (e.g. Calculus)"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onBlur={handleNameBlur}
            onKeyDown={e => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') setAdding(false) }}
            className="w-full text-sm bg-transparent outline-none border-b border-border pb-1"
          />
          <ColorPicker value={newColor} onChange={setNewColor} />

          {/* Smart suggestions — informational, user links via event modal */}
          {suggestions.length > 0 && (
            <div className="space-y-1">
              <p className="text-[10px] text-muted-foreground/60 font-medium">
                Matching recurring events — assign this course from the event editor:
              </p>
              {suggestions.map(ev => (
                <p key={ev.id} className="text-xs text-gray-600 truncate pl-1">
                  · {ev.title}
                </p>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={handleCreate}
              disabled={!newName.trim()}
              className="px-3 py-1 text-xs font-medium bg-gray-900 text-white rounded-md disabled:opacity-30"
            >
              Add course
            </button>
            <button
              onClick={() => { setAdding(false); setNewName(''); setSuggestions([]) }}
              className="px-3 py-1 text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <Plus size={12} />
          Add course
        </button>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Wire `initialTab` into `SettingsModal` state**

In `SettingsModal`, change the `useState` initialization:

```typescript
const [category, setCategory] = useState<Category>(initialTab ?? 'preferences')
```

- [ ] **Step 5: Add `courses` tab rendering to `SettingsModal` content area**

After the existing `{category === 'account' && <AccountSection />}` line, add:

```tsx
{category === 'courses' && (
  <CoursesSection
    courses={courses}
    events={events}
    onCreateCourse={onCreateCourse}
    onUpdateCourse={onUpdateCourse}
    onDeleteCourse={onDeleteCourse}
    onLinkEventToCourse={onLinkEventToCourse}
  />
)}
```

Also update `CoursesSection` call to remove `onLinkEventToCourse` (no longer in the component signature).

- [ ] **Step 6: Verify build**

```bash
npm run build
```

Expected: TypeScript errors where `SettingsModal` is used without new props — fixed in Task 10.

- [ ] **Step 7: Hold commit** until Task 10.

---

## Task 10: Wire everything in `app/u/page.tsx`

**Files:**
- Modify: `app/u/page.tsx`

- [ ] **Step 1: Import new hooks and components**

Add to the existing imports block:

```typescript
import { useCoursesStore } from '../hooks/useCoursesStore'
import { DeadlinePanel } from '../components/DeadlinePanel'
```

- [ ] **Step 2: Initialise the courses store and pull `stripCourseId`**

After the existing `const { events, ... } = useCalendarStore()` line, add:

```typescript
const { courses, createCourse, updateCourse, deleteCourse } = useCoursesStore()
const { ..., stripCourseId } = useCalendarStore()
```

Note: merge `stripCourseId` into the existing `useCalendarStore` destructure — don't call the hook twice.

- [ ] **Step 3: Add `settingsTab` state for deep-linking to Courses tab**

```typescript
const [settingsTab, setSettingsTab] = useState<'preferences' | 'customization' | 'account' | 'courses'>('preferences')
```

- [ ] **Step 4: Add `handleDeadlineClick` handler**

```typescript
const handleDeadlineClick = (event: CalendarEvent) => {
  setCurrentDate(event.start)
  setViewMode('day')
  openEdit(event)
}
```

- [ ] **Step 5: Add `handleDeleteCourse` coordinator**

```typescript
const handleDeleteCourse = (id: string) => {
  deleteCourse(id)
  stripCourseId(id)
}
```

- [ ] **Step 6: Add `DeadlinePanel` to the sidebar**

Find the sidebar `<div>` that contains `<MiniCalendar>` and the copyright footer. Between `<MiniCalendar ... />` and the `<div className="mt-auto ...">` footer, insert:

```tsx
<DeadlinePanel
  events={events}
  courses={courses}
  onDeadlineClick={handleDeadlineClick}
/>
```

- [ ] **Step 7: Pass `courses` to `TimeGrid`**

Add `courses={courses}` to the `<TimeGrid>` usage.

- [ ] **Step 8: Pass `courses` to `MonthView`**

Add `courses={courses}` to the `<MonthView>` usage.

- [ ] **Step 9: Pass `courses` and `onOpenCourses` to `EventModal`**

```tsx
<EventModal
  open={modal.open}
  event={modal.event}
  defaultStart={modal.defaultStart}
  defaultEnd={modal.defaultEnd}
  onSave={handleSave}
  onDelete={modal.event ? handleDelete : undefined}
  onClose={() => setModal({ open: false })}
  courses={courses}
  onOpenCourses={() => { setSettingsOpen(true); setSettingsTab('courses') }}
/>
```

- [ ] **Step 10: Pass new props to `SettingsModal`**

```tsx
<SettingsModal
  open={settingsOpen}
  settings={settings}
  onUpdateSettings={updateSettings}
  onClose={() => setSettingsOpen(false)}
  courses={courses}
  events={events}
  onCreateCourse={createCourse}
  onUpdateCourse={updateCourse}
  onDeleteCourse={handleDeleteCourse}
  initialTab={settingsTab}
/>
```

- [ ] **Step 11: Final build verification**

```bash
npm run build
```

Expected: fully clean, zero TypeScript errors.

- [ ] **Step 12: Commit everything**

```bash
git add app/u/page.tsx app/components/EventModal.tsx app/components/SettingsModal.tsx app/components/DeadlinePanel.tsx app/components/TimeGrid.tsx app/components/MonthView.tsx app/components/EventBlock.tsx app/hooks/useCoursesStore.ts app/hooks/useCalendarStore.ts app/lib/courseUtils.ts app/types/index.ts app/components/ColorPicker.tsx app/components/StickyCard.tsx
git commit -m "feat: deadline type + course color-coding for student scheduling"
```

---

## Manual Verification Checklist

After all tasks are complete, verify these flows in the browser at `http://localhost:3000/u`:

- [ ] Open Settings → Courses tab appears in sidebar
- [ ] Add a course "Calculus" with indigo color → appears in list
- [ ] Create a new event → course selector shows "Calculus" pill; selecting it locks color picker
- [ ] Create a new event → type toggle switches to "Deadline" → end time field hides
- [ ] Add a deadline "Problem Set 3" linked to Calculus course → appears in sidebar deadline panel
- [ ] Deadline chip shows in week view above time grid on its due date
- [ ] Deadline pill with ◆ prefix shows in month view on its due date
- [ ] Clicking a deadline in the sidebar navigates to that date and opens edit modal
- [ ] Delete the "Calculus" course → all linked events revert to their manual color; no crash
- [ ] Past-due deadlines show in red in the deadline panel
