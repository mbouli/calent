import Image from 'next/image'
import { ArrowRight } from 'lucide-react'
import { C } from './theme'

// Sticky top navigation bar with the wordmark and access link.
export function Nav() {
  return (
    <nav
      className="sticky top-0 z-50 flex items-center justify-between px-6 md:px-16 h-14"
      style={{
        backgroundColor: 'rgba(255,255,255,0.88)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: `1px solid ${C.ink}0d`,
      }}
    >
      <Image src="/calent_wordmark_black.png" alt="Calent" width={51} height={34} className="object-contain" priority />
      <a
        href="https://my.calent.xyz"
        className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-md transition-all hover:opacity-85 active:scale-[0.97]"
        style={{ backgroundColor: C.salmon, color: C.ink }}
      >
        Open Calent <ArrowRight size={12} />
      </a>
    </nav>
  )
}
