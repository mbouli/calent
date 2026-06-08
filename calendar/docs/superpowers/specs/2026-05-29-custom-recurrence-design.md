# Custom Event Recurrence — Design

**Date:** 2026-05-29
**Status:** Approved (pending spec review)

## Goal

Let users define a custom repeat rule for an event: pick specific days of the
week, repeat every _N_ weeks, and end either on a chosen date or never. This
extends the existing fixed preset list (`daily`, `weekdays`, `weekends`,
`weekly`, `biweekly`, `monthly`, `yearly`).

## Current architecture (context)

- `RecurrenceType` (`app/types/index.ts`) is a string enum stored per event row.
- Recurrence is **materialized**: `generateRecurringEvents` in `app/u/page.tsx`
  creates N real event rows linked by a shared `recurrence_group_id`, capped at
  finite horizons (e.g. 90 days, 52 weeks).
- Edit/delete "this & future" already works off `recurrence_group_id` + start
  time (`deleteFutureEvents` in `useCalendarStore`, `DeleteRecurringModal`).
- The Repeat dropdown already hides the `weekends` preset for weekday events and
  the `weekdays` preset for weekend events (`EventModal.tsx:425-430`). **This
  filtering stays unchanged.**
- The Supabase schema is managed in the dashboard (no migration files in repo);
  schema changes ship as a one-time SQL statement run by the user.

## Data model

Add `'custom'` to `RecurrenceType`. Add a structured rule:

```ts
export interface RecurrenceRule {
  daysOfWeek: number[]     // 0 = Sun … 6 = Sat
  intervalWeeks: number    // "every N weeks", >= 1
  endDate: string | null   // ISO date string, or null = never
  anchorDate: string       // ISO date of occurrence #1 — origin for week counting
}
```

`CalendarEvent` gains `recurrenceRule?: RecurrenceRule`.

### Persistence

- New nullable column on `events`: `recurrence_rule jsonb`.
- Stored on **every row** in the series (denormalized) so any loaded instance
  carries the full rule — the top-up logic relies on this.
- `EventRow` gains `recurrence_rule: RecurrenceRule | null`; mapped in
  `rowToEvent` and `eventToRow` (`app/lib/db-types.ts`).

### SQL the user runs (one time, Supabase dashboard)

```sql
alter table events add column recurrence_rule jsonb;
```

If `recurrence` is a Postgres enum (verify during implementation), also:

```sql
alter type <recurrence_enum_name> add value 'custom';
```

If `recurrence` is a plain `text` column, no enum change is needed.

## Generation semantics

`generateRecurringEvents` gains a custom branch. Inputs: base event, the
`RecurrenceRule`, and an `until` horizon date.

- **Occurrence #1 is always the event's own start date.** Its weekday is always
  part of `daysOfWeek` (pre-selected and locked in the picker), guaranteeing the
  created event lands on a valid day and avoiding an orphan instance.
- Week interval is counted from the week containing the start date
  (`anchorDate`). A week is "active" when
  `weeksSinceAnchor % intervalWeeks === 0`.
- For each active week, emit one occurrence per selected weekday, carrying the
  same time-of-day and duration as the base event.
- Bounded by `min(endDate, horizon)`. Occurrences strictly after `endDate` are
  never created.
- **Initial generation** fills ~1 year (52 weeks) ahead of the start date.

## Rolling top-up (trigger: on navigate)

Open-ended series (`recurrence === 'custom'` and `endDate === null`) must be
extended as the user moves forward in time.

- Triggered when `currentDate` changes in `useCalendarStore` (this also covers
  initial load, since `currentDate` is set then).
- For each open-ended custom group: find the latest occurrence start. If it is
  within a buffer (~8 weeks) of the viewed `currentDate`, generate further
  occurrences from the latest one (exclusive) up to ~1 year ahead of
  `currentDate`, reusing the same `recurrence_group_id` and `recurrenceRule`,
  and insert them via `createEvents`.
- Never generates past `endDate` (irrelevant here since endDate is null, but the
  shared generation helper enforces it regardless).
- Starting generation from the latest existing occurrence prevents duplicate
  inserts.

## UI — custom builder

In `EventModal`:

- Add a **"Custom…"** item to the Repeat dropdown. Selecting it opens a small
  **popover/sheet** (separate from the main dropdown) containing:
  - A weekday toggle row (`S M T W T F S`). The event's own weekday is
    pre-selected and locked on.
  - An **"Every [N] weeks"** stepper / number input (min 1).
  - An end selector: **Never** / **On date** with a date picker.
  - Done / Cancel actions.
- Once a rule is built, the dropdown trigger shows a summary chip, e.g.
  *"Every 2 weeks on Mon, Wed"*.
- `EventModal`'s `onSave` is extended to pass the `RecurrenceRule` (folded into
  the saved event data as `recurrenceRule`, or as an added parameter).
- The existing weekday/weekend **preset** filtering is untouched. The custom
  picker itself allows any days (it's explicitly "choose your own"), with the
  event's own day locked on.

A new component (e.g. `CustomRecurrenceModal` / popover) owns the builder state
and returns a `RecurrenceRule`.

## Edit / delete

- Custom series share a `recurrence_group_id`, so the existing
  **DeleteRecurringModal** (this / this-&-future / all) works unchanged.
- **Editing a custom rule applies to "this & future"**: regenerate from the
  edited event forward via the existing `deleteFutureEvents`-then-recreate path;
  past occurrences keep the old rule. Editing loads the stored `recurrenceRule`
  back into the builder.

## Out of scope (YAGNI)

- Interval units other than weeks (no every-N-days / months / years custom).
- Monthly "nth weekday" rules (e.g. "3rd Tuesday").
- Editing scope "whole series" / rewriting past occurrences.
- Per-occurrence exceptions beyond what single-event edit/delete already gives.

## Affected files

- `app/types/index.ts` — `RecurrenceType`, `RecurrenceRule`, `CalendarEvent`.
- `app/lib/db-types.ts` — `EventRow`, `rowToEvent`, `eventToRow`.
- `app/u/page.tsx` — `generateRecurringEvents` custom branch, save/edit wiring.
- `app/hooks/useCalendarStore.ts` — rolling top-up on `currentDate` change.
- `app/components/EventModal.tsx` — "Custom…" option + builder trigger + summary.
- New: custom recurrence builder component.
- One-time Supabase SQL (run by user).
```
