# List View — Design Spec
_Date: 2026-05-27_

## Overview

Add a **List View** mode to Calent alongside the existing Calendar View. List View replaces the time-grid with a productivity-focused layout: a large stickies board (75% width) on the left and a slim schedule column (25% width) on the right. A **Calendar / List switcher** in the header toggles between the two top-level modes.

---

## Layout

```
┌─────────────────────────────────────────────────────────┐
│  Header: [Calent] ← May 26–Jun 1 → [Cal|List] [Week ▾]   │
├──────────────────────────────────────┬──────────────────┤
│  Stickies (75%)                      │  Schedule (25%)  │
│                                      │                  │
│  ┌──────┐ ┌──────┐ ┌──────┐         │  Mon 26          │
│  │ 🟦   │ │ 🌹   │ │ 🟢   │         │  · Team standup  │
│  │ todo │ │ note │ │ todo │         │  · Lunch         │
│  └──────┘ └──────┘ └──────┘         │                  │
│  ┌──────┐ ┌──────┐ ┌──────┐         │  Tue 27 [today]  │
│  │ 🟣   │ │ 🟡   │ │ + New│         │  · Design review │
│  └──────┘ └──────┘ └──────┘         │                  │
└──────────────────────────────────────┴──────────────────┘
```

---

## Header Changes

- Add a **Calendar / List segmented switcher** to the left of the existing view dropdown (Week ▾).
- The view dropdown (Day / Week / Month) remains present in both modes. In List View, it controls the time scope of the schedule column (day = today only, week = 7-day list, month = 30-day list).
- Switching between Calendar and List preserves the current date and view scope.

---

## Stickies Panel (75%)

### Data model — `Sticky`

```ts
interface StickyItem {
  id: string
  text: string
  done: boolean
}

interface Sticky {
  id: string
  title: string
  color: EventColor          // reuses existing 6-color palette
  items: StickyItem[]        // empty array = plain note (no checklist)
  body?: string              // free-text note (shown when items is empty)
  order: number              // for drag-to-reorder
}
```

A sticky with `items.length === 0` and a non-empty `body` renders as a plain text note. A sticky with `items.length > 0` renders as a to-do checklist. Both modes can coexist (body shown below checklist if present).

### Layout

- 3-column CSS grid, `align-content: start`, wraps naturally.
- Each card: rounded corners, color-tinted background matching the 6-color palette, subtle shadow.
- Drag handle (⠿) top-right corner — drag to reorder within the grid.
- Reordering updates the `order` field and persists to localStorage.

### Interactions

| Action | Trigger |
|---|---|
| Create sticky | Click "+ New sticky" card at end of grid → color picker sheet → confirm |
| Edit title | Click title text inline |
| Add checklist item | Click "+ Add item" below last item, or press Enter on last item |
| Check/uncheck item | Click checkbox → item strikes through |
| Delete checked items | Long-press / right-click on sticky → "Clear done" |
| Edit plain note body | Click body text inline |
| Change color | Right-click sticky → color picker |
| Delete sticky | Right-click sticky → "Delete" |
| Reorder | Drag by handle |

### Persistence

Stickies stored in localStorage under key `calent-stickies` as a JSON array of `Sticky`. Loaded on mount, persisted on every mutation.

---

## Schedule Panel (25%)

- Slim read-only column showing calendar events grouped by day for the current scope (day / week / month).
- Each day shows: day name + number (today gets the black badge), then a list of events with a colored dot, truncated title, and time range.
- "No events" placeholder for empty days.
- Clicking an event opens the existing `EventModal` in edit mode.
- The panel header shows the current date range and is sticky.

---

## New Components

| File | Purpose |
|---|---|
| `app/components/ListView.tsx` | Root list view layout — renders stickies panel + schedule panel side by side |
| `app/components/StickiesPanel.tsx` | 75% panel: grid of sticky cards, add button, drag-to-reorder logic |
| `app/components/StickyCard.tsx` | Individual sticky card: title, checklist or plain text, drag handle |
| `app/components/StickyModal.tsx` | Creation sheet: title input + color picker (no time fields needed) |
| `app/components/SchedulePanel.tsx` | 25% panel: day-grouped event list for current scope |

---

## State Changes

- `useCalendarStore` gains no new fields — `currentDate` and `viewMode` (day/week/month) continue to drive the schedule panel scope.
- New hook `useStickiesStore` (mirrors `useCalendarStore` pattern): CRUD + reorder for stickies, localStorage-backed.
- `page.tsx` gains a top-level `appMode: 'calendar' | 'list'` state variable (not persisted — defaults to `'calendar'` on load).

---

## Types Changes

```ts
// Add to app/types/index.ts
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

---

## Out of Scope (MVP)

- Due dates on stickies (noted as future enhancement).
- Syncing stickies to calendar events.
- Drag stickies between the board and the schedule.
- Mobile layout.
