'use client'

import { QueryClient } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { useState } from 'react'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'
import { TooltipProvider } from '@/components/ui/tooltip'
import { ThemeProvider } from '@/lib/theme'

// 7 days in ms
const MAX_AGE = 1000 * 60 * 60 * 24 * 7

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            refetchOnWindowFocus: false,
            // Serve stale cached data when offline
            networkMode: 'offlineFirst',
            // Keep cache for 7 days so localStorage persistence is meaningful
            gcTime: MAX_AGE,
          },
          mutations: {
            networkMode: 'offlineFirst',
          },
        },
      })
  )

  const [persister] = useState(() =>
    createSyncStoragePersister({
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      key: 'dutchit:query-cache',
    })
  )

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister, maxAge: MAX_AGE }}
    >
      <ThemeProvider>
        <TooltipProvider delay={300}>{children}</TooltipProvider>
        <ReactQueryDevtools initialIsOpen={false} />
      </ThemeProvider>
    </PersistQueryClientProvider>
  )
}
