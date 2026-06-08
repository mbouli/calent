import { C } from '../theme'

// Week grid showing a recurring class (Mon/Wed/Fri) for the bento grid.

const REC_HOUR_H = 26
const REC_START_H = 8
const REC_HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16]
const REC_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
const REC_DATES = [25, 26, 27, 28, 29]

const REC_EVENTS = [
  { day: 0, start: 9, end: 10, title: 'Calculus', color: '#818cf8', recurring: true },
  { day: 2, start: 9, end: 10, title: 'Calculus', color: '#818cf8', recurring: true },
  { day: 4, start: 9, end: 10, title: 'Calculus', color: '#818cf8', recurring: true },
  { day: 0, start: 14, end: 15.5, title: 'Study group', color: '#34d399', recurring: false },
  { day: 1, start: 11, end: 12, title: 'Office hrs', color: '#a78bfa', recurring: false },
  { day: 3, start: 13, end: 14, title: 'Lunch', color: '#fbbf24', recurring: false },
  { day: 4, start: 15, end: 16, title: 'Review', color: '#f472b6', recurring: false },
]

export function MiniRecurringMock() {
  return (
    <div style={{ width: '100%', fontFamily: 'var(--font-geist)', overflow: 'hidden' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '24px repeat(5, 1fr)', borderBottom: `1px solid ${C.ink}10`, marginBottom: 0 }}>
        <div />
        {REC_DAYS.map((d, i) => {
          const isToday = i === 3
          return (
            <div key={d} style={{ textAlign: 'center', paddingBottom: 5, paddingTop: 2 }}>
              <div style={{ fontSize: 7, fontWeight: 600, letterSpacing: '0.05em', color: isToday ? C.salmon : '#aaa' }}>{d.toUpperCase()}</div>
              <div style={{ width: 15, height: 15, borderRadius: '50%', margin: '2px auto 0', background: isToday ? C.salmon : 'transparent', color: isToday ? '#fff' : C.ink, fontSize: 7, fontWeight: isToday ? 700 : 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{REC_DATES[i]}</div>
            </div>
          )
        })}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '24px repeat(5, 1fr)' }}>
        <div style={{ borderRight: `1px solid ${C.ink}08` }}>
          {REC_HOURS.map(h => (
            <div key={h} style={{ height: REC_HOUR_H, display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end', paddingRight: 4, paddingTop: 2, fontSize: 7, color: '#ccc' }}>
              {h === 12 ? '12p' : h > 12 ? `${h - 12}p` : `${h}a`}
            </div>
          ))}
        </div>

        {REC_DAYS.map((day, dayIdx) => (
          <div key={day} style={{ position: 'relative', borderLeft: `1px solid ${C.ink}07` }}>
            {REC_HOURS.map(h => <div key={h} style={{ height: REC_HOUR_H, borderBottom: `1px solid ${C.ink}06` }} />)}
            {REC_EVENTS.filter(e => e.day === dayIdx).map((ev, i) => (
              <div key={i} style={{
                position: 'absolute',
                top: (ev.start - REC_START_H) * REC_HOUR_H + 1,
                height: (ev.end - ev.start) * REC_HOUR_H - 2,
                left: 2, right: 2,
                borderRadius: 4,
                background: ev.color,
                padding: '2px 4px',
                overflow: 'hidden',
                opacity: ev.recurring ? 1 : 0.82,
                outline: ev.recurring ? `1.5px dashed ${ev.color}` : 'none',
                outlineOffset: 1,
              }}>
                <span style={{ fontSize: 7, fontWeight: 700, color: '#fff', display: 'block', lineHeight: 1.2 }}>{ev.title}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
