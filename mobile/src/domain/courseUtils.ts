// Event-color resolution + deadline helpers — ported from
// /calendar/app/lib/courseUtils.ts (i18n-dependent formatting omitted; the
// relative-time label is reimplemented locally where needed).

import { CalendarEvent, Course, EventColor } from './types';

export function resolveEventColor(event: CalendarEvent, courses: Course[]): EventColor {
  if (event.courseId) {
    const course = courses.find((c) => c.id === event.courseId);
    if (course) return course.color;
  }
  return event.color;
}

export function getUpcomingDeadlines(events: CalendarEvent[]): CalendarEvent[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return events
    .filter((e) => e.type === 'deadline' && e.start >= today)
    .sort((a, b) => a.start.getTime() - b.start.getTime());
}

export function getPastDueDeadlines(events: CalendarEvent[]): CalendarEvent[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return events
    .filter((e) => e.type === 'deadline' && e.start < today)
    .sort((a, b) => b.start.getTime() - a.start.getTime());
}
