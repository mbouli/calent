'use client'

import { useState, useRef, useEffect } from 'react'
import { Plus, Search } from 'lucide-react'
import { CalendarHeader } from './components/CalendarHeader'
import { TimeGrid } from './components/TimeGrid'
import { MonthView } from './components/MonthView'
import { MiniCalendar } from './components/MiniCalendar'
import { ListView } from './components/ListView'
import { EventModal } from './components/EventModal'
import { DeleteRecurringModal } from './components/DeleteRecurringModal'
import { MobileNav } from './components/MobileNav'
import { SettingsModal } from './components/SettingsModal'
import { DashboardLoader } from './components/DashboardLoader'
import { useCalendarStore } from './hooks/useCalendarStore'
import { useSettingsStore } from './hooks/useSettingsStore'
import { useCoursesStore } from './hooks/useCoursesStore'
import { useStickiesStore } from './hooks/useStickiesStore'
import { DeadlinePanel } from './components/DeadlinePanel'
import { SpotlightBar } from './components/SpotlightBar'
import { CalendarEvent, RecurrenceType, RecurrenceRule } from './types'
import { startOfWeek, addDays, addMonths } from './lib/dateUtils'
import { generateCustomOccurrences } from './lib/recurrence'
import { SettingsProvider } from './lib/settings-context'
import { translate } from './lib/i18n'

interface ModalState {
  open: boolean
  event?: CalendarEvent
  defaultStart?: Date
  defaultEnd?: Date
  defaultTitle?: string
}

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

  if (recurrence === 'daily') {
    for (let i = 1; i < 90; i++) results.push(make(addDays(base.start, i)))
  } else if (recurrence === 'weekdays') {
    for (let i = 1, count = 0; count < 90; i++) {
      const d = addDays(base.start, i)
      if (d.getDay() !== 0 && d.getDay() !== 6) { results.push(make(d)); count++ }
    }
  } else if (recurrence === 'weekends') {
    for (let i = 1, count = 0; count < 52; i++) {
      const d = addDays(base.start, i)
      if (d.getDay() === 0 || d.getDay() === 6) { results.push(make(d)); count++ }
    }
  } else if (recurrence === 'weekly') {
    for (let i = 1; i <= 52; i++) results.push(make(addDays(base.start, i * 7)))
  } else if (recurrence === 'biweekly') {
    for (let i = 1; i <= 26; i++) results.push(make(addDays(base.start, i * 14)))
  } else if (recurrence === 'monthly') {
    for (let i = 1; i <= 12; i++) results.push(make(addMonths(base.start, i)))
  } else if (recurrence === 'yearly') {
    for (let i = 1; i <= 3; i++) {
      const d = new Date(base.start)
      d.setFullYear(d.getFullYear() + i)
      results.push(make(d))
    }
  }

  return results
}

