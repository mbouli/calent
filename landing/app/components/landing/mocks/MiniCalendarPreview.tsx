import Image from 'next/image'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { C } from '../theme'

// Miniature week-view calendar shown in the hero.

const HERO_HOUR_H = 40
const HERO_START_H = 8
const HERO_HOURS = Array.from({ length: 11 }, (_, i) => HERO_START_H + i)
const HERO_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']

const HERO_EVENTS = [
  { day: 0, start: 9, end: 10, title: 'Calculus', color: C.salmon },
  { day: 0, start: 14, end: 16, title: 'Study group', color: C.mint },
  { day: 1, start: 10, end: 11.5, title: 'Office hours', color: C.lavender },
  { day: 2, start: 13, end: 14, title: 'Lunch', color: C.butter },
  { day: 3, start: 9, end: 12, title: 'Project work', color: C.mint },
  { day: 4, start: 15, end: 16, title: 'Review', color: C.salmon },
]

function getMondayOfWeek(d: Date) {
  const copy = new Date(d)
  const day = copy.getDay()
  copy.setDate(copy.getDate() - day + (day === 0 ? -6 : 1))
  return copy
}

export function MiniCalendarPreview() {
  const today = new Date()
  const monday = getMondayOfWeek(new Date())
  const weekDates = HERO_DAYS.map((_, i) => { const d = new Date(monday); d.setDate(monday.getDate() + i); return d.getDate() })
  const todayIdx = (() => { const d = today.getDay(); return d === 0 ? -1 : d - 1 })()
  const month = today.toLocaleString('default', { month: 'long', year: 'numeric' })

  return (
    <div className="w-full rounded-2xl overflow-hidden select-none"
      style={{ background: '#fff', border: `1px solid ${C.ink}12`, boxShadow: `0 16px 60px rgba(13,13,13,0.10), 0 2px 8px rgba(13,13,13,0.04)`, fontFamily: 'var(--font-geist)' }}>

      <div className="flex items-center justify-between px-3 h-10" style={{ borderBottom: `1px solid ${C.ink}0e` }}>
        <Image src="/calent_wordmark_black.png" alt="Calent" width={36} height={24} className="object-contain opacity-80" />
        <div className="flex items-center gap-1">
          <ChevronLeft size={12} color="#bbb" />
          <span style={{ fontSize: 10, color: '#888', fontWeight: 500 }}>{month}</span>
          <ChevronRight size={12} color="#bbb" />
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: '36px repeat(5, 1fr)', borderBottom: `1px solid ${C.ink}0a` }}>
        <div />
        {HERO_DAYS.map((label, i) => {
          const isToday = i === todayIdx
          return (
            <div key={label} className="flex flex-col items-center py-1.5 gap-0.5">
              <span style={{ fontSize: 9, fontWeight: 600, color: isToday ? C.salmon : '#aaa', letterSpacing: '0.04em' }}>{label.toUpperCase()}</span>
              <span style={{ width: 20, height: 20, borderRadius: '50%', background: isToday ? C.salmon : 'transparent', color: isToday ? '#fff' : C.ink, fontSize: 10, fontWeight: isToday ? 700 : 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{weekDates[i]}</span>
            </div>
          )
        })}
      </div>

      <div className="grid overflow-hidden" style={{ gridTemplateColumns: '36px repeat(5, 1fr)', maxHeight: 340 }}>
        <div style={{ borderRight: `1px solid ${C.ink}08` }}>
          {HERO_HOURS.map(h => (
            <div key={h} style={{ height: HERO_HOUR_H, display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end', paddingRight: 6, paddingTop: 3, fontSize: 8, color: '#c0c0c0' }}>
              {h === 12 ? '12pm' : h > 12 ? `${h - 12}pm` : `${h}am`}
            </div>
          ))}
        </div>
        {HERO_DAYS.map((day, dayIdx) => (
          <div key={day} className="relative" style={{ borderLeft: `1px solid ${C.ink}07` }}>
            {HERO_HOURS.map(h => <div key={h} style={{ height: HERO_HOUR_H, borderBottom: `1px solid ${C.ink}07` }} />)}
            {HERO_EVENTS.filter(e => e.day === dayIdx).map((ev, i) => (
              <div key={i} style={{ position: 'absolute', top: (ev.start - HERO_START_H) * HERO_HOUR_H + 1, height: (ev.end - ev.start) * HERO_HOUR_H - 2, left: 2, right: 2, borderRadius: 5, backgroundColor: ev.color, padding: '3px 5px', overflow: 'hidden', opacity: 0.92 }}>
                <span style={{ fontSize: 8, fontWeight: 700, color: C.ink, display: 'block', lineHeight: 1.2 }}>{ev.title}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
