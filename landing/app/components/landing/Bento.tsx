import { C } from './theme'
import { Reveal } from './Reveal'
import { MiniStickiesMock } from './mocks/MiniStickiesMock'
import { MiniMonthMock } from './mocks/MiniMonthMock'
import { MiniRecurringMock } from './mocks/MiniRecurringMock'
import { MiniListMock } from './mocks/MiniListMock'

// Feature grid of bento tiles, each pairing a mockup with a short caption.
const BENTO_TILES = [
  {
    id: 1, span: 1,
    title: 'Keep everything in one place',
    body: 'Add notes and checklists alongside your schedule, so nothing gets lost.',
    bg: '#ffffff', ink: C.ink,
    Mockup: MiniStickiesMock,
  },
  {
    id: 2, span: 2,
    title: 'Plan beyond today',
    body: 'Zoom out and see your month without losing sight of what matters.',
    bg: C.ink, ink: C.offWhite,
    Mockup: MiniMonthMock,
  },
  {
    id: 3, span: 2,
    title: 'Simple, by design',
    body: 'Calent lacks the clutter and gimmicks of traditional calendars, so you can focus on what matters: your schedule.',
    bg: C.mint, ink: C.ink,
    Mockup: MiniRecurringMock,
  },
  {
    id: 4, span: 1,
    title: 'Always know what’s next',
    body: 'A simple agenda view that keeps upcoming plans front and center.',
    bg: C.lavender, ink: C.ink,
    Mockup: MiniListMock,
  },
]

export function Bento() {
  return (
    <section className="max-w-275 mx-auto px-6 md:px-12 pt-0 pb-20">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3" style={{ gridAutoRows: '300px' }}>
        {BENTO_TILES.map((tile, i) => (
          <Reveal
            key={tile.id}
            delay={i * 0.06}
            className={`h-full ${tile.span === 2 ? 'md:col-span-2' : 'md:col-span-1'}`}
          >
            <div
              className="h-full rounded-2xl overflow-hidden flex flex-col"
              style={{ backgroundColor: tile.bg, color: tile.ink }}
            >
              <div className="flex-1 overflow-hidden px-5 pt-5 pb-2">
                <tile.Mockup />
              </div>
              <div className="px-5 pb-5 pt-1 shrink-0">
                <h3 className="text-sm font-semibold mb-0.5 leading-tight">{tile.title}</h3>
                <p className="text-xs leading-relaxed" style={{ opacity: 0.5 }}>{tile.body}</p>
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  )
}
