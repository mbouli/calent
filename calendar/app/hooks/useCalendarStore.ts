'use client'

import { useState, useEffect, useCallback } from 'react'
import { CalendarEvent, ViewMode } from '../types'
import { createClient } from '../lib/supabase/client'
import { rowToEvent, eventToRow, EventRow } from '../lib/db-types'
import { buildTopUpEvents } from '../lib/recurrence'

const EVENT_COLUMNS =
  'id, title, start, "end", color, notes, all_day, recurrence, recurrence_group_id, recurrence_rule, course_id, type'

export function useCalendarStore() {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<ViewMode>('week')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('events')
      .select(EVENT_COLUMNS)
      .then(({ data }) => {
        if (data) setEvents((data as unknown as EventRow[]).map(rowToEvent))
        setLoading(false)
      })
  }, [])

  const createEvent = useCallback((data: Omit<CalendarEvent, 'id'>) => {
    const id = crypto.randomUUID()
    const e: CalendarEvent = { ...data, id }
    setEvents(prev => [...prev, e])
    const supabase = createClient()
    supabase.from('events').insert({ id, ...eventToRow(data) })
      .then(({ error }) => { if (error) console.error('createEvent failed', error) })
    return e
  }, [])

  const createEvents = useCallback((items: Omit<CalendarEvent, 'id'>[]) => {
    const withIds = items.map(data => ({ ...data, id: crypto.randomUUID() }))
    setEvents(prev => [...prev, ...withIds])
    const supabase = createClient()
    const rows = withIds.map(({ id, ...rest }) => ({ id, ...eventToRow(rest) }))
    supabase.from('events').insert(rows)
      .then(({ error }) => { if (error) console.error('createEvents failed', error) })
  }, [])

  // Roll open-ended custom series forward as the user navigates toward their tail.
  useEffect(() => {
    if (loading) return
    const additions = buildTopUpEvents(events, currentDate, { bufferWeeks: 8, aheadWeeks: 52 })
    if (additions.length > 0) createEvents(additions)
    // `events` intentionally omitted from deps: createEvents updates it, and we only
    // want to react to date changes / load completion, not to our own insertions.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDate, loading, createEvents])

  const updateEvent = useCallback(
    (id: string, updates: Partial<Omit<CalendarEvent, 'id'>>) => {
      setEvents(prev => prev.map(e => (e.id === id ? { ...e, ...updates } : e)))
      const supabase = createClient()
      supabase.from('events').update(eventToRow(updates)).eq('id', id)
        .then(({ error }) => { if (error) console.error('updateEvent failed', error) })
    },
    []
  )

  const deleteEvent = useCallback((id: string) => {
    setEvents(prev => prev.filter(e => e.id !== id))
    const supabase = createClient()
    supabase.from('events').delete().eq('id', id)
      .then(({ error }) => { if (error) console.error('deleteEvent failed', error) })
  }, [])

  const deleteFutureEvents = useCallback((id: string) => {
    setEvents(prev => {
      const target = prev.find(e => e.id === id)
      const supabase = createClient()
      if (!target?.recurrenceGroupId) {
        supabase.from('events').delete().eq('id', id)
          .then(({ error }) => { if (error) console.error('deleteFutureEvents failed', error) })
        return prev.filter(e => e.id !== id)
      }
      supabase
        .from('events')
        .delete()
        .eq('recurrence_group_id', target.recurrenceGroupId)
        .gte('start', target.start.toISOString())
        .then(({ error }) => { if (error) console.error('deleteFutureEvents failed', error) })
      return prev.filter(e =>
        !(e.recurrenceGroupId === target.recurrenceGroupId && e.start >= target.start)
      )
    })
  }, [])

  const stripCourseId = useCallback((courseId: string) => {
    setEvents(prev => prev.map(e => (e.courseId === courseId ? { ...e, courseId: undefined } : e)))
    const supabase = createClient()
    supabase.from('events').update({ course_id: null }).eq('course_id', courseId)
      .then(({ error }) => { if (error) console.error('stripCourseId failed', error) })
  }, [])

  return {
    events,
    loading,
    currentDate,
    setCurrentDate,
    viewMode,
    setViewMode,
    createEvent,
    createEvents,
    updateEvent,
    deleteEvent,
    deleteFutureEvents,
    stripCourseId,
  }
}
