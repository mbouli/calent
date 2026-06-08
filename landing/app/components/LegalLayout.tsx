'use client'

import Image from 'next/image'
import Link from 'next/link'
import { motion, useReducedMotion } from 'motion/react'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { Footer } from './landing/Footer'
import { Nav } from './landing/Nav'

const C = {
  salmon: '#FF7264',
  ink: '#0D0D0D',
} as const

// Matches the landing page's scroll-reveal feel.
function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode
  delay?: number
  className?: string
}) {
  const reduce = useReducedMotion()
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  )
}

export type Block =
  | { type: 'p'; text: string }
  | { type: 'sub'; text: string }
  | { type: 'list'; items: string[] }
  | { type: 'contact'; text: string; email: string }

export interface LegalSection {
  title: string
  blocks: Block[]
}

function BlockView({ block }: { block: Block }) {
  const bodyColor = `${C.ink}b0`
  switch (block.type) {
    case 'sub':
      return (
        <h3 className="text-sm font-semibold pl-7 mt-6 mb-2 tracking-[-0.01em]">{block.text}</h3>
      )
    case 'p':
      return (
        <p className="text-[15px] leading-relaxed pl-7" style={{ color: bodyColor }}>
          {block.text}
        </p>
      )
    case 'list':
      return (
        <ul className="pl-7 flex flex-col gap-2">
          {block.items.map((item) => (
            <li
              key={item}
              className="flex items-start gap-2.5 text-[15px] leading-relaxed"
              style={{ color: bodyColor }}
            >
              <span className="mt-2.25 h-1 w-1 rounded-full shrink-0" style={{ background: C.salmon }} />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )
    case 'contact':
      return (
        <p className="text-[15px] leading-relaxed pl-7" style={{ color: bodyColor }}>
          {block.text}{' '}
          <a
            href={`mailto:${block.email}`}
            className="underline underline-offset-2 transition-opacity hover:opacity-70"
            style={{ color: C.salmon }}
          >
            {block.email}
          </a>
        </p>
      )
  }
}

interface LegalLayoutProps {
  title: string
  lastUpdated: string
  intro: string
  sections: LegalSection[]
}

export function LegalLayout({ title, lastUpdated, intro, sections }: LegalLayoutProps) {
  return (
    <div
      className="min-h-screen flex flex-col overflow-x-hidden"
      style={{ backgroundColor: '#ffffff', color: C.ink, fontFamily: 'var(--font-geist)' }}
    >
      <Nav />

      <main className="flex-1 w-full max-w-170 mx-auto px-6 pt-16 md:pt-24 pb-24">
        <Reveal>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-medium mb-10 transition-opacity hover:opacity-60"
            style={{ color: `${C.ink}55` }}
          >
            <ArrowLeft size={13} /> Back to home
          </Link>
        </Reveal>

        <Reveal delay={0.05}>
          <h1 className="text-[clamp(2.2rem,5vw,3.4rem)] font-semibold leading-[1.1] tracking-tight mb-3">
            {title}<span style={{ color: C.salmon }}>.</span>
          </h1>
        </Reveal>

        <Reveal delay={0.1}>
          <p className="text-sm mb-10" style={{ color: `${C.ink}55` }}>
            Last updated: {lastUpdated}
          </p>
        </Reveal>

        <Reveal delay={0.14}>
          <p className="text-[15px] leading-relaxed mb-4" style={{ color: `${C.ink}b3` }}>
            {intro}
          </p>
        </Reveal>

        <div className="flex flex-col">
          {sections.map((section, i) => (
            <Reveal key={section.title} delay={0.18 + i * 0.04}>
              <section className="py-8" style={{ borderTop: `1px solid ${C.ink}0d` }}>
                <div className="flex items-baseline gap-3 mb-4">
                  <span className="text-xs font-mono tabular-nums" style={{ color: C.salmon }}>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <h2 className="text-lg font-semibold tracking-[-0.01em]">{section.title}</h2>
                </div>
                <div className="flex flex-col gap-3">
                  {section.blocks.map((block, j) => (
                    <BlockView key={j} block={block} />
                  ))}
                </div>
              </section>
            </Reveal>
          ))}
        </div>
      </main>

      <Footer />
    </div>
  )
}
