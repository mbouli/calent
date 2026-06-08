export type EventColor = 'indigo' | 'rose' | 'emerald' | 'amber' | 'violet' | 'sky'

export type RecurrenceType = 'none' | 'daily' | 'weekdays' | 'weekends' | 'weekly' | 'biweekly' | 'monthly' | 'yearly' | 'custom'

export interface RecurrenceRule {
  daysOfWeek: number[]     // 0 = Sun … 6 = Sat
  intervalWeeks: number    // "every N weeks", >= 1
  endDate: string | null   // ISO date (yyyy-mm-dd), or null = never
  anchorDate: string       // ISO date of occurrence #1 — origin for week counting
}

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
  recurrenceRule?: RecurrenceRule
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
