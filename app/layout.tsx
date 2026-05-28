import type { Metadata, Viewport } from 'next'
import { DM_Sans } from 'next/font/google'
import './globals.css'
import { Toaster } from '@/components/ui/sonner'
import { Providers } from '@/components/providers'
import { ServiceWorkerRegistrar } from '@/components/service-worker-registrar'
import { OfflineBanner } from '@/components/offline-banner'

const dmSans = DM_Sans({
  variable: '--font-dm-sans',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
})

export const metadata: Metadata = {
  title: {
    default: 'Dutch It! — Split smart. Settle faster.',
    template: '%s | Dutch It!',
  },
  description:
    'The modern expense splitting app. Add expenses, track balances, and settle up with UPI — all in one place.',
  keywords: ['expense splitting', 'split bills', 'UPI payment', 'Splitwise alternative', 'group expenses'],
  authors: [{ name: 'Dutch It!' }],
  manifest: '/manifest.json',
  appleWebApp: {
      capable: true,
      statusBarStyle: 'black-translucent',
      title: 'Dutch It!',
      startupImage: '/apple-touch-icon.png',
    },
  icons: {
    apple: '/apple-touch-icon.png',
    icon: [
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  },
  openGraph: {
    title: 'Dutch It! — Split smart. Settle faster.',
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
    <html lang="en" className={`${dmSans.variable} h-full antialiased dark`} suppressHydrationWarning>
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
        <OfflineBanner />
        <ServiceWorkerRegistrar />
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
