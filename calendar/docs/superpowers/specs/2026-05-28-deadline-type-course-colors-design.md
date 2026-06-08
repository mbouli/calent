# Deadline Type + Course Colors — Design Spec
**Date:** 2026-05-28
**Status:** Approved

---

## Overview

Two tightly coupled features that form the foundation for student-focused scheduling in Calent:

1. **Course color-coding** — users create named courses with colors; events linked to a course inherit that color automatically.
2. **Deadline event type** — a new `type: 'deadline'` on events that is date-stamped (not time-blocked), rendered distinctly across all views and in a dedicated sidebar panel.

This is a client-only feature. No backend changes required. Courses are persisted to `localStorage` alongside calendar events.

---

## Data Model

### New type: `Course`

```typescript
interface Course {
  id: string
  name: string
  color: EventColor   // reuses existing 6-color palette
}
```

Added to `app/types/index.ts`.

### Updated: `CalendarEvent`

Two new optional fields added to the existing interface:

```typescript
interface CalendarEvent {
  // ...all existing fields unchanged...
  courseId?: string                 // links to a Course; one course per event
  type?: 'event' | 'deadline'      // default: 'event' (backwards compatible)
}
```

**Deadlines** retain their `start` date but `end` is ignored in rendering — they are date-stamped, not time-blocked. All existing event infrastructure (recurrence, editing, deletion) works unchanged on deadlines.

---

## State & Stores

### New store: `useCoursesStore`

```typescript
// app/hooks/useCoursesStore.ts
interface CoursesState {
  courses: Course[]
  createCourse: (course: Omit<Course, 'id'>) => void
  updateCourse: (id: string, patch: Partial<Omit<Course, 'id'>>) => void
  deleteCourse: (id: string) => void
}
```

- Zustand store with `persist` middleware, key: `'calent-courses'`
- Follows the same pattern as `useCalendarStore`

### Deletion cascade

When a course is deleted, all events with that `courseId` have it stripped — events remain, they revert to their manually chosen color. No orphaned references.

### Color resolution utility

```typescript
// app/lib/courseUtils.ts
function resolveEventColor(event: CalendarEvent, courses: Course[]): EventColor {
  if (event.courseId) {
    return courses.find(c => c.id === event.courseId)?.color ?? event.color
  }
  return event.color
}
```

Every component that renders a colored event calls this function instead of reading `event.color` directly. Single source of truth.

### Smart suggestion utility

```typescript
// app/lib/courseUtils.ts
function suggestEventsForCourse(
  courseName: string,
  events: CalendarEvent[]
): CalendarEvent[] {
  const needle = courseName.toLowerCase().trim()
  return events.filter(
    e => e.recurrence !== 'none'
      && e.title.toLowerCase().includes(needle)
      && !e.courseId
  )
}
```

Substring match on recurring, unlinked events. Fires client-side on course name input blur — no API call.

---

## UI Surfaces

### 1. Settings modal — "Courses" tab

- New tab alongside existing settings options
- Lists all courses: color swatch + name + edit/delete per row
- "Add course" opens an inline form: name field + 6-color swatch picker
- On name blur/submit: `suggestEventsForCourse` fires; if matches found, a suggestion strip appears below the form: *"Link 'Calculus MWF' to this course?"* with one-click confirm
- Edit: inline rename + recolor; all linked events update immediately via `resolveEventColor`
- Delete: confirmation prompt, then cascade strip

### 2. Event creation/edit modal — two new fields

**Type toggle** (segmented control: `Event | Deadline`):
- Placed near the top of the modal, below the title
- Switching to `Deadline` hides the end-time field; date remains required
- Switching back to `Event` restores end-time with a sensible default (+1 hour)

**Course selector** (dropdown):
- Lists all courses with color swatches
- Selecting a course locks the manual color picker (grayed out, displays course color)
- Deselecting restores manual color picker
- "Manage courses" link opens Settings to the Courses tab
- If no courses exist: "Add a course" shortcut

### 3. Deadline panel — sidebar, below mini calendar

- Visible when `appMode === 'calendar'` and sidebar is shown (desktop only)
- Sits below the existing `MiniCalendar` component, above the footer copyright line
- Scrollable list of all upcoming deadlines, sorted ascending by date
- Each row: `[course color dot] [assignment name] [relative date: "3 days" / "Today" / "Tomorrow"]`
- Past-due deadlines: muted red color, no dot
- Clicking a deadline: navigates to that date, view switches to day view, event is highlighted
- Empty state: "No upcoming deadlines" in muted text

### 4. Day view — deadline chips above time grid

- A slim chip row rendered above the time grid (not consuming a time slot)
- Only visible when the current day has deadlines
- Each chip: `[color dot] [assignment name]`
- Clicking a chip opens the event edit modal

### 5. Week view — deadline chip row above time grid

- Same chip row spanning the week header area
- Each chip positioned under its day column
- Multiple deadlines on one day stack vertically: max 2 shown, `+N more` label for overflow
- Clicking a chip opens the event edit modal

### 6. Month view — deadline pills on day cells

- Rendered as a pill with a `◆` diamond prefix, visually distinguishing from event bars
- Sits above event bars within the day cell
- Follows existing `+N more` truncation logic
- Color matches course color (or event color if no course)

---

## Color System

No new colors introduced. The existing `EventColor` type (`indigo | violet | rose | emerald | amber | sky`) is reused for courses. The 6-swatch picker already exists in `StickyCard.tsx` and can be extracted into a shared `ColorPicker` component used by both the Stickies and the new Courses settings tab.

---

## Files Affected

| File | Change |
|---|---|
| `app/types/index.ts` | Add `Course` type; add `courseId?` and `type?` to `CalendarEvent` |
| `app/hooks/useCoursesStore.ts` | New file — Zustand store for courses |
| `app/lib/courseUtils.ts` | New file — `resolveEventColor`, `suggestEventsForCourse` |
| `app/hooks/useCalendarStore.ts` | Add deletion cascade when course is deleted (or handle in useCoursesStore) |
| `app/components/SettingsModal.tsx` | Add "Courses" tab with course management UI |
| `app/components/EventModal.tsx` | Add type toggle + course selector |
| `app/components/TimeGrid.tsx` | Add deadline chip row above time grid (day + week) |
| `app/components/MonthView.tsx` | Add deadline pill rendering in day cells |
| `app/u/page.tsx` | Pass `courses` from store to sidebar; add `DeadlinePanel` below `MiniCalendar` |
| `app/components/EventBlock.tsx` | Use `resolveEventColor` instead of `event.color` |
| Possibly extract `ColorPicker.tsx` | Shared 6-swatch picker from `StickyCard.tsx` |

---

## Out of Scope

- Deadline notifications / push reminders (Tier 2)
- Syllabus import (Tier 3)
- Course schedule auto-generation from a course entity
- Multi-course per event
- Deadline grade weight or submission link fields