export default function HomePage() {
  const {
    events,
    loading: eventsLoading,
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
  } = useCalendarStore()

  const { courses, createCourse, updateCourse, deleteCourse } = useCoursesStore()

  // Owned at the page level (not inside ListView) so it fetches once and
  // persists across calendar/list toggles — otherwise ListView remounts and
  // refetches stickies every switch, causing a blank flash.
  const stickiesStore = useStickiesStore()

  const { settings, loading: settingsLoading, updateSettings } = useSettingsStore()
  const [modal, setModal] = useState<ModalState>({ open: false })
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [appMode, setAppMode] = useState<'calendar' | 'list'>('calendar')
  const [settingsTab, setSettingsTab] = useState<'preferences' | 'customization' | 'account' | 'courses'>('preferences')
  const [spotlightOpen, setSpotlightOpen] = useState(false)
  const [deleteRecurringOpen, setDeleteRecurringOpen] = useState(false)
  const [pendingDeleteEvent, setPendingDeleteEvent] = useState<CalendarEvent | null>(null)
  const navDirectionRef = useRef(0)

  // Default to month view on mobile
  useEffect(() => {
    if (window.innerWidth < 768) setViewMode('month')
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setSpotlightOpen(prev => !prev)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const handleDateChange = (newDate: Date) => {
    navDirectionRef.current = newDate > currentDate ? 1 : -1
    setCurrentDate(newDate)
  }

  const handleViewModeChange = (mode: typeof viewMode) => {
    navDirectionRef.current = 0
    setViewMode(mode)
  }

  const handleAppModeChange = (mode: 'calendar' | 'list') => {
    navDirectionRef.current = 0
    setAppMode(mode)
  }

  const animKey =
    viewMode === 'week'
      ? `week-${startOfWeek(currentDate, settings.startWeekMonday).getTime()}`
      : viewMode === 'day'
      ? `day-${currentDate.toDateString()}`
      : `month-${currentDate.getFullYear()}-${currentDate.getMonth()}`

  const openCreate = (start: Date, end: Date) =>
    setModal({ open: true, defaultStart: start, defaultEnd: end })

  const openEdit = (event: CalendarEvent) =>
    setModal({ open: true, event })

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

  const handleDelete = () => {
    if (!modal.event) return
    if (modal.event.recurrenceGroupId) {
      setPendingDeleteEvent(modal.event)
      setModal(m => ({ ...m, open: false }))
      setDeleteRecurringOpen(true)
    } else {
      deleteEvent(modal.event.id)
      setModal({ open: false })
    }
  }

  const handleCalendarDelete = (id: string) => {
    const event = events.find(e => e.id === id)
    if (event?.recurrenceGroupId) {
      setPendingDeleteEvent(event)
      setDeleteRecurringOpen(true)
    } else {
      deleteEvent(id)
    }
  }

  const closeDeleteRecurring = () => {
    setDeleteRecurringOpen(false)
    setPendingDeleteEvent(null)
  }

  const handleDeleteOne = () => {
    if (pendingDeleteEvent) deleteEvent(pendingDeleteEvent.id)
    closeDeleteRecurring()
    setModal({ open: false })
  }

  const handleDeleteFuture = () => {
    if (pendingDeleteEvent) deleteFutureEvents(pendingDeleteEvent.id)
    closeDeleteRecurring()
    setModal({ open: false })
  }

  const handleDeadlineClick = (event: CalendarEvent) => {
    openEdit(event)
  }

  const handleSpotlightEdit = (prefill: { title: string; start: Date; end: Date }) => {
    setModal({ open: true, defaultStart: prefill.start, defaultEnd: prefill.end, defaultTitle: prefill.title })
  }

  const handleDeleteCourse = (id: string) => {
    deleteCourse(id)
    stripCourseId(id)
  }

  const handleMiniCalendarSelect = (date: Date) => {
    navDirectionRef.current = date > currentDate ? 1 : -1
    setCurrentDate(date)
    if (viewMode === 'month') setViewMode('day')
  }

  const handleMonthDayClick = (date: Date) => {
    setCurrentDate(date)
    setViewMode('day')
  }

  // Show a branded splash until the calendar data + settings have loaded from
  // Supabase, so the dashboard doesn't flash empty / flip layout on open.
  if (eventsLoading || settingsLoading) {
    return <DashboardLoader />
  }

  // HomePage renders above its own SettingsProvider, so translate directly from
  // the active language rather than via the useT() context hook.
  const t = (key: string, params?: Record<string, string | number>) =>
    translate(settings.language, key, params)

  return (
    <SettingsProvider value={settings}>
    <div className="flex flex-col h-dvh overflow-hidden bg-background">
      <CalendarHeader
        currentDate={currentDate}
        viewMode={viewMode}
        onDateChange={handleDateChange}
        onViewModeChange={handleViewModeChange}
        appMode={appMode}
        onAppModeChange={handleAppModeChange}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      <div className="flex flex-1 overflow-hidden">
        {appMode === 'calendar' && (
          <div className="hidden md:flex w-[220px] shrink-0 border-r border-border bg-background flex-col overflow-hidden">
            <div className="px-3 pt-3 pb-1 space-y-1.5">
              <button
                onClick={() => {
                  const now = new Date()
                  openCreate(now, new Date(now.getTime() + 60 * 60 * 1000))
                }}
                className="w-full flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                <Plus size={11} />
                {t('sidebar.newEvent')}
              </button>
              <button
                onClick={() => setSpotlightOpen(true)}
                title={t('sidebar.spotlight')}
                className="group w-full flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-muted-foreground border border-border hover:bg-muted/50 transition-colors"
              >
                <Search size={11} className="shrink-0" />
                <span className="flex-1 text-left">{t('sidebar.spotlight')}</span>
                <kbd className="shrink-0 rounded px-1 py-px font-mono text-[9px] bg-muted text-muted-foreground/70 group-hover:text-muted-foreground">⌘K</kbd>
              </button>
            </div>
            <div>
              <MiniCalendar
                selectedDate={currentDate}
                viewMode={viewMode}
                onSelectDate={handleMiniCalendarSelect}
              />
            </div>
            <DeadlinePanel
              events={events}
              courses={courses}
              onDeadlineClick={handleDeadlineClick}
            />
            <div className="mt-auto px-3 py-3 border-t border-border/30">
              <p className="text-[10px] text-muted-foreground/40 text-center">© 2026 calent.xyz</p>
            </div>
          </div>
        )}

        {appMode === 'list' ? (
          <ListView
            events={events}
            currentDate={currentDate}
            viewMode={viewMode}
            onEditEvent={openEdit}
            stickiesStore={stickiesStore}
          />
        ) : viewMode === 'month' ? (
          <MonthView
            currentDate={currentDate}
            events={events}
            onDayClick={handleMonthDayClick}
            onEventClick={openEdit}
            courses={courses}
          />
        ) : (
          <TimeGrid
            events={events}
            currentDate={currentDate}
            viewMode={viewMode}
            navDirection={navDirectionRef.current}
            animKey={animKey}
            onCreateEvent={openCreate}
            onEditEvent={openEdit}
            onUpdateEvent={updateEvent}
            onDeleteEvent={handleCalendarDelete}
            courses={courses}
          />
        )}
      </div>

      <MobileNav
        appMode={appMode}
        viewMode={viewMode}
        onAppModeChange={handleAppModeChange}
        onViewModeChange={handleViewModeChange}
        onCreateEvent={() => {
          const now = new Date()
          openCreate(now, new Date(now.getTime() + 60 * 60 * 1000))
        }}
      />

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

      <EventModal
        open={modal.open}
        event={modal.event}
        defaultStart={modal.defaultStart}
        defaultEnd={modal.defaultEnd}
        defaultTitle={modal.defaultTitle}
        onSave={handleSave}
        onDelete={modal.event ? handleDelete : undefined}
        onClose={() => setModal({ open: false })}
        courses={courses}
        onOpenCourses={() => { setSettingsOpen(true); setSettingsTab('courses') }}
      />

      <DeleteRecurringModal
        open={deleteRecurringOpen}
        onClose={closeDeleteRecurring}
        onDeleteOne={handleDeleteOne}
        onDeleteFuture={handleDeleteFuture}
      />

      <SpotlightBar
        open={spotlightOpen}
        onClose={() => setSpotlightOpen(false)}
        onConfirm={(data) => createEvent(data)}
        onEdit={handleSpotlightEdit}
      />
    </div>
    </SettingsProvider>
  )
}
