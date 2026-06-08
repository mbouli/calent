import { C } from './theme'
import { Reveal } from './Reveal'

// Spotlight section highlighting natural-language event capture.
export function Spotlight() {
  return (
    <section className="max-w-275 mx-auto px-6 md:px-12 pt-16 pb-20">
      <Reveal>
        <div
          className="flex flex-col md:flex-row items-center gap-10 md:gap-14 rounded-2xl px-8 md:px-12 py-12"
          style={{ backgroundColor: C.offWhite, fontFamily: 'var(--font-geist)' }}
        >
          <div className="flex-none md:w-75">
            <div
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 mb-5 text-[11px] font-medium"
              style={{ backgroundColor: C.ink, color: 'rgba(255,255,255,0.75)' }}
            >
              <kbd
                className="rounded text-white text-[11px] font-mono px-1.5 py-px"
                style={{ background: 'rgba(255,255,255,0.15)' }}
              >⌘K</kbd>
              anywhere
            </div>
            <h2
              className="text-[1.85rem] font-semibold leading-[1.15] tracking-tight mb-3"
              style={{ color: C.ink }}
            >
              Type the day away.<br />
              <span style={{ color: C.salmon }}>Calent does the rest.</span>
            </h2>
            <p className="text-sm leading-relaxed" style={{ color: `${C.ink}73` }}>
              No forms. No dropdowns. Just describe what you need and your event lands on the calendar with a tap to confirm.
            </p>
          </div>

          <div className="flex-1 flex flex-col gap-1.5 w-full" style={{ fontFamily: 'var(--font-geist)' }}>
            <div
              className="flex items-center gap-3 rounded-[14px] px-4 py-3"
              style={{
                background: '#fff',
                border: `1px solid ${C.ink}10`,
                boxShadow: '0 2px 8px rgba(13,13,13,0.06), 0 16px 48px rgba(13,13,13,0.10)',
              }}
            >
              <span className="text-[13px] shrink-0" style={{ color: `${C.ink}4d` }}>⌕</span>
              <span className="text-[13px]" style={{ color: C.ink }}>
                gym tomorrow 6pm
                <span
                  className="inline-block w-[1.5px] h-3.25 ml-px align-middle animate-pulse"
                  style={{ background: C.salmon }}
                />
              </span>
            </div>
            <div
              className="rounded-[14px] px-4 py-3.5"
              style={{
                background: '#fff',
                border: `1px solid ${C.ink}10`,
                boxShadow: '0 2px 8px rgba(13,13,13,0.05), 0 12px 40px rgba(13,13,13,0.08)',
              }}
            >
              <p className="text-[13px] font-semibold mb-0.5" style={{ color: C.ink }}>Gym</p>
              <p className="text-[11.5px] mb-3" style={{ color: `${C.ink}66` }}>Tomorrow · 18:00–19:00</p>
              <div className="flex gap-2">
                <button
                  className="flex-1 rounded-[9px] py-2 text-[12px] font-semibold text-white"
                  style={{ background: C.ink }}
                >
                  Add to calendar
                </button>
                <button
                  className="rounded-[9px] px-4 py-2 text-[12px] font-medium"
                  style={{ border: `1px solid ${C.ink}18`, color: `${C.ink}59` }}
                >
                  Edit
                </button>
              </div>
              <p className="text-[10px] text-center mt-2.5" style={{ color: `${C.ink}4d` }}>
                Press{' '}
                <kbd className="rounded px-1 py-px font-mono text-[9px]" style={{ background: `${C.ink}0a`, color: `${C.ink}66` }}>↵</kbd>
                {' '}to confirm ·{' '}
                <kbd className="rounded px-1 py-px font-mono text-[9px]" style={{ background: `${C.ink}0a`, color: `${C.ink}66` }}>Esc</kbd>
                {' '}to close
              </p>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  )
}
