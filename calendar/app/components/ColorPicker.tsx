'use client'

import { EventColor } from '../types'
import { cn } from '@/lib/utils'

const SWATCHES: { value: EventColor; cls: string }[] = [
  { value: 'indigo',  cls: 'bg-indigo-400'  },
  { value: 'violet',  cls: 'bg-violet-400'  },
  { value: 'rose',    cls: 'bg-rose-400'    },
  { value: 'emerald', cls: 'bg-emerald-400' },
  { value: 'amber',   cls: 'bg-amber-400'   },
  { value: 'sky',     cls: 'bg-sky-400'     },
]

interface ColorPickerProps {
  value: EventColor
  onChange: (color: EventColor) => void
  disabled?: boolean
}

export function ColorPicker({ value, onChange, disabled }: ColorPickerProps) {
  return (
    <div className={cn('flex gap-1.5', disabled && 'opacity-40 pointer-events-none')}>
      {SWATCHES.map(({ value: c, cls }) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          aria-label={c}
          disabled={disabled}
          className={cn(
            'w-5 h-5 rounded-full transition-all',
            cls,
            value === c && 'ring-2 ring-offset-1 ring-gray-400 scale-110'
          )}
        />
      ))}
    </div>
  )
}
