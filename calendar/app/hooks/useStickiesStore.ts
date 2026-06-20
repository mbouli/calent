'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Sticky, EventColor } from '../types'
import { createClient } from '../lib/supabase/client'
import { rowToSticky, rowToStickyItem, StickyRow, StickyItemRow } from '../lib/db-types'

function makeId() { return crypto.randomUUID() }

export function useStickiesStore() {
  const [stickies, setStickies] = useState<Sticky[]>([])
  // Mirror of `stickies` so action callbacks can read current state without
  // performing side effects inside a state updater (which React runs twice in
  // dev Strict Mode, causing duplicate inserts — pkey violations).
  const stickiesRef = useRef<Sticky[]>([])
  useEffect(() => { stickiesRef.current = stickies }, [stickies])

  useEffect(() => {
    const supabase = createClient()
    async function load() {
      const [{ data: sRows }, { data: iRows }] = await Promise.all([
        supabase.from('stickies').select('id, title, color, body, position'),
        supabase.from('sticky_items').select('id, sticky_id, text, done, position').order('position', { ascending: true }),
      ])
      if (!sRows) return
      const items = (iRows ?? []) as StickyItemRow[]
      setStickies(
        (sRows as StickyRow[]).map(s =>
          rowToSticky(
            s,
            items.filter(i => i.sticky_id === s.id).map(rowToStickyItem)
          )
        )
      )
    }
    load()
  }, [])

  const createSticky = useCallback((color: EventColor) => {
    const id = makeId()
    const position = stickiesRef.current.length
    const s: Sticky = { id, title: '', color, items: [], body: undefined, order: position }
    const supabase = createClient()
    supabase.from('stickies').insert({ id, color, position })
      .then(({ error }) => { if (error) console.error('createSticky failed', error) })
    setStickies(prev => [...prev, s])
  }, [])

  const updateSticky = useCallback((id: string, updates: Partial<Omit<Sticky, 'id'>>) => {
    setStickies(prev => prev.map(s => (s.id === id ? { ...s, ...updates } : s)))
    const supabase = createClient()
    const row: Record<string, unknown> = {}
    if (updates.title !== undefined) row.title = updates.title
    if (updates.color !== undefined) row.color = updates.color
    if ('body' in updates) row.body = updates.body ?? null
    if (updates.order !== undefined) row.position = updates.order
    if (Object.keys(row).length) {
      supabase.from('stickies').update(row).eq('id', id)
        .then(({ error }) => { if (error) console.error('updateSticky failed', error) })
    }
  }, [])

  const deleteSticky = useCallback((id: string) => {
    setStickies(prev => prev.filter(s => s.id !== id))
    const supabase = createClient()
    supabase.from('stickies').delete().eq('id', id)
      .then(({ error }) => { if (error) console.error('deleteSticky failed', error) })
  }, [])

  const reorderStickies = useCallback((ordered: Sticky[]) => {
    const next = ordered.map((s, i) => ({ ...s, order: i }))
    setStickies(next)
    const supabase = createClient()
    next.forEach((s, i) => {
      supabase.from('stickies').update({ position: i }).eq('id', s.id)
        .then(({ error }) => { if (error) console.error('reorderStickies failed', error) })
    })
  }, [])

  const addItem = useCallback((stickyId: string, text: string) => {
    const sticky = stickiesRef.current.find(s => s.id === stickyId)
    if (!sticky) return
    const itemId = makeId()
    const supabase = createClient()
    supabase.from('sticky_items').insert({ id: itemId, sticky_id: stickyId, text, position: sticky.items.length })
      .then(({ error }) => { if (error) console.error('addItem failed', error) })
    setStickies(prev => prev.map(s =>
      s.id === stickyId ? { ...s, items: [...s.items, { id: itemId, text, done: false }] } : s
    ))
  }, [])

  const toggleItem = useCallback((stickyId: string, itemId: string) => {
    setStickies(prev => prev.map(s => {
      if (s.id !== stickyId) return s
      const item = s.items.find(it => it.id === itemId)
      if (item) {
        const supabase = createClient()
        supabase.from('sticky_items').update({ done: !item.done }).eq('id', itemId)
          .then(({ error }) => { if (error) console.error('toggleItem failed', error) })
      }
      return { ...s, items: s.items.map(it => it.id === itemId ? { ...it, done: !it.done } : it) }
    }))
  }, [])

  const updateItem = useCallback((stickyId: string, itemId: string, text: string) => {
    setStickies(prev => prev.map(s =>
      s.id === stickyId
        ? { ...s, items: s.items.map(it => it.id === itemId ? { ...it, text } : it) }
        : s
    ))
    const supabase = createClient()
    supabase.from('sticky_items').update({ text }).eq('id', itemId)
      .then(({ error }) => { if (error) console.error('updateItem failed', error) })
  }, [])

  const clearDoneItems = useCallback((stickyId: string) => {
    setStickies(prev => prev.map(s =>
      s.id === stickyId ? { ...s, items: s.items.filter(it => !it.done) } : s
    ))
    const supabase = createClient()
    supabase.from('sticky_items').delete().eq('sticky_id', stickyId).eq('done', true)
      .then(({ error }) => { if (error) console.error('clearDoneItems failed', error) })
  }, [])

  const reorderItems = useCallback((stickyId: string, ordered: Sticky['items']) => {
    setStickies(prev => prev.map(s => s.id === stickyId ? { ...s, items: ordered } : s))
    const supabase = createClient()
    ordered.forEach((it, i) => {
      supabase.from('sticky_items').update({ position: i }).eq('id', it.id)
        .then(({ error }) => { if (error) console.error('reorderItems failed', error) })
    })
  }, [])

  return {
    stickies: [...stickies].sort((a, b) => a.order - b.order),
    createSticky,
    updateSticky,
    deleteSticky,
    reorderStickies,
    addItem,
    toggleItem,
    updateItem,
    clearDoneItems,
    reorderItems,
  }
}
