'use client'

import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Search } from 'lucide-react'
import { parseEvent, ParsedEvent } from '../lib/parseEvent'
import { CalendarEvent, EventColor } from '../types'
import { formatTime, fromZoned } from '../lib/dateUtils'
import { useT, type Translate } from '../lib/i18n/useT'
import { useAppSettings } from '../lib/settings-context'

interface SpotlightBarProps {
  open: boolean
  onClose: () => void
  onConfirm: (data: Omit<CalendarEvent, 'id'>) => void
  onEdit: (prefill: { title: string; start: Date; end: Date }) => void
}

function formatPreviewDate(start: Date, end: Date, t: Translate, locale: string): string {
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)

  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()

  let dayLabel: string
  if (isSameDay(start, today)) dayLabel = t('spotlight.today')
  else if (isSameDay(start, tomorrow)) dayLabel = t('spotlight.tomorrow')
  else dayLabel = start.toLocaleDateString(locale, { weekday: 'long', month: 'short', day: 'numeric' })

  return `${dayLabel} · ${formatTime(start)}–${formatTime(end)}`
}

export function SpotlightBar({ open, onClose, onConfirm, onEdit }: SpotlightBarProps) {
  const { t, locale } = useT()
  const { timezone } = useAppSettings()
  const [input, setInput] = useState('')
  const [parsed, setParsed] = useState<ParsedEvent | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Reset state when opened
  useEffect(() => {
    if (open) {
      setInput('')
      setParsed(null)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  // Parse on every keystroke
  useEffect(() => {
    if (!input.trim()) { setParsed(null); return }
    setParsed(parseEvent(input))
  }, [input])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') { onClose(); return }
    if (e.key === 'Enter' && parsed) { handleConfirm(); return }
  }

  const handleConfirm = () => {
    if (!parsed) return
    // The parsed time is the wall-clock the user typed; interpret it in the
    // active timezone and store the matching absolute instant.
    onConfirm({
      title: parsed.title,
      start: fromZoned(parsed.start, timezone),
      end: fromZoned(parsed.end, timezone),
      color: 'indigo' as EventColor,
    })
    onClose()
  }

  const handleEdit = () => {
    if (!parsed) return
    onEdit({
      title: parsed.title,
      start: fromZoned(parsed.start, timezone),
      end: fromZoned(parsed.end, timezone),
    })
    onClose()
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            className="fixed inset-0 z-50 bg-black/12 backdrop-blur-[3px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
          />

          {/* Command bar */}
          <motion.div
            key="bar"
            className="fixed left-1/2 top-[26%] z-50 w-full max-w-[500px] -translate-x-1/2 px-4"
            style={{ fontFamily: 'var(--font-geist)' }}
            initial={{ opacity: 0, y: -10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.16, ease: [0.4, 0, 0.2, 1] }}
          >
            {/* Input row */}
            <div
              className="flex items-center gap-3 rounded-[14px] bg-card px-4 py-3"
              style={{
                border: '1px solid var(--border)',
                boxShadow: '0 2px 8px rgba(13,13,13,0.06), 0 16px 48px rgba(13,13,13,0.10)',
              }}
            >
              <Search size={15} className="shrink-0" style={{ color: 'var(--muted-foreground)' }} />
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t('spotlight.placeholder')}
                className="flex-1 bg-transparent text-[13px] outline-none"
                style={{ color: 'var(--foreground)', caretColor: '#FF7264' }}
              />
              {input && (
                <button
                  aria-label={t('spotlight.clearInput')}
                  onClick={() => { setInput(''); setParsed(null); inputRef.current?.focus() }}
                  className="shrink-0 transition-colors"
                  style={{ color: 'var(--muted-foreground)', fontSize: 12 }}
                >
                  ✕
                </button>
              )}
            </div>

            {/* Preview card */}
            <AnimatePresence>
              {parsed && (
                <motion.div
                  key="preview"
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.12 }}
                  className="mt-1.5 rounded-[14px] bg-card px-4 py-3.5"
                  style={{
                    border: '1px solid var(--border)',
                    boxShadow: '0 2px 8px rgba(13,13,13,0.05), 0 12px 40px rgba(13,13,13,0.08)',
                  }}
                >
                  <p className="text-[13px] font-semibold truncate" style={{ color: 'var(--foreground)' }}>{parsed.title}</p>
                  <p className="mt-0.5 text-[11.5px]" style={{ color: 'var(--muted-foreground)' }}>
                    {formatPreviewDate(parsed.start, parsed.end, t, locale)}
                  </p>
                  <div className="mt-3 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleConfirm}
                      className="flex-1 rounded-[9px] py-2 text-[12px] font-semibold text-primary-foreground transition-opacity hover:opacity-85"
                      style={{ background: 'var(--primary)' }}
                    >
                      {t('spotlight.addToCalendar')}
                    </button>
                    <button
                      type="button"
                      onClick={handleEdit}
                      className="rounded-[9px] px-4 py-2 text-[12px] font-medium transition-colors hover:bg-muted"
                      style={{ border: '1px solid var(--border)', color: 'var(--muted-foreground)' }}
                    >
                      {t('spotlight.edit')}
                    </button>
                  </div>
                  <p className="mt-2.5 text-center text-[10px]" style={{ color: 'var(--muted-foreground)' }}>
                    {t('spotlight.press')}{' '}
                    <kbd className="rounded px-1 py-px font-mono text-[9px]" style={{ background: 'var(--muted)', color: 'var(--muted-foreground)' }}>↵</kbd>
                    {' '}{t('spotlight.toConfirm')} ·{' '}
                    <kbd className="rounded px-1 py-px font-mono text-[9px]" style={{ background: 'var(--muted)', color: 'var(--muted-foreground)' }}>Esc</kbd>
                    {' '}{t('spotlight.toClose')}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
