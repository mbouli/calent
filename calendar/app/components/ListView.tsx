'use client'

import { CalendarEvent, ViewMode } from '../types'
import { StickiesPanel } from './StickiesPanel'
import { SchedulePanel } from './SchedulePanel'
import type { useStickiesStore } from '../hooks/useStickiesStore'

interface ListViewProps {
  events: CalendarEvent[]
  currentDate: Date
  viewMode: ViewMode
  onEditEvent: (event: CalendarEvent) => void
  // Provided by the page so the store survives calendar/list toggles.
  stickiesStore: ReturnType<typeof useStickiesStore>
}

export function ListView({ events, currentDate, viewMode, onEditEvent, stickiesStore }: ListViewProps) {
  const {
    stickies,
    createSticky,
    updateSticky,
    deleteSticky,
    reorderStickies,
    addItem,
    toggleItem,
    updateItem,
    clearDoneItems,
    reorderItems,
  } = stickiesStore

  return (
    <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
      {/* Stickies — full width on mobile, 75% on desktop */}
      <div className="flex flex-col overflow-hidden border-b border-border/40 md:border-b-0 md:border-r flex-1 md:flex-none md:w-3/4">
        <StickiesPanel
          stickies={stickies}
          onCreateSticky={createSticky}
          onUpdateSticky={updateSticky}
          onDeleteSticky={deleteSticky}
          onReorderStickies={reorderStickies}
          onAddItem={addItem}
          onToggleItem={toggleItem}
          onUpdateItem={updateItem}
          onClearDoneItems={clearDoneItems}
          onReorderItems={reorderItems}
        />
      </div>

      {/* Schedule — fixed height on mobile, 25% on desktop */}
      <div className="flex flex-col overflow-hidden shrink-0 h-52 md:h-auto md:w-1/4">
        <SchedulePanel
          events={events}
          currentDate={currentDate}
          viewMode={viewMode}
          onEditEvent={onEditEvent}
        />
      </div>
    </div>
  )
}
