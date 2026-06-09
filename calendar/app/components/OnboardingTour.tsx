'use client'

import { useState } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence, useReducedMotion, type Variants } from 'motion/react'
import { ArrowLeft } from 'lucide-react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { useT } from '../lib/i18n/useT'

const SALMON = '#FF7264'

// Shared animation: children pop in one after another.
const stagger: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.12 } } }
const popItem: Variants = {
  hidden: { scale: 0.6, opacity: 0 },
  show: { scale: 1, opacity: 1, transition: { type: 'spring', stiffness: 420, damping: 22 } },
}

function Chip({ children, bg = '#fff', color = '#0D0D0D' }: {
  children: React.ReactNode
  bg?: string
  color?: string
}) {
  return (
    <motion.div
      variants={popItem}
      className="rounded-lg px-2.5 py-1.5 text-[11px] font-semibold shadow-md"
      style={{ background: bg, color, border: '1px solid rgba(13,13,13,0.06)' }}
    >
      {children}
    </motion.div>
  )
}

// ---- per-slide illustrations ----

function ArtWelcome() {
  return (
    <motion.div
      initial={{ y: 6, opacity: 0 }}
      animate={{ y: [6, -4, 6], opacity: 1 }}
      transition={{ y: { duration: 3, repeat: Infinity, ease: 'easeInOut' }, opacity: { duration: 0.4 } }}
      className="flex items-center justify-center"
    >
      <Image src="/calent_icon.png" alt="" width={132} height={132} className="w-[58px] h-auto" />
    </motion.div>
  )
}

function ArtPlan() {
  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="flex flex-col items-center gap-2">
      <Chip>📚 CS 101</Chip>
      <Chip bg={SALMON}>＋ New event</Chip>
      <Chip>⏰ 2:00 PM</Chip>
    </motion.div>
  )
}

function ArtStayOnTop() {
  const dots = ['#818cf8', '#fb7185', '#34d399']
  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="flex flex-col items-center gap-2.5 w-full px-8">
      <motion.div variants={popItem} className="flex items-center gap-1.5">
        {dots.map(c => <span key={c} className="h-2.5 w-2.5 rounded-full" style={{ background: c }} />)}
      </motion.div>
      <motion.div
        variants={popItem}
        className="flex items-center gap-2 w-full max-w-[210px] rounded-lg bg-white px-2.5 py-2 shadow-md"
        style={{ border: '1px solid rgba(13,13,13,0.06)' }}
      >
        <span className="h-2 w-2 rounded-full shrink-0" style={{ background: SALMON }} />
        <span className="text-[11px] font-medium" style={{ color: '#0D0D0D' }}>Essay due</span>
        <span className="ml-auto text-[10px]" style={{ color: 'rgba(13,13,13,0.4)' }}>Fri</span>
      </motion.div>
    </motion.div>
  )
}

function ArtMakeItYours() {
  const swatches = ['#FF7264', '#a7f3d0', '#c4b5fd', '#fbcfe8']
  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="flex flex-col items-center gap-2.5">
      <motion.div variants={popItem} className="flex gap-1.5">
        {swatches.map(c => (
          <span key={c} className="h-6 w-6 rounded-md" style={{ background: c, border: '1px solid rgba(13,13,13,0.08)' }} />
        ))}
      </motion.div>
      <motion.div
        variants={popItem}
        className="rounded-md px-3 py-1.5 text-[11px] font-medium shadow-md"
        style={{ background: '#FEF3C7', color: '#0D0D0D', transform: 'rotate(-3deg)' }}
      >
        ✏️ note to self
      </motion.div>
    </motion.div>
  )
}

const SLIDES: { id: 'welcome' | 'plan' | 'stayOnTop' | 'makeItYours'; Art: () => React.ReactNode }[] = [
  { id: 'welcome', Art: ArtWelcome },
  { id: 'plan', Art: ArtPlan },
  { id: 'stayOnTop', Art: ArtStayOnTop },
  { id: 'makeItYours', Art: ArtMakeItYours },
]

export function OnboardingTour({ open, onComplete }: { open: boolean; onComplete: () => void }) {
  const { t } = useT()
  const reduce = useReducedMotion()
  const [[step, dir], setStep] = useState<[number, number]>([0, 0])
  const last = SLIDES.length - 1
  const slide = SLIDES[step]

  const go = (next: number) => setStep([next, next > step ? 1 : -1])
  const handleNext = () => (step === last ? onComplete() : go(step + 1))

  const shift = reduce ? 0 : 28
  const variants: Variants = {
    enter: (d: number) => ({ opacity: 0, x: d > 0 ? shift : -shift }),
    center: { opacity: 1, x: 0 },
    exit: (d: number) => ({ opacity: 0, x: d > 0 ? -shift : shift }),
  }
  const transition = { duration: 0.28, ease: 'easeOut' as const }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onComplete()}>
      <DialogContent showCloseButton={false} className="p-0 gap-0 overflow-hidden sm:max-w-[360px]">
        <div className="relative p-6" style={{ fontFamily: 'var(--font-geist)' }}>
          {/* Skip */}
          <button
            onClick={onComplete}
            className="absolute top-3.5 right-4 z-10 text-[11px] transition-opacity hover:opacity-60"
            style={{ color: 'rgba(13,13,13,0.4)' }}
          >
            {t('onboarding.skip')}
          </button>

          {/* Illustration panel */}
          <div
            className="h-[132px] rounded-2xl flex items-center justify-center mb-5 mt-1 overflow-hidden"
            style={{ background: 'linear-gradient(160deg,#FFF1EF,#FFE3DE)' }}
          >
            <AnimatePresence mode="wait" custom={dir}>
              <motion.div key={slide.id} custom={dir} variants={variants} initial="enter" animate="center" exit="exit" transition={transition}>
                <slide.Art />
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Text */}
          <div aria-live="polite" className="min-h-[64px]">
            <AnimatePresence mode="wait" custom={dir}>
              <motion.div key={slide.id} custom={dir} variants={variants} initial="enter" animate="center" exit="exit" transition={transition}>
                <h2 className="text-[17px] font-bold mb-1.5" style={{ color: '#0D0D0D' }}>
                  {t(`onboarding.${slide.id}.title`)}
                </h2>
                <p className="text-[13px] leading-relaxed" style={{ color: 'rgba(13,13,13,0.55)' }}>
                  {t(`onboarding.${slide.id}.body`)}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Dots */}
          <div className="flex gap-1.5 justify-center my-5" aria-hidden>
            {SLIDES.map((s, i) => (
              <span
                key={s.id}
                className="h-1.5 rounded-full transition-all duration-200"
                style={{ width: i === step ? 18 : 6, background: i === step ? SALMON : 'rgba(13,13,13,0.15)' }}
              />
            ))}
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2">
            {step > 0 && (
              <button
                onClick={() => go(step - 1)}
                aria-label={t('onboarding.back')}
                className="flex items-center justify-center h-10 w-10 rounded-[10px] transition-colors hover:bg-black/5"
                style={{ color: 'rgba(13,13,13,0.5)' }}
              >
                <ArrowLeft size={16} />
              </button>
            )}
            <button
              onClick={handleNext}
              className="flex-1 rounded-[10px] py-2.5 text-[13px] font-semibold transition-opacity hover:opacity-85 active:opacity-70"
              style={{ background: SALMON, color: '#0D0D0D' }}
            >
              {step === last ? t('onboarding.getStarted') : t('onboarding.next')}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
