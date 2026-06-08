# Spotlight Command Bar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Raycast-style cmd+K command bar that lets users type natural language ("gym tomorrow 6pm") and instantly creates a calendar event after a quick preview-confirm step.

**Architecture:** A single `SpotlightBar` component handles the full flow — overlay backdrop, text input, and floating preview card. A thin `parseEvent` utility wraps chrono-node to extract title + start/end from free text. The bar mounts in `app/u/page.tsx` alongside the existing modals; it receives `createEvent` and `openEdit` so it can either confirm directly or hand off to the full EventModal.

**Tech Stack:** chrono-node (NLP date parsing), framer-motion (existing, for enter/exit animations), Tailwind CSS, TypeScript

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `app/lib/parseEvent.ts` | **Create** | Wraps chrono-node; returns `{ title, start, end }` or `null` |
| `app/components/SpotlightBar.tsx` | **Create** | Full spotlight UI: backdrop, input, preview card |
| `app/u/page.tsx` | **Modify** | cmd+K listener, spotlight open state, render `<SpotlightBar>` |
| `package.json` | **Modify** | Add `chrono-node` dependency |

---

### Task 1: Install chrono-node

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install the package**

```bash
cd /Users/mason/Documents/startup/caly && npm install chrono-node
```

Expected output: `added N packages` with no errors.

- [ ] **Step 2: Verify types are available**

```bash
ls node_modules/chrono-node/dist
```

Expected: directory exists with `.d.ts` files (chrono-node ships its own types).

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add chrono-node for NLP date parsing"
```

---

### Task 2: Create the event parser utility

**Files:**
- Create: `app/lib/parseEvent.ts`

- [ ] **Step 1: Write `parseEvent.ts`**

```typescript
import * as chrono from 'chrono-node'

export interface ParsedEvent {
  title: string
  start: Date
  end: Date
}

/**
 * Parse free-text input into a calendar event.
 * Returns null if no date/time could be detected.
 * Title is the input text with the recognised date fragment stripped out.
 */
