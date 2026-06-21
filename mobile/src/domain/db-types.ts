// Row shapes (snake_case from Supabase) and row<->app mappers.
// Mirrored from /calendar/app/lib/db-types.ts.

import {
  CalendarEvent,
  Course,
  EventColor,
  RecurrenceRule,
  RecurrenceType,
  Sticky,
  StickyItem,
} from './types';

export interface EventRow {
  id: string;
  title: string;
  start: string;
  end: string;
  color: EventColor;
  notes: string | null;
  all_day: boolean;
  recurrence: RecurrenceType;
  recurrence_group_id: string | null;
  recurrence_rule: RecurrenceRule | null;
  course_id: string | null;
  type: 'event' | 'deadline';
}

export interface CourseRow {
  id: string;
  name: string;
  color: EventColor;
}

export interface StickyRow {
  id: string;
  title: string;
  color: EventColor;
  body: string | null;
  position: number;
}

export interface StickyItemRow {
  id: string;
  sticky_id: string;
  text: string;
  done: boolean;
  position: number;
}

export function rowToEvent(r: EventRow): CalendarEvent {
  return {
    id: r.id,
    title: r.title,
    start: new Date(r.start),
    end: new Date(r.end),
    color: r.color,
    notes: r.notes ?? undefined,
    allDay: r.all_day,
    recurrence: r.recurrence,
    recurrenceGroupId: r.recurrence_group_id ?? undefined,
    recurrenceRule: r.recurrence_rule ?? undefined,
    courseId: r.course_id ?? undefined,
    type: r.type,
  };
}

export function rowToCourse(r: CourseRow): Course {
  return { id: r.id, name: r.name, color: r.color };
}

export function rowToSticky(r: StickyRow, items: StickyItem[]): Sticky {
  return {
    id: r.id,
    title: r.title,
    color: r.color,
    body: r.body ?? undefined,
    order: r.position,
    items,
  };
}

export function rowToStickyItem(r: StickyItemRow): StickyItem {
  return { id: r.id, text: r.text, done: r.done };
}

export function eventToRow(e: Partial<CalendarEvent>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (e.title !== undefined) row.title = e.title;
  if (e.start !== undefined) row.start = e.start.toISOString();
  if (e.end !== undefined) row.end = e.end.toISOString();
  if (e.color !== undefined) row.color = e.color;
  if ('notes' in e) row.notes = e.notes ?? null;
  if (e.allDay !== undefined) row.all_day = e.allDay;
  if (e.recurrence !== undefined) row.recurrence = e.recurrence;
  if ('recurrenceGroupId' in e) row.recurrence_group_id = e.recurrenceGroupId ?? null;
  if ('recurrenceRule' in e) row.recurrence_rule = e.recurrenceRule ?? null;
  if ('courseId' in e) row.course_id = e.courseId ?? null;
  if (e.type !== undefined) row.type = e.type;
  return row;
}
