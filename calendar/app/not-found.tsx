'use client'

import Image from 'next/image'
import Link from 'next/link'
import { motion, useReducedMotion } from 'motion/react'
import { ArrowRight, ArrowLeft } from 'lucide-react'

const C = {
  salmon: '#FF7264',
  ink: '#0D0D0D',
} as const

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
}
const item = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] as const } },
}

export default function NotFound() {
  const reduce = useReducedMotion()

  return (
    <div
      className="min-h-screen flex flex-col overflow-x-hidden"
      style={{ backgroundColor: '#ffffff', color: C.ink, fontFamily: 'var(--font-geist)' }}
    >
      <nav
        className="sticky top-0 z-50 flex items-center justify-between px-6 md:px-16 h-14"
        style={{
          backgroundColor: 'rgba(255,255,255,0.88)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderBottom: `1px solid ${C.ink}0d`,
        }}
      >
        <Link href="/">
          <Image src="/calent_wordmark_black.png" alt="Calent" width={132} height={48} className="w-[51px] h-auto" priority />
        </Link>
        <Link
          href="/"
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-full transition-all hover:opacity-85 active:scale-[0.97]"
          style={{ backgroundColor: C.salmon, color: C.ink }}
        >
          Open Calent <ArrowRight size={12} />
        </Link>
      </nav>

      {/* BODY — centered in the remaining space */}
      <main className="relative flex-1 flex flex-col items-center justify-center text-center px-6 overflow-hidden">
        {/* Soft atmospheric glow — salmon, very faint */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background: `radial-gradient(560px 360px at 50% 38%, ${C.salmon}14, transparent 70%)`,
          }}
        />

        <motion.div
          className="relative flex flex-col items-center -mt-8"
          variants={reduce ? undefined : container}
          initial={reduce ? false : 'hidden'}
          animate={reduce ? undefined : 'show'}
        >
          {/* 404 chip */}
          <motion.span
            variants={item}
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 mb-7 text-[11px] font-medium"
            style={{ backgroundColor: `${C.salmon}1a`, color: C.salmon }}
          >
            <span className="font-mono tabular-nums">404</span>
            <span style={{ color: `${C.salmon}99` }}>·</span>
            Not found
          </motion.span>

          {/* Headline */}
          <motion.h1
            variants={item}
            className="text-[clamp(2.4rem,6vw,4rem)] font-semibold leading-[1.08] tracking-[-0.025em] mb-4 max-w-[16ch]"
          >
            This page isn’t on the calendar<span style={{ color: C.salmon }}>.</span>
          </motion.h1>

          {/* Subtext */}
          <motion.p
            variants={item}
            className="text-base md:text-lg leading-relaxed mb-9 max-w-[42ch]"
            style={{ color: '#888' }}
          >
            The link may be broken or the page may have moved. No drama — let’s get you back to your week.
          </motion.p>

          {/* CTA */}
          <motion.div variants={item}>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-semibold rounded-full transition-all hover:opacity-85 active:scale-[0.97]"
              style={{ backgroundColor: C.salmon, color: C.ink }}
            >
              <ArrowLeft size={14} /> Back home
            </Link>
          </motion.div>
        </motion.div>
      </main>
    </div>
  )
}
