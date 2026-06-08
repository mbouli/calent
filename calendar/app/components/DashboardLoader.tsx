'use client'

import Image from 'next/image'
import { motion } from 'motion/react'
import { useBrowserT } from '../lib/i18n/useT'

const SALMON = '#FF7264'

export function DashboardLoader() {
  const { t } = useBrowserT()
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center gap-6 bg-background"
      style={{ fontFamily: 'var(--font-geist)' }}
    >
      {/* Gently breathing app icon */}
      <motion.div
        animate={{ opacity: [0.55, 1, 0.55], scale: [0.97, 1, 0.97] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
      >
        <Image
          src="/calent_icon.png"
          alt="Calent"
          width={256}
          height={256}
          quality={100}
          priority
          className="h-14 w-14 rounded-[16px] shadow-sm"
        />
      </motion.div>

      <div className="flex flex-col items-center gap-3">
        <p className="text-sm text-muted-foreground">{t('loader.loading')}</p>
        {/* Three staggered salmon dots */}
        <div className="flex items-center gap-1.5">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: SALMON }}
              animate={{ opacity: [0.25, 1, 0.25], y: [0, -2, 0] }}
              transition={{ duration: 0.9, repeat: Infinity, ease: 'easeInOut', delay: i * 0.15 }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
