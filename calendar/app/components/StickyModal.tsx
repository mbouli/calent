'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { EventColor } from '../types'
import { useT } from '../lib/i18n/useT'

const COLORS: EventColor[] = ['indigo', 'violet', 'rose', 'emerald', 'amber', 'sky']

const COLOR_SWATCH: Record<EventColor, string> = {
  indigo: 'bg-indigo-400', violet: 'bg-violet-400', rose: 'bg-rose-400',
  emerald: 'bg-emerald-400', amber: 'bg-amber-400', sky: 'bg-sky-400',
}

const COLOR_RING: Record<EventColor, string> = {
  indigo: 'ring-indigo-400', violet: 'ring-violet-400', rose: 'ring-rose-400',
  emerald: 'ring-emerald-400', amber: 'ring-amber-400', sky: 'ring-sky-400',
}

interface StickyModalProps {
  open: boolean
  onSave: (title: string, color: EventColor) => void
  onClose: () => void
}

export function StickyModal({ open, onSave, onClose }: StickyModalProps) {
  const { t } = useT()
  const [title, setTitle] = useState('')
  const [color, setColor] = useState<EventColor>('indigo')

  const handleSave = () => {
    if (!title.trim()) return
    onSave(title.trim(), color)
    setTitle('')
    setColor('indigo')
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-xs">
        <DialogHeader>
          <DialogTitle className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/60">
            {t('stickies.newSticky')}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-1">
          <Input
            placeholder={t('stickies.titlePlaceholder')}
            value={title}
            onChange={e => setTitle(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSave()}
            autoFocus
            className="text-base font-semibold bg-transparent border-0 border-b border-border rounded-none px-0 h-auto pb-2 focus-visible:ring-0 placeholder:text-muted-foreground/40"
          />
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground/50 mb-2">{t('stickies.color')}</p>
            <div className="flex gap-2.5">
              {COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={cn(
                    'w-6 h-6 rounded-full transition-all duration-150',
                    COLOR_SWATCH[c],
                    color === c
                      ? `ring-2 ring-offset-2 ring-offset-background ${COLOR_RING[c]} scale-110`
                      : 'opacity-40 hover:opacity-75'
                  )}
                />
              ))}
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="ghost" size="sm" onClick={onClose} className="h-8 px-3 text-muted-foreground">
            {t('common.cancel')}
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!title.trim()}
            className="h-8 px-4 bg-primary hover:bg-primary/90 text-primary-foreground border-0 disabled:opacity-30"
          >
            {t('common.create')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
