import Image from 'next/image'
import Link from 'next/link'
import { C } from './theme'
import { Reveal } from './Reveal'
import { MiniCalendarPreview } from './mocks/MiniCalendarPreview'

// Centered hero with headline, call to action, and calendar preview.
export function Hero() {
  return (
    <section className="flex flex-col items-center text-center px-6 pt-20 md:pt-24 pb-0">
      <Reveal>
        <Image
          src="/calent_app_icon.png"
          alt="Calent"
          width={356}
          height={356}
          quality={100}
          priority
          className="mb-5 h-22 w-22 rounded-[20px] shadow-sm"
        />
      </Reveal>

      <Reveal>
        <h1
          className="text-[clamp(1.3rem,6vw,1rem)] font-medium leading-[1.1] tracking-tight mb-1"
        >
          Welcome to Calent
        </h1>
      </Reveal>
      <Reveal>
        <h1
          className="text-[clamp(2.6rem,6vw,4.5rem)] font-semibold leading-[1.1] tracking-tight mb-4"
        >
          Your schedule,{' '}
          <span style={{ color: C.salmon }}>simplified.</span>
        </h1>
      </Reveal>

      <Reveal delay={0.07}>
        <p
          className="text-base md:text-lg leading-relaxed mb-8 max-w-[40ch] mx-auto"
          style={{ color: '#888' }}
        >
          A simple calendar that helps you keep track of life without getting in the way.
        </p>
      </Reveal>

      <Reveal delay={0.13}>
        <a
          href="https://my.calent.xyz"
          className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-semibold rounded-md transition-all hover:opacity-85 active:scale-[0.97] mb-3"
          style={{ backgroundColor: C.salmon, color: C.ink }}
        >
          Start now
        </a>
        <p className="text-xs mb-14" style={{ color: `${C.ink}59` }}>
          Currently in Beta
        </p>
      </Reveal>

      <Reveal delay={0.18} className="w-full max-w-205 mx-auto px-2 md:px-0">
        <div style={{ borderRadius: 16, overflow: 'hidden', boxShadow: '0 24px 80px rgba(13,13,13,0.09), 0 2px 12px rgba(13,13,13,0.04)', border: `1px solid ${C.ink}0e` }}>
          <MiniCalendarPreview />
        </div>
      </Reveal>
    </section>
  )
}
