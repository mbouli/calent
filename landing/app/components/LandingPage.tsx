'use client'

import { useEffect, useRef } from 'react'
import { C } from './landing/theme'
import { Confetti } from './landing/Confetti'
import { Nav } from './landing/Nav'
import { Hero } from './landing/Hero'
import { Bento } from './landing/Bento'
import { Spotlight } from './landing/Spotlight'
import { Footer } from './landing/Footer'
import { Reveal } from './landing/Reveal'

export default function LandingPage() {
  // Confetti is clipped to this element's bounds so it stays within the hero.
  const heroRef = useRef<HTMLDivElement>(null)

  // Disable the browser's scroll restoration so refreshes always land at the top.
  useEffect(() => {
    if ('scrollRestoration' in history) {
      history.scrollRestoration = 'manual'
    }
    window.scrollTo(0, 0)
  }, [])

  return (
    <div className="overflow-x-hidden" style={{ backgroundColor: '#ffffff', color: C.ink, fontFamily: 'var(--font-geist)' }}>
      <Reveal>
        <Confetti boundaryRef={heroRef} />
      </Reveal>
      <div className="relative z-10">
        <Nav />
        <div ref={heroRef}>
          <Hero />
        </div>
        <Spotlight />
        <Bento />
        <Footer />
      </div>
    </div>
  )
}
