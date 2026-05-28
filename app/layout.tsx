import type { Metadata, Viewport } from 'next'
import { DM_Sans } from 'next/font/google'
import './globals.css'
import { Toaster } from '@/components/ui/sonner'
import { Providers } from '@/components/providers'

const dmSans = DM_Sans({
  variable: '--font-dm-sans',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
})

export const metadata: Metadata = {
  title: {
    default: 'DutchIt — Split smart. Settle faster.',
    template: '%s | DutchIt',
  },
  description:
    'The modern expense splitting app. Add expenses, track balances, and settle up with UPI — all in one place.',
  keywords: ['expense splitting', 'split bills', 'UPI payment', 'Splitwise alternative', 'group expenses'],
  authors: [{ name: 'DutchIt' }],
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'DutchIt',
  },
  openGraph: {
    title: 'DutchIt — Split smart. Settle faster.',
    description: 'The modern expense splitting app built for India.',
    type: 'website',
  },
}

export const viewport: Viewport = {
  themeColor: '#0a0f1e',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${dmSans.variable} h-full antialiased dark`}>
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
        <Toaster
          position="top-right"
          theme="dark"
          toastOptions={{
            style: {
              background: 'rgba(17, 24, 39, 0.95)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#f8fafc',
            },
          }}
        />
      </body>
    </html>
  )
}
