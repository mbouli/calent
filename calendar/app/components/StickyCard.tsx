'use client'

import { useState, useRef } from 'react'
import { GripVertical, Trash2, Palette } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Sticky, EventColor } from '../types'
import { ColorPicker } from './ColorPicker'
import { useT } from '../lib/i18n/useT'

const COLOR_BG: Record<EventColor, string> = {
  indigo: 'bg-indigo-50 dark:bg-indigo-500/15', violet: 'bg-violet-50 dark:bg-violet-500/15', rose: 'bg-rose-50 dark:bg-rose-500/15',
  emerald: 'bg-emerald-50 dark:bg-emerald-500/15', amber: 'bg-amber-50 dark:bg-amber-500/15', sky: 'bg-sky-50 dark:bg-sky-500/15',
}
const COLOR_TITLE: Record<EventColor, string> = {
  indigo: 'text-indigo-800 dark:text-indigo-200', violet: 'text-violet-800 dark:text-violet-200', rose: 'text-rose-800 dark:text-rose-200',
  emerald: 'text-emerald-800 dark:text-emerald-200', amber: 'text-amber-800 dark:text-amber-200', sky: 'text-sky-800 dark:text-sky-200',
}
const COLOR_TEXT: Record<EventColor, string> = {
  indigo: 'text-indigo-700 dark:text-indigo-300', violet: 'text-violet-700 dark:text-violet-300', rose: 'text-rose-700 dark:text-rose-300',
  emerald: 'text-emerald-700 dark:text-emerald-300', amber: 'text-amber-700 dark:text-amber-300', sky: 'text-sky-700 dark:text-sky-300',
}
const COLOR_MUTED: Record<EventColor, string> = {
  indigo: 'text-indigo-400 dark:text-indigo-300/70', violet: 'text-violet-400 dark:text-violet-300/70', rose: 'text-rose-400 dark:text-rose-300/70',
  emerald: 'text-emerald-400 dark:text-emerald-300/70', amber: 'text-amber-400 dark:text-amber-300/70', sky: 'text-sky-400 dark:text-sky-300/70',
}
const COLOR_CHECK: Record<EventColor, string> = {
  indigo: 'border-indigo-300 dark:border-indigo-400/60', violet: 'border-violet-300 dark:border-violet-400/60', rose: 'border-rose-300 dark:border-rose-400/60',
  emerald: 'border-emerald-300 dark:border-emerald-400/60', amber: 'border-amber-300 dark:border-amber-400/60', sky: 'border-sky-300 dark:border-sky-400/60',
}
const COLOR_CHECK_DONE: Record<EventColor, string> = {
  indigo: 'bg-indigo-400 border-indigo-400', violet: 'bg-violet-400 border-violet-400',
  rose: 'bg-rose-400 border-rose-400', emerald: 'bg-emerald-400 border-emerald-400',
  amber: 'bg-amber-400 border-amber-400', sky: 'bg-sky-400 border-sky-400',
}
const COLOR_DROP: Record<EventColor, string> = {
  indigo: 'bg-indigo-400', violet: 'bg-violet-400', rose: 'bg-rose-400',
  emerald: 'bg-emerald-400', amber: 'bg-amber-400', sky: 'bg-sky-400',
}

interface StickyCardProps {
  sticky: Sticky
  onUpdateTitle: (title: string) => void
  onUpdateBody: (body: string) => void
  onToggleItem: (itemId: string) => void
  onUpdateItem: (itemId: string, text: string) => void
  onAddItem: (text: string) => void
  onClearDone: () => void
  onChangeColor: (color: EventColor) => void
  onDelete: () => void
  onReorderItems: (items: Sticky['items']) => void
  onDragStart: (e: React.DragEvent) => void
  onDragOver: (e: React.DragEvent) => void
  onDrop: (e: React.DragEvent) => void
  onDragEnd: () => void
}

