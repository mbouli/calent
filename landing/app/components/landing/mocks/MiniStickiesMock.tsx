// Row of sticky-note checklists for the bento grid.

const STICKY_CARDS = [
  {
    bg: '#eef2ff', titleColor: '#3730a3', textColor: '#4338ca', checkColor: '#a5b4fc',
    title: 'Thesis notes',
    items: [{ text: 'Chapter 2 draft', done: true }, { text: 'Add citations', done: false }, { text: 'Review intro', done: false }],
  },
  {
    bg: '#fffbeb', titleColor: '#92400e', textColor: '#b45309', checkColor: '#fcd34d',
    title: 'This week',
    items: [{ text: 'Email professor', done: true }, { text: 'Submit draft', done: false }, { text: 'Lab report', done: false }],
  },
  {
    bg: '#fff1f2', titleColor: '#9f1239', textColor: '#be123c', checkColor: '#fda4af',
    title: 'Ideas',
    items: [{ text: 'Research methods', done: false }, { text: 'Side project scope', done: false }],
  },
]

export function MiniStickiesMock() {
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', width: '100%' }}>
      {STICKY_CARDS.map((card, i) => (
        <div key={i} style={{ flex: 1, background: card.bg, borderRadius: 8, padding: '8px 10px 10px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: card.titleColor, marginBottom: 5, lineHeight: 1 }}>{card.title}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {card.items.map((item, j) => (
              <div key={j} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <div style={{ width: 8, height: 8, borderRadius: 2, flexShrink: 0, border: `1.5px solid ${card.checkColor}`, background: item.done ? card.checkColor : 'transparent' }} />
                <span style={{ fontSize: 9, color: card.textColor, lineHeight: 1.3, textDecoration: item.done ? 'line-through' : 'none', opacity: item.done ? 0.5 : 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
