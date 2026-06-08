import { C } from '../theme'

// Month grid with a selected-day panel for the bento grid (May 2026).

const MAY_GRID = [
  [null, null, null, null, 1, 2, 3],
  [4, 5, 6, 7, 8, 9, 10],
  [11, 12, 13, 14, 15, 16, 17],
  [18, 19, 20, 21, 22, 23, 24],
  [25, 26, 27, 28, 29, 30, 31],
]

const MAY_DOTS: Record<number, string[]> = {
  1: ['#818cf8'],
  5: ['#f472b6', '#a78bfa'],
  8: ['#34d399'],
  12: ['#60a5fa'],
  14: ['#fbbf24', '#818cf8'],
  19: ['#f472b6'],
  21: ['#34d399'],
  22: ['#fbbf24'],
  26: ['#60a5fa'],
  27: ['#818cf8', '#34d399'],
  28: ['#818cf8', '#34d399'],
  29: ['#f472b6'],
}

const TODAY_EVENTS = [
  { time: '9:00', end: '10:00', title: 'Calculus', color: '#818cf8' },
  { time: '11:30', end: '12:30', title: 'Study group', color: '#34d399' },
  { time: '14:00', end: '15:00', title: 'Office hours', color: '#a78bfa' },
]

export function MiniMonthMock() {
  const DAYS_S = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
  return (
    <div style={{ display: 'flex', gap: 16, width: '100%', fontFamily: 'var(--font-geist)' }}>
      <div style={{ flex: '0 0 auto', minWidth: 160 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: 5 }}>
          {DAYS_S.map((d, i) => (
            <div key={i} style={{ textAlign: 'center', fontSize: 8, fontWeight: 600, letterSpacing: '0.06em', color: 'rgba(255,255,255,0.35)', paddingBottom: 3 }}>{d}</div>
          ))}
        </div>
        {MAY_GRID.map((week, wi) => (
          <div key={wi} style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: 2 }}>
            {week.map((date, di) => {
              const isToday = date === 28
              const dots = date ? (MAY_DOTS[date] ?? []) : []
              return (
                <div key={di} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                  <div style={{ width: 18, height: 18, borderRadius: '50%', background: isToday ? '#ffffff' : 'transparent', color: isToday ? C.ink : date ? 'rgba(255,255,255,0.75)' : 'transparent', fontSize: 8, fontWeight: isToday ? 700 : 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {date ?? ''}
                  </div>
                  {dots.length > 0 && (
                    <div style={{ display: 'flex', gap: 2 }}>
                      {dots.slice(0, 2).map((color, ci) => <div key={ci} style={{ width: 3, height: 3, borderRadius: '50%', background: color }} />)}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ))}
      </div>

      <div style={{ flex: 1, borderLeft: '1px solid rgba(255,255,255,0.1)', paddingLeft: 14 }}>
        <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', fontWeight: 600, letterSpacing: '0.06em', marginBottom: 8 }}>
          THU 28
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {TODAY_EVENTS.map((ev, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'rgba(255,255,255,0.07)', borderRadius: 6, padding: '5px 8px', borderLeft: `2px solid ${ev.color}` }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: ev.color, flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 9, fontWeight: 600, color: 'rgba(255,255,255,0.85)', lineHeight: 1.2 }}>{ev.title}</div>
                <div style={{ fontSize: 7, color: 'rgba(255,255,255,0.35)', marginTop: 1 }}>{ev.time} - {ev.end}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
