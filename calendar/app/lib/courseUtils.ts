import { CalendarEvent, Course, EventColor } from '../types'
import type { Translate } from './i18n/useT'

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

export function formatDeadlineRelative(date: Date, now: Date, t: Translate): string {
  // Day-level diff (midnight-normalised)
  const todayMidnight = new Date(now)
  todayMidnight.setHours(0, 0, 0, 0)
  const targetMidnight = new Date(date)
  targetMidnight.setHours(0, 0, 0, 0)
  const dayDiff = Math.round((targetMidnight.getTime() - todayMidnight.getTime()) / 86_400_000)

  if (dayDiff === 0) {
    // Same calendar day — use granular minutes/hours
    const diffMs  = date.getTime() - now.getTime()
    const diffMin = Math.round(diffMs / 60_000)
    const diffH   = Math.round(diffMs / 3_600_000)
    if (Math.abs(diffMin) < 1)        return t('deadlines.now')
    if (diffMin > 0 && diffMin < 60)  return t('deadlines.inMinutes', { count: diffMin })
    if (diffH > 0)                    return t('deadlines.inHours', { count: diffH })
    if (diffMin < 0 && diffMin > -60) return t('deadlines.minutesAgo', { count: Math.abs(diffMin) })
    return t('deadlines.hoursAgo', { count: Math.abs(diffH) })
  }

  if (dayDiff === 1)  return t('deadlines.tomorrow')
  if (dayDiff < 0)    return t('deadlines.daysAgo', { count: Math.abs(dayDiff) })
  if (dayDiff < 7)    return t('deadlines.inDays', { count: dayDiff })
  return t('deadlines.inWeeks', { count: Math.ceil(dayDiff / 7) })
}
