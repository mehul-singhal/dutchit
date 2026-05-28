'use client'

import { useEffect, useState, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { RefreshCw, CheckCircle2 } from 'lucide-react'
import { MutationQueue } from '@/lib/mutation-queue'
import { replayMutation } from '@/lib/mutation-replay'

type SyncState = 'idle' | 'syncing' | 'done'

export function OnlineSync() {
  const [pending, setPending] = useState(0)
  const [syncState, setSyncState] = useState<SyncState>('idle')
  const queryClient = useQueryClient()

  // Keep pending count in sync with the queue
  function refreshCount() {
    setPending(MutationQueue.count())
  }

  const drainQueue = useCallback(async () => {
    const queue = MutationQueue.getAll()
    if (!queue.length) return

    setSyncState('syncing')
    let anySuccess = false

    for (const mutation of queue) {
      try {
        await replayMutation(mutation)
        MutationQueue.remove(mutation.id)
        anySuccess = true
      } catch {
        // Discard silently on failure
        MutationQueue.remove(mutation.id)
      }
    }

    refreshCount()
    setSyncState('done')

    if (anySuccess) {
      // Invalidate all queries so UI reflects synced data
      queryClient.invalidateQueries()
    }

    // Reset banner after 2.5 seconds
    setTimeout(() => setSyncState('idle'), 2500)
  }, [queryClient])

  useEffect(() => {
    refreshCount()

    function handleOnline() {
      refreshCount()
      drainQueue()
    }

    // Drain on mount too — in case app was reopened while online with queue items
    if (navigator.onLine && MutationQueue.count() > 0) {
      drainQueue()
    }

    window.addEventListener('online', handleOnline)
    return () => window.removeEventListener('online', handleOnline)
  }, [drainQueue])

  const visible = (pending > 0 && syncState === 'idle') || syncState === 'syncing' || syncState === 'done'

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 60, opacity: 0 }}
          transition={{ duration: 0.25, ease: [0.25, 0.4, 0.25, 1] }}
          className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[90] md:bottom-6"
        >
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-full glass-strong border border-white/10 shadow-xl text-sm font-medium">
            {syncState === 'done' ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="text-emerald-400">All synced</span>
              </>
            ) : syncState === 'syncing' ? (
              <>
                <RefreshCw className="w-4 h-4 text-primary shrink-0 animate-spin" />
                <span className="text-primary">Syncing changes...</span>
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="text-amber-400">
                  {pending} pending change{pending !== 1 ? 's' : ''}
                </span>
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
