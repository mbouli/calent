import type { Metadata, Viewport } from 'next'
import { Inter, Geist } from 'next/font/google'
import './globals.css'
import { ServiceWorkerRegister } from './components/ServiceWorkerRegister'

const inter = Inter({ variable: '--font-inter', subsets: ['latin'] })

const geist = Geist({
  variable: '--font-geist',
  subsets: ['latin'],
})


export const metadata: Metadata = {
  title: 'Calent - Just a calendar',
  description: 'Minimal, fast calendar for focused people.',
  appleWebApp: {
    capable: true,
    title: 'Calent',
    statusBarStyle: 'default',
  },
  icons: {
    apple: '/icons/apple-touch-icon.png',
  },
}

export const viewport: Viewport = {
  themeColor: '#ffffff',
  // Let content extend into the safe areas so env(safe-area-inset-*) works
  // (needed for the bottom nav to clear iOS Safari's bar / the home indicator).
  viewportFit: 'cover',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} ${geist.variable} h-full antialiased`}>
      <body className="h-full">
        {/* Disable the browser's automatic scroll restoration before it runs —
            on reload/back it was compounding the scroll position (+20px each
            time). Next's router handles scroll for client navigations itself. */}
        <script
          dangerouslySetInnerHTML={{
            __html: "if ('scrollRestoration' in history) history.scrollRestoration = 'manual';",
          }}
        />
        <ServiceWorkerRegister />
        {children}
      </body>
    </html>
  )
}
