import Image from 'next/image'
import Link from 'next/link'
import { C } from './theme'

export function Footer() {
  return (
    <footer
      className="flex flex-col md:flex-row items-center justify-between gap-3 px-6 md:px-16 py-6"
      style={{ borderTop: `1px solid ${C.ink}0d` }}
    >
      <Image src="/calent_wordmark_black.png" alt="Calent" width={132} height={48} className="w-[42px] h-auto opacity-35" />
      <div className="flex items-center gap-4">
        <Link
          href="/privacy"
          className="text-xs transition-opacity hover:opacity-100"
          style={{ color: `${C.ink}45` }}
        >
          Privacy
        </Link>
        <Link
          href="/terms"
          className="text-xs transition-opacity hover:opacity-100"
          style={{ color: `${C.ink}45` }}
        >
          Terms
        </Link>
        <p className="text-xs" style={{ color: `${C.ink}45` }}>© 2026 calent.xyz</p>
      </div>
    </footer>
  )
}