export function parseEvent(text: string, referenceDate = new Date()): ParsedEvent | null {
  const trimmed = text.trim()
  if (!trimmed) return null

  const results = chrono.parse(trimmed, referenceDate, { forwardDate: true })
  if (!results.length) return null

  const hit = results[0]
  const start = hit.start.date()
  const end = hit.end
    ? hit.end.date()
    : new Date(start.getTime() + 60 * 60 * 1000) // default 1 hour

  // Build title from the text surrounding the parsed date fragment
  const before = trimmed.slice(0, hit.index).trim()
  const after = trimmed.slice(hit.index + hit.text.length).trim()
  const title = [before, after].filter(Boolean).join(' ').trim() || trimmed

  // Capitalise first letter
  const capitalisedTitle = title.charAt(0).toUpperCase() + title.slice(1)

  return { title: capitalisedTitle, start, end }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/mason/Documents/startup/caly && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors referencing `parseEvent.ts`.

- [ ] **Step 3: Quick smoke test in browser console (after dev server is up)**

Open `http://localhost:3000` in the browser. In the console, run:
```js
// Can't import directly, but verify no TS errors above
```
TypeScript passing is sufficient for this step.

- [ ] **Step 4: Commit**

```bash
git add app/lib/parseEvent.ts
git commit -m "feat: add chrono-node parseEvent utility"
```

---

### Task 3: Build the SpotlightBar component

**Files:**
- Create: `app/components/SpotlightBar.tsx`

The component manages its own local state: `input` string and `parsed` preview. The parent controls `open`/`onClose`. On confirm, it calls `onConfirm` with the parsed event data. On "Edit", it calls `onEdit` so the full EventModal opens pre-filled.

- [ ] **Step 1: Create `SpotlightBar.tsx`**

```tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Search } from 'lucide-react'
import { parseEvent, ParsedEvent } from '../lib/parseEvent'
import { CalendarEvent, EventColor } from '../types'
import { formatTime } from '../lib/dateUtils'

interface SpotlightBarProps {
  open: boolean
  onClose: () => void
  onConfirm: (data: Omit<CalendarEvent, 'id'>) => void
  onEdit: (prefill: { title: string; start: Date; end: Date }) => void
}

function formatPreviewDate(start: Date, end: Date): string {
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)

  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()

  let dayLabel: string
  if (isSameDay(start, today)) dayLabel = 'Today'
  else if (isSameDay(start, tomorrow)) dayLabel = 'Tomorrow'
  else dayLabel = start.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })

  return `${dayLabel} · ${formatTime(start)}–${formatTime(end)}`
}

export function SpotlightBar({ open, onClose, onConfirm, onEdit }: SpotlightBarProps) {
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
    onConfirm({
      title: parsed.title,
      start: parsed.start,
      end: parsed.end,
      color: 'indigo' as EventColor,
    })
    onClose()
  }

  const handleEdit = () => {
    if (!parsed) return
    onEdit({ title: parsed.title, start: parsed.start, end: parsed.end })
    onClose()
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            className="fixed inset-0 z-50 bg-black/20 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
          />

          {/* Command bar */}
          <motion.div
            key="bar"
            className="fixed left-1/2 top-[28%] z-50 w-full max-w-[520px] -translate-x-1/2 px-4"
            initial={{ opacity: 0, y: -12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
          >
            {/* Input pill */}
            <div className="flex items-center gap-3 rounded-xl bg-white shadow-2xl ring-1 ring-black/8 px-4 py-3.5">
              <Search size={16} className="shrink-0 text-gray-400" />
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="gym tomorrow 6pm · dinner friday at 7 · meeting in 30 min…"
                className="flex-1 bg-transparent text-sm text-gray-900 placeholder:text-gray-400 outline-none"
              />
              {input && (
                <button
                  onClick={() => { setInput(''); setParsed(null); inputRef.current?.focus() }}
                  className="shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
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
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.14 }}
                  className="mt-2 rounded-xl bg-white shadow-xl ring-1 ring-black/8 px-4 py-3.5"
                >
                  <p className="text-sm font-semibold text-gray-900 truncate">{parsed.title}</p>
                  <p className="mt-0.5 text-xs text-gray-500">
                    {formatPreviewDate(parsed.start, parsed.end)}
                  </p>
                  <div className="mt-3 flex items-center gap-2">
                    <button
                      onClick={handleConfirm}
                      className="flex-1 rounded-lg bg-gray-900 py-1.5 text-xs font-medium text-white hover:bg-gray-700 transition-colors"
                    >
                      Add to calendar
                    </button>
                    <button
                      onClick={handleEdit}
                      className="rounded-lg border border-border px-4 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                      Edit
                    </button>
                  </div>
                  <p className="mt-2 text-center text-[10px] text-gray-400">
                    Press <kbd className="rounded bg-gray-100 px-1 py-0.5 font-mono text-[9px]">↵</kbd> to confirm · <kbd className="rounded bg-gray-100 px-1 py-0.5 font-mono text-[9px]">Esc</kbd> to close
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
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd /Users/mason/Documents/startup/caly && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors referencing `SpotlightBar.tsx`.

- [ ] **Step 3: Commit**

```bash
git add app/components/SpotlightBar.tsx
git commit -m "feat: add SpotlightBar component with preview card"
```

---

### Task 4: Wire SpotlightBar into the app

**Files:**
- Modify: `app/u/page.tsx`

- [ ] **Step 1: Add import at the top of `app/u/page.tsx`**

Add this line with the other component imports (after line 17, alongside EventModal):

```typescript
import { SpotlightBar } from '../components/SpotlightBar'
```

- [ ] **Step 2: Add spotlight state inside `HomePage` (after the existing `useState` declarations, around line 92)**

```typescript
const [spotlightOpen, setSpotlightOpen] = useState(false)
```

- [ ] **Step 3: Add the cmd+K keyboard listener (after the mobile view effect, around line 98)**

```typescript
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
```

- [ ] **Step 4: Add `handleSpotlightEdit` handler (after `handleDelete`, around line 143)**

```typescript
const handleSpotlightEdit = (prefill: { title: string; start: Date; end: Date }) => {
  setModal({ open: true, defaultStart: prefill.start, defaultEnd: prefill.end })
}
```

- [ ] **Step 5: Render `<SpotlightBar>` in the JSX (add just before the closing `</div>` of the root element, after `<EventModal>`)**

```tsx
<SpotlightBar
  open={spotlightOpen}
  onClose={() => setSpotlightOpen(false)}
  onConfirm={(data) => createEvent(data)}
  onEdit={handleSpotlightEdit}
/>
```

- [ ] **Step 6: Verify TypeScript**

```bash
cd /Users/mason/Documents/startup/caly && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add app/u/page.tsx
git commit -m "feat: wire SpotlightBar into calendar with cmd+K shortcut"
```

---

### Task 5: Manual verification

**Files:** none (browser testing)

- [ ] **Step 1: Start dev server**

```bash
cd /Users/mason/Documents/startup/caly && npm run dev
```

Open `http://localhost:3000/u`

- [ ] **Step 2: Verify cmd+K opens the bar**

Press `Cmd+K` (Mac) or `Ctrl+K` (Windows/Linux). The spotlight overlay should appear at ~28% from the top, centered, with a subtle backdrop blur.

- [ ] **Step 3: Verify parsing works**

Type: `lunch tomorrow 12pm`

Expected: preview card appears below the input with title "Lunch" and "Tomorrow · 12:00 PM–1:00 PM"

- [ ] **Step 4: Verify confirm creates the event**

Press `Enter` or click "Add to calendar". The spotlight closes, and the event appears in the calendar on tomorrow's date.

- [ ] **Step 5: Verify Edit opens the EventModal**

Open spotlight again, type `team standup friday 9am`, click "Edit". Spotlight closes and the EventModal opens with the title and time pre-filled.

- [ ] **Step 6: Verify Escape closes**

Open spotlight, press `Esc`. Bar closes, nothing created.

- [ ] **Step 7: Verify backdrop click closes**

Open spotlight, click the blurred backdrop area. Bar closes.

- [ ] **Step 8: Verify no-date input shows no preview**

Type `hello world` (no date). No preview card should appear.

- [ ] **Step 9: Commit if any tweaks were made**

```bash
git add -p
git commit -m "fix: spotlight polish from manual testing"
```

---

## Self-Review Checklist

**Spec coverage:**
- [x] cmd+K opens the bar — Task 4
- [x] chrono-node parsing — Task 2
- [x] Preview card with title + time — Task 3
- [x] Confirm creates event immediately — Task 4 (`onConfirm → createEvent`)
- [x] Edit opens full EventModal — Task 4 (`handleSpotlightEdit`)
- [x] Escape closes — Task 3 (`handleKeyDown`)
- [x] Backdrop click closes — Task 3 (backdrop `onClick`)
- [x] Option A floating command pill visual — Task 3 (centered, top-28%, pill shape)
- [x] No LLM for MVP — parsing is chrono-node only

**Not in MVP (per spec's "Advanced polish" section):**
- Ghost event preview in calendar while typing
- Smart autocomplete suggestions
- Cmd+Z undo
- Cmd+E edit last event
