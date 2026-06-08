import { describe, it, expect } from 'vitest'
import { toZoned, fromZoned } from './dateUtils'

describe('toZoned', () => {
  it('renders a UTC instant as its wall-clock in the target zone', () => {
    // 2026-06-02T22:00:00Z → 18:00 in New York (EDT, UTC-4)
    const z = toZoned(new Date('2026-06-02T22:00:00Z'), 'America/New_York')
    expect(z.getFullYear()).toBe(2026)
    expect(z.getMonth()).toBe(5) // June
    expect(z.getDate()).toBe(2)
    expect(z.getHours()).toBe(18)
    expect(z.getMinutes()).toBe(0)
  })

  it('can cross a day boundary', () => {
    // 2026-06-02T02:00:00Z → 2026-06-01 19:00 in Los Angeles (PDT, UTC-7)
    const z = toZoned(new Date('2026-06-02T02:00:00Z'), 'America/Los_Angeles')
    expect(z.getDate()).toBe(1)
    expect(z.getHours()).toBe(19)
  })
})

describe('fromZoned', () => {
  it('is the inverse of toZoned', () => {
    const tzs = ['America/New_York', 'America/Los_Angeles', 'Europe/Madrid', 'Asia/Tokyo', 'UTC']
    const instant = new Date('2026-06-02T15:30:00Z')
    for (const tz of tzs) {
      const round = fromZoned(toZoned(instant, tz), tz)
      expect(Math.abs(round.getTime() - instant.getTime())).toBeLessThan(1000)
    }
  })

  it('turns a target-zone wall-clock into the correct absolute instant', () => {
    // 9:00am wall-clock in Tokyo (JST, UTC+9) on 2026-06-02 == 2026-06-02T00:00:00Z
    const local = new Date(2026, 5, 2, 9, 0, 0) // local fields = the Tokyo wall-clock
    const instant = fromZoned(local, 'Asia/Tokyo')
    expect(instant.toISOString()).toBe('2026-06-02T00:00:00.000Z')
  })
})
