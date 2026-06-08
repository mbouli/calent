'use client'

import { Plus, LayoutGrid, List, CalendarDays, CalendarRange, Check, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ViewMode } from '../types'
import { useT } from '../lib/i18n/useT'

const VIEW_OPTIONS: { value: ViewMode; labelKey: string; icon: React.ElementType }[] = [
  { value: 'day',   labelKey: 'header.day',   icon: CalendarDays  },
  { value: 'week',  labelKey: 'header.week',  icon: CalendarRange },
  { value: 'month', labelKey: 'header.month', icon: LayoutGrid    },
]

interface MobileNavProps {
  appMode: 'calendar' | 'list'
  viewMode: ViewMode
  onAppModeChange: (mode: 'calendar' | 'list') => void
  onViewModeChange: (mode: ViewMode) => void
  onCreateEvent: () => void
}

export function MobileNav({
  appMode,
  viewMode,
  onAppModeChange,
  onViewModeChange,
  onCreateEvent,
}: MobileNavProps) {
  const { t } = useT()
  const currentView = VIEW_OPTIONS.find(o => o.value === viewMode) ?? VIEW_OPTIONS[0]
  const CurrentIcon = currentView.icon

  return (
    <div
      className="md:hidden flex items-center justify-between px-4 py-2.5 bg-background border-t border-border shrink-0"
      style={{ paddingBottom: 'calc(0.625rem + env(safe-area-inset-bottom))' }}
    >
      {/* App mode switcher */}
      <div className="flex items-center bg-muted border border-border rounded-md p-0.5 gap-0.5">
        {(['calendar', 'list'] as const).map(mode => (
          <button
            key={mode}
            onClick={() => onAppModeChange(mode)}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-all duration-200',
              appMode === mode
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {mode === 'calendar' ? <LayoutGrid size={11} /> : <List size={11} />}
            {mode === 'calendar' ? t('header.calendar') : t('header.list')}
          </button>
        ))}
      </div>

      {/* New event FAB */}
      <button
        onClick={onCreateEvent}
        className="w-11 h-11 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md hover:bg-primary/90 active:bg-primary transition-colors"
      >
        <Plus size={20} />
      </button>

      {/* View mode dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-muted border border-border hover:bg-muted transition-colors text-foreground outline-none">
          <CurrentIcon size={11} className="text-muted-foreground" />
          {t(currentView.labelKey)}
          <ChevronDown size={11} className="text-muted-foreground" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[120px]">
          {VIEW_OPTIONS.map(({ value, labelKey, icon: Icon }) => (
            <DropdownMenuItem
              key={value}
              onClick={() => onViewModeChange(value)}
              className="flex items-center justify-between gap-3"
            >
              <span className="flex items-center gap-2">
                <Icon size={13} className="text-muted-foreground" />
                {t(labelKey)}
              </span>
              {viewMode === value && <Check size={13} className="text-foreground" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
