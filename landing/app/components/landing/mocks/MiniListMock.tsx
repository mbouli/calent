import { C } from '../theme'

// Chronological agenda feed grouped by day for the bento grid.

const AGENDA = [
  { day: 'Today', time: '9:00 AM', title: 'Calculus', color: '#818cf8' },
  { day: 'Today', time: '2:00 PM', title: 'Office hours', color: '#a78bfa' },
  { day: 'Tomorrow', time: '9:00 AM', title: 'Calculus', color: '#818cf8' },
  { day: 'Tomorrow', time: '11:00 AM', title: 'Study group', color: '#34d399' },
  { day: 'Tomorrow', time: '3:00 PM', title: 'Project review', color: '#fbbf24' },
]

export function MiniListMock() {
  let lastDay = ''
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0, fontFamily: 'var(--font-geist)' }}>
      {AGENDA.map((ev, i) => {
        const showLabel = ev.day !== lastDay
        if (showLabel) lastDay = ev.day
        return (
          <div key={i}>
            {showLabel && (
              <div style={{ fontSize: 8, fontWeight: 700, color: C.ink, opacity: 0.35, letterSpacing: '0.08em', marginTop: i === 0 ? 0 : 10, marginBottom: 5 }}>
                {ev.day.toUpperCase()}
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'rgba(255,255,255,0.65)', borderRadius: 6, padding: '5px 8px', marginBottom: 4, borderLeft: `2px solid ${ev.color}`, backdropFilter: 'blur(4px)' }}>
              <span style={{ fontSize: 8, color: '#9ca3af', minWidth: 44, flexShrink: 0 }}>{ev.time}</span>
              <span style={{ fontSize: 9, fontWeight: 600, color: C.ink, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', flex: 1 }}>{ev.title}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
