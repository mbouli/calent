'use client'

import { useState, useEffect, useRef } from 'react'
import { Plus } from 'lucide-react'
import { motion, LayoutGroup } from 'motion/react'
import { cn } from '@/lib/utils'
import { Sticky, StickyItem, EventColor } from '../types'
import { StickyCard } from './StickyCard'
import { useT } from '../lib/i18n/useT'

const COLORS: EventColor[] = ['indigo', 'violet', 'rose', 'emerald', 'amber', 'sky']

function randomColor(): EventColor {
  return COLORS[Math.floor(Math.random() * COLORS.length)]
}

// Each grid row is ROW px tall. Card span = ceil((height + GAP) / ROW).
// The extra rows act as the visual gap between cards in the same column.
const ROW = 4
const GAP = 12

interface StickysPanelProps {
  stickies: Sticky[]
  onCreateSticky: (color: EventColor) => void
  onUpdateSticky: (id: string, updates: Partial<Omit<Sticky, 'id'>>) => void
  onDeleteSticky: (id: string) => void
  onReorderStickies: (ordered: Sticky[]) => void
  onAddItem: (stickyId: string, text: string) => void
  onToggleItem: (stickyId: string, itemId: string) => void
  onUpdateItem: (stickyId: string, itemId: string, text: string) => void
  onClearDoneItems: (stickyId: string) => void
  onReorderItems: (stickyId: string, items: StickyItem[]) => void
}

export function StickiesPanel({
  stickies,
  onCreateSticky,
  onUpdateSticky,
  onDeleteSticky,
  onReorderStickies,
  onAddItem,
  onToggleItem,
  onUpdateItem,
  onClearDoneItems,
  onReorderItems,
}: StickysPanelProps) {
  const { t } = useT()
  const [localStickies, setLocalStickies] = useState<Sticky[]>(stickies)
  const [dragId, setDragId] = useState<string | null>(null)
  const [numCols, setNumCols] = useState(4)
  const [spans, setSpans] = useState<Record<string, number>>({})

  const dragIdRef = useRef<string | null>(null)
  const dragOrderRef = useRef<Sticky[]>(stickies)
  const lastOverId = useRef<string | null>(null)
  const roRef = useRef<ResizeObserver | null>(null)
  const observedEls = useRef<Map<string, Element>>(new Map())

  useEffect(() => {
    const check = () => setNumCols(window.innerWidth < 768 ? 2 : 4)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    if (!dragId) {
      setLocalStickies(stickies)
      dragOrderRef.current = stickies
    }
  }, [stickies, dragId])

  // ResizeObserver: keeps row spans up to date as card content changes
  useEffect(() => {
    const ro = new ResizeObserver(entries => {
      setSpans(prev => {
        const next = { ...prev }
        let changed = false
        for (const e of entries) {
          const id = (e.target as HTMLElement).dataset.stickyId
          if (!id) continue
          const s = Math.ceil((e.contentRect.height + GAP) / ROW)
          if (next[id] !== s) { next[id] = s; changed = true }
        }
        return changed ? next : prev
      })
    })
    roRef.current = ro
    return () => ro.disconnect()
  }, [])

  const makeRef = (id: string) => (el: HTMLDivElement | null) => {
    const old = observedEls.current.get(id)
    if (old) { roRef.current?.unobserve(old); observedEls.current.delete(id) }
    if (el) {
      el.dataset.stickyId = id
      roRef.current?.observe(el)
      observedEls.current.set(id, el)
    }
  }

  const handleDragStart = (e: React.DragEvent, id: string) => {
    dragIdRef.current = id
    dragOrderRef.current = localStickies
    setDragId(id)
    lastOverId.current = null
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = 'move'
    if (!dragIdRef.current || dragIdRef.current === targetId || lastOverId.current === targetId) return
    lastOverId.current = targetId

    const list = [...dragOrderRef.current]
    const fromIdx = list.findIndex(s => s.id === dragIdRef.current)
    const toIdx = list.findIndex(s => s.id === targetId)
    if (fromIdx === toIdx) return
    const [moved] = list.splice(fromIdx, 1)
    list.splice(toIdx, 0, moved)
    dragOrderRef.current = list
    setLocalStickies(list)
  }

  const handleDragEnd = () => {
    if (!dragIdRef.current) return
    onReorderStickies(dragOrderRef.current)
    dragIdRef.current = null
    lastOverId.current = null
    setDragId(null)
  }

  const defaultSpan = Math.ceil((200 + GAP) / ROW)

  return (
    <>
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/30 bg-background shrink-0">
        <span className="text-xs font-medium text-muted-foreground">{t('stickies.title')}</span>
        <button
          onClick={() => onCreateSticky(randomColor())}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Plus size={11} />
          {t('common.new')}
        </button>
      </div>

      <div
        className="flex-1 overflow-y-auto p-3"
        onDragOver={e => e.preventDefault()}
        onDrop={e => e.preventDefault()}
        onDragEnd={handleDragEnd}
      >
        {localStickies.length === 0 ? (
          <button
            onClick={() => onCreateSticky(randomColor())}
            className={cn(
              'w-full rounded-xl border-2 border-dashed border-border/40 min-h-20',
              'flex flex-col items-center justify-center gap-1.5',
              'text-muted-foreground/40 hover:text-muted-foreground/60 hover:border-border/60',
              'transition-colors'
            )}
          >
            <Plus size={16} />
            <span className="text-xs font-medium">{t('stickies.newSticky')}</span>
          </button>
        ) : (
          <LayoutGroup>
            <div
              className="grid"
              style={{
                gridTemplateColumns: `repeat(${numCols}, 1fr)`,
                gridAutoRows: `${ROW}px`,
                columnGap: '12px',
              }}
            >
              {localStickies.map((sticky, i) => (
                <motion.div
                  key={sticky.id}
                  layout
                  ref={makeRef(sticky.id)}
                  transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
                  className={dragId === sticky.id ? 'opacity-40' : ''}
                  style={{
                    gridColumn: (i % numCols) + 1,
                    gridRowEnd: `span ${spans[sticky.id] ?? defaultSpan}`,
                    alignSelf: 'start',
                  }}
                >
                  <StickyCard
                    sticky={sticky}
                    onUpdateTitle={title => onUpdateSticky(sticky.id, { title })}
                    onUpdateBody={body => onUpdateSticky(sticky.id, { body })}
                    onToggleItem={itemId => onToggleItem(sticky.id, itemId)}
                    onUpdateItem={(itemId, text) => onUpdateItem(sticky.id, itemId, text)}
                    onAddItem={text => onAddItem(sticky.id, text)}
                    onClearDone={() => onClearDoneItems(sticky.id)}
                    onReorderItems={items => onReorderItems(sticky.id, items)}
                    onChangeColor={color => onUpdateSticky(sticky.id, { color })}
                    onDelete={() => onDeleteSticky(sticky.id)}
                    onDragStart={e => handleDragStart(e, sticky.id)}
                    onDragOver={e => handleDragOver(e, sticky.id)}
                    onDrop={e => e.preventDefault()}
                    onDragEnd={handleDragEnd}
                  />
                </motion.div>
              ))}
            </div>
          </LayoutGroup>
        )}
      </div>
    </>
  )
}