export function StickyCard({
  sticky, onUpdateTitle, onUpdateBody, onToggleItem, onUpdateItem, onAddItem,
  onClearDone, onChangeColor, onDelete, onReorderItems, onDragStart, onDragOver, onDrop, onDragEnd,
}: StickyCardProps) {
  const { t } = useT()
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleVal, setTitleVal] = useState(sticky.title)
  const [editingBody, setEditingBody] = useState(false)
  const [bodyVal, setBodyVal] = useState(sticky.body ?? '')
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [editingItemText, setEditingItemText] = useState('')
  const [newItem, setNewItem] = useState('')
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [dragItemId, setDragItemId] = useState<string | null>(null)
  const [dropTargetId, setDropTargetId] = useState<string | null>(null)
  const [dropPosition, setDropPosition] = useState<'before' | 'after'>('before')

  // Ref updated synchronously — handleItemDrop never sees a stale value
  const dragItemIdRef = useRef<string | null>(null)

  const handleItemDrop = (targetId: string, position: 'before' | 'after') => {
    const dragging = dragItemIdRef.current
    dragItemIdRef.current = null
    setDropTargetId(null)
    setDragItemId(null)
    if (!dragging || dragging === targetId) return
    const list = [...sticky.items]
    const fromIdx = list.findIndex(it => it.id === dragging)
    const [moved] = list.splice(fromIdx, 1)
    const newTargetIdx = list.findIndex(it => it.id === targetId)
    list.splice(position === 'before' ? newTargetIdx : newTargetIdx + 1, 0, moved)
    onReorderItems(list)
  }

  const hasTodos = sticky.items.length > 0
  const hasDone = sticky.items.some(it => it.done)

  return (
    <div
      className={cn('rounded-xl p-3 pb-9 relative shadow-sm group cursor-default', COLOR_BG[sticky.color])}
      draggable
      onDragStart={onDragStart}
      onDragOver={e => { e.preventDefault(); onDragOver(e) }}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
    >
      {/* Hover actions — bottom bar */}
      <div className="absolute bottom-0 inset-x-0 px-2 py-1.5 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        {hasDone && (
          <button
            onClick={onClearDone}
            className={cn('text-[9px] font-medium px-1.5 py-0.5 rounded hover:opacity-70', COLOR_MUTED[sticky.color])}
          >
            {t('stickies.clearDone')}
          </button>
        )}

        <div className="relative ml-auto">
          <button
            onClick={() => setShowColorPicker(v => !v)}
            className={cn('w-6 h-6 rounded flex items-center justify-center hover:opacity-70', COLOR_MUTED[sticky.color])}
          >
            <Palette size={11} />
          </button>
          {showColorPicker && (
            <div
              className="absolute right-0 bottom-7 bg-card rounded-lg shadow-lg border border-border p-2 z-30"
              onMouseLeave={() => setShowColorPicker(false)}
            >
              <ColorPicker
                value={sticky.color}
                onChange={c => { onChangeColor(c); setShowColorPicker(false) }}
              />
            </div>
          )}
        </div>

        <button
          onClick={onDelete}
          className={cn('w-6 h-6 rounded flex items-center justify-center hover:opacity-70', COLOR_MUTED[sticky.color])}
        >
          <Trash2 size={11} />
        </button>
      </div>

      {/* Title */}
      {editingTitle ? (
        <input
          autoFocus
          value={titleVal}
          onChange={e => setTitleVal(e.target.value)}
          onBlur={() => { onUpdateTitle(titleVal); setEditingTitle(false) }}
          onKeyDown={e => { if (e.key === 'Enter') { onUpdateTitle(titleVal); setEditingTitle(false) } }}
          onDragStart={e => e.stopPropagation()}
          className={cn('text-base font-semibold bg-transparent outline-none w-full mb-2', COLOR_TITLE[sticky.color])}
        />
      ) : (
        <p
          className={cn('text-base font-semibold mb-2 cursor-text', COLOR_TITLE[sticky.color])}
          onClick={() => { setEditingTitle(true); setTitleVal(sticky.title) }}
        >
          {sticky.title || <span className="opacity-30 font-normal text-xs">{t('stickies.untitled')}</span>}
        </p>
      )}

      {/* Body */}
      {(!hasTodos || sticky.body) && (
        editingBody ? (
          <textarea
            autoFocus
            value={bodyVal}
            onChange={e => setBodyVal(e.target.value)}
            onBlur={() => { onUpdateBody(bodyVal); setEditingBody(false) }}
            onDragStart={e => e.stopPropagation()}
            className={cn('text-sm bg-transparent outline-none w-full resize-none leading-relaxed mb-2', COLOR_TEXT[sticky.color])}
            rows={3}
          />
        ) : (
          <p
            className={cn(
              'text-sm leading-relaxed cursor-text mb-2',
              COLOR_TEXT[sticky.color],
              !sticky.body && 'opacity-30'
            )}
            onClick={() => { setEditingBody(true); setBodyVal(sticky.body ?? '') }}
          >
            {sticky.body || (!hasTodos ? t('stickies.addNote') : '')}
          </p>
        )
      )}

      {/* Checklist items */}
      {hasTodos && (
        <div className="space-y-1.5 mb-2">
          {sticky.items.map(item => (
            <div
              key={item.id}
              draggable
              onDragStart={e => {
                e.stopPropagation()
                e.dataTransfer.effectAllowed = 'move'
                dragItemIdRef.current = item.id
                setDragItemId(item.id)
              }}
              onDragOver={e => {
                e.preventDefault(); e.stopPropagation()
                if (!dragItemIdRef.current) return
                const rect = e.currentTarget.getBoundingClientRect()
                setDropTargetId(item.id)
                setDropPosition(e.clientY < rect.top + rect.height / 2 ? 'before' : 'after')
              }}
              onDragLeave={e => {
                if (!e.currentTarget.contains(e.relatedTarget as Node)) setDropTargetId(null)
              }}
              onDrop={e => {
                e.stopPropagation()
                const rect = e.currentTarget.getBoundingClientRect()
                handleItemDrop(item.id, e.clientY < rect.top + rect.height / 2 ? 'before' : 'after')
              }}
              onDragEnd={e => {
                e.stopPropagation()
                dragItemIdRef.current = null
                setDragItemId(null)
                setDropTargetId(null)
              }}
              className={cn('relative group/item', dragItemId === item.id && 'opacity-40')}
            >
              {/* Drop indicator line */}
              {dropTargetId === item.id && dragItemId !== null && dragItemId !== item.id && (
                <div
                  className={cn(
                    'absolute left-3 right-0 h-0.5 rounded-full pointer-events-none',
                    COLOR_DROP[sticky.color],
                    dropPosition === 'before' ? '-top-[3px]' : '-bottom-[3px]'
                  )}
                />
              )}

              <div className="flex items-start gap-1.5">
                <GripVertical
                  size={10}
                  className={cn('shrink-0 mt-0.5 cursor-grab opacity-0 group-hover/item:opacity-30 transition-opacity', COLOR_MUTED[sticky.color])}
                />
                <button
                  onClick={() => onToggleItem(item.id)}
                  className={cn(
                    'w-3 h-3 rounded-[3px] border flex-shrink-0 mt-0.5 transition-colors',
                    item.done ? COLOR_CHECK_DONE[sticky.color] : COLOR_CHECK[sticky.color]
                  )}
                />
                {editingItemId === item.id ? (
                  <input
                    autoFocus
                    value={editingItemText}
                    onChange={e => setEditingItemText(e.target.value)}
                    onBlur={() => {
                      if (editingItemText.trim()) onUpdateItem(item.id, editingItemText.trim())
                      setEditingItemId(null)
                    }}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        if (editingItemText.trim()) onUpdateItem(item.id, editingItemText.trim())
                        setEditingItemId(null)
                      }
                      if (e.key === 'Escape') setEditingItemId(null)
                    }}
                    onDragStart={e => e.stopPropagation()}
                    className={cn(
                      'text-sm bg-transparent outline-none flex-1',
                      COLOR_TEXT[sticky.color],
                      item.done && 'line-through opacity-40'
                    )}
                  />
                ) : (
                  <span
                    className={cn(
                      'text-sm leading-tight cursor-text flex-1',
                      COLOR_TEXT[sticky.color],
                      item.done && 'line-through opacity-40'
                    )}
                    onClick={() => { setEditingItemId(item.id); setEditingItemText(item.text) }}
                  >
                    {item.text}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add item input */}
      <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className={cn('w-3 h-3 rounded-[3px] border flex-shrink-0 opacity-30', COLOR_CHECK[sticky.color])} />
        <input
          value={newItem}
          onChange={e => setNewItem(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && newItem.trim()) {
              onAddItem(newItem.trim())
              setNewItem('')
            }
          }}
          onDragStart={e => e.stopPropagation()}
          placeholder={hasTodos ? t('stickies.addItem') : t('stickies.addChecklistItem')}
          className={cn(
            'text-sm bg-transparent outline-none flex-1 placeholder:opacity-40',
            COLOR_TEXT[sticky.color]
          )}
        />
      </div>
    </div>
  )
}
