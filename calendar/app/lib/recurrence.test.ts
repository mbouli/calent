import { describe, it, expect } from 'vitest'
import { generateCustomOccurrences, summarizeRecurrenceRule, buildTopUpEvents } from './recurrence'
import { translate } from './i18n'

// English translator + locale so the expected strings stay stable in tests.
const t = (key: string, params?: Record<string, string | number>) => translate('en', key, params)
import type { CalendarEvent, RecurrenceRule } from '../types'

// 2026-06-01 is a Monday.
const at = (iso: string) => new Date(iso)

describe('generateCustomOccurrences', () => {
  it('includes the anchor as occurrence #1 and repeats weekly on one day', () => {
    const anchor = at('2026-06-03T10:00:00') // Wed
    const rule: RecurrenceRule = { daysOfWeek: [3], intervalWeeks: 1, endDate: null, anchorDate: '2026-06-03' }
    const out = generateCustomOccurrences({ anchor, rule, until: at('2026-06-30T23:59:59') })
    expect(out.map(d => d.toISOString().slice(0, 10))).toEqual([
      '2026-06-03', '2026-06-10', '2026-06-17', '2026-06-24',
    ])
  })

  it('preserves the anchor time-of-day on every occurrence', () => {
    const anchor = at('2026-06-03T10:30:00')
    const rule: RecurrenceRule = { daysOfWeek: [3], intervalWeeks: 1, endDate: null, anchorDate: '2026-06-03' }
    const out = generateCustomOccurrences({ anchor, rule, until: at('2026-06-17T23:59:59') })
    expect(out.every(d => d.getHours() === 10 && d.getMinutes() === 30)).toBe(true)
  })

  it('emits every selected weekday within a week, in date order', () => {
    const anchor = at('2026-06-01T09:00:00') // Mon
    const rule: RecurrenceRule = { daysOfWeek: [1, 3, 5], intervalWeeks: 1, endDate: null, anchorDate: '2026-06-01' }
    const out = generateCustomOccurrences({ anchor, rule, until: at('2026-06-12T23:59:59') })
    expect(out.map(d => d.toISOString().slice(0, 10))).toEqual([
      '2026-06-01', '2026-06-03', '2026-06-05', '2026-06-08', '2026-06-10', '2026-06-12',
    ])
  })

  it('respects the every-N-weeks interval', () => {
    const anchor = at('2026-06-01T09:00:00') // Mon
    const rule: RecurrenceRule = { daysOfWeek: [1], intervalWeeks: 2, endDate: null, anchorDate: '2026-06-01' }
    const out = generateCustomOccurrences({ anchor, rule, until: at('2026-07-15T23:59:59') })
    expect(out.map(d => d.toISOString().slice(0, 10))).toEqual([
      '2026-06-01', '2026-06-15', '2026-06-29', '2026-07-13',
    ])
  })

  it('stops on the end date (inclusive of that calendar day)', () => {
    const anchor = at('2026-06-01T09:00:00')
    const rule: RecurrenceRule = { daysOfWeek: [1], intervalWeeks: 1, endDate: '2026-06-15', anchorDate: '2026-06-01' }
    const out = generateCustomOccurrences({ anchor, rule, until: at('2026-12-31T23:59:59') })
    expect(out.map(d => d.toISOString().slice(0, 10))).toEqual([
      '2026-06-01', '2026-06-08', '2026-06-15',
    ])
  })

  it('with `after` set, excludes the anchor and anything <= after (top-up mode)', () => {
    const anchor = at('2026-06-01T09:00:00')
    const rule: RecurrenceRule = { daysOfWeek: [1], intervalWeeks: 1, endDate: null, anchorDate: '2026-06-01' }
    const out = generateCustomOccurrences({ anchor, rule, until: at('2026-06-29T23:59:59'), after: at('2026-06-08T09:00:00') })
    expect(out.map(d => d.toISOString().slice(0, 10))).toEqual([
      '2026-06-15', '2026-06-22', '2026-06-29',
    ])
  })
})

describe('summarizeRecurrenceRule', () => {
  it('summarizes weekly (interval 1)', () => {
    expect(summarizeRecurrenceRule({ daysOfWeek: [1], intervalWeeks: 1, endDate: null, anchorDate: '2026-06-01' }, t, 'en-US'))
      .toBe('Weekly on Mon')
  })
  it('summarizes every-N-weeks with multiple days in Monday-first order', () => {
    expect(summarizeRecurrenceRule({ daysOfWeek: [3, 1], intervalWeeks: 2, endDate: null, anchorDate: '2026-06-01' }, t, 'en-US'))
      .toBe('Every 2 weeks on Mon, Wed')
  })
})

describe('buildTopUpEvents', () => {
  const baseEvent = (start: string, groupId: string, rule: RecurrenceRule): CalendarEvent => ({
    id: crypto.randomUUID(),
    title: 'Standup',
    start: at(start),
    end: new Date(at(start).getTime() + 30 * 60 * 1000),
    color: 'indigo',
    recurrence: 'custom',
    recurrenceGroupId: groupId,
    recurrenceRule: rule,
  })

  it('extends an open-ended series whose last occurrence is within the buffer of the viewed date', () => {
    const rule: RecurrenceRule = { daysOfWeek: [1], intervalWeeks: 1, endDate: null, anchorDate: '2026-06-01' }
    const events = [baseEvent('2026-06-01T09:00:00', 'g1', rule), baseEvent('2026-06-08T09:00:00', 'g1', rule)]
    const out = buildTopUpEvents(events, at('2026-06-08T00:00:00'), { bufferWeeks: 8, aheadWeeks: 4 })
    expect(out.length).toBeGreaterThan(0)
    expect(out.every(e => e.start > at('2026-06-08T09:00:00'))).toBe(true)
    expect(out.every(e => e.recurrenceGroupId === 'g1')).toBe(true)
  })

  it('does not extend a series ending before the buffer window', () => {
    const rule: RecurrenceRule = { daysOfWeek: [1], intervalWeeks: 1, endDate: null, anchorDate: '2026-06-01' }
    const events = [baseEvent('2026-06-01T09:00:00', 'g1', rule)]
    const out = buildTopUpEvents(events, at('2026-01-01T00:00:00'), { bufferWeeks: 8, aheadWeeks: 4 })
    expect(out).toEqual([])
  })

  it('ignores non-custom and closed-ended series', () => {
    const closed: RecurrenceRule = { daysOfWeek: [1], intervalWeeks: 1, endDate: '2026-06-08', anchorDate: '2026-06-01' }
    const events = [baseEvent('2026-06-08T09:00:00', 'g2', closed)]
    const out = buildTopUpEvents(events, at('2026-06-08T00:00:00'), { bufferWeeks: 8, aheadWeeks: 4 })
    expect(out).toEqual([])
  })
})
