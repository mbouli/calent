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
