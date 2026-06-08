'use client'

import React from 'react'
import Image from 'next/image'
import { ChevronLeft, ChevronRight, ChevronDown, Check, CalendarDays, CalendarRange, LayoutGrid, List, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ViewMode } from '../types'
import { formatMonthYear, addDays, addWeeks, addMonths } from '../lib/dateUtils'
import { useT } from '../lib/i18n/useT'

const VIEW_OPTIONS: { value: ViewMode; labelKey: string; icon: React.ElementType }[] = [
  { value: 'day',   labelKey: 'header.day',   icon: CalendarDays  },
  { value: 'week',  labelKey: 'header.week',  icon: CalendarRange },
  { value: 'month', labelKey: 'header.month', icon: LayoutGrid    },
]

interface CalendarHeaderProps {
  currentDate: Date
  viewMode: ViewMode
  onDateChange: (d: Date) => void
  onViewModeChange: (m: ViewMode) => void
  appMode: 'calendar' | 'list'
  onAppModeChange: (mode: 'calendar' | 'list') => void
  onOpenSettings: () => void
}

export function CalendarHeader({
  currentDate,
  viewMode,
  onDateChange,
  onViewModeChange,
  appMode,
  onAppModeChange,
  onOpenSettings,
}: CalendarHeaderProps) {
  const { t, locale } = useT()
  const goBack = () => {
    if (viewMode === 'week')  onDateChange(addWeeks(currentDate, -1))
    else if (viewMode === 'day') onDateChange(addDays(currentDate, -1))
    else onDateChange(addMonths(currentDate, -1))
  }
  const goForward = () => {
    if (viewMode === 'week')  onDateChange(addWeeks(currentDate, 1))
    else if (viewMode === 'day') onDateChange(addDays(currentDate, 1))
    else onDateChange(addMonths(currentDate, 1))
  }
  const goToday = () => onDateChange(new Date())

  const currentOption = VIEW_OPTIONS.find(o => o.value === viewMode) ?? VIEW_OPTIONS[1]
  const CurrentIcon = currentOption.icon

  return (
    <header className="relative flex items-center px-3 sm:px-5 h-14 border-b border-border bg-background shrink-0 z-30">
      {/* Brand — black wordmark in light, white in dark */}
      <Image
        src="/calent_wordmark_black.png"
        alt="Calent"
        width={63}
        height={42}
        className="object-contain dark:hidden"
      />
      <Image
        src="/calent_wordmark_white.png"
        alt="Calent"
        width={63}
        height={42}
        className="object-contain hidden dark:block"
      />

      {/* Date navigation — absolutely centered */}
      <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={goBack}
          className="h-8 w-8 hover:bg-foreground/5 text-muted-foreground"
        >
          <ChevronLeft size={15} />
        </Button>

        <button
          onClick={goToday}
          className="px-3 py-1 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors min-w-[120px] sm:min-w-[170px] text-center capitalize"
        >
          {formatMonthYear(currentDate, locale)}
        </button>

        <Button
          variant="ghost"
          size="icon"
          onClick={goForward}
          className="h-8 w-8 hover:bg-foreground/5 text-muted-foreground"
        >
          <ChevronRight size={15} />
        </Button>
      </div>

      {/* Settings — mobile only, pinned top-right (desktop has it in the right block) */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onOpenSettings}
        aria-label={t('header.settings')}
        className="ml-auto md:hidden h-8 w-8 hover:bg-foreground/5 text-muted-foreground"
      >
        <Settings size={16} />
      </Button>

      {/* Right controls: Calendar/List switcher + View dropdown — desktop only */}
      <div className="ml-auto hidden md:flex items-center gap-2">
        {/* Sliding Calendar / List switcher */}
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

        {/* View dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-muted border border-border hover:bg-muted transition-colors text-foreground outline-none">
            <CurrentIcon size={11} className="text-muted-foreground" />
            {t(currentOption.labelKey)}
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

        {/* Settings */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onOpenSettings}
          className="h-8 w-8 hover:bg-foreground/5 text-muted-foreground"
        >
          <Settings size={15} />
        </Button>
      </div>
    </header>
  )
}
