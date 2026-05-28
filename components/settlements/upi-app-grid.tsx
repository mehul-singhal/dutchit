'use client'

import { motion } from 'framer-motion'
import { getUpiAppFromId } from '@/lib/utils/upi'
import type { UpiApp } from '@/types/database'
import { cn } from '@/lib/utils'

interface Props {
  upiId: string
  onAppClick: (app: UpiApp) => void
}

const UPI_APPS: {
  app: UpiApp
  name: string
  color: string
  bg: string
  emoji: string
}[] = [
  { app: 'gpay', name: 'GPay', color: '#4285F4', bg: '#4285F420', emoji: '🔵' },
  { app: 'phonepe', name: 'PhonePe', color: '#5F259F', bg: '#5F259F20', emoji: '🟣' },
  { app: 'paytm', name: 'Paytm', color: '#00BAF2', bg: '#00BAF220', emoji: '🔷' },
  { app: 'bhim', name: 'BHIM', color: '#FF6B00', bg: '#FF6B0020', emoji: '🟠' },
]

export function UpiAppGrid({ upiId, onAppClick }: Props) {
  const detectedApp = getUpiAppFromId(upiId)

  return (
    <div className="grid grid-cols-4 gap-3">
      {UPI_APPS.map((app, i) => {
        const isDetected = detectedApp === app.app
        return (
          <motion.button
            key={app.app}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.07 }}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.95 }}
            type="button"
            onClick={() => onAppClick(app.app)}
            className={cn(
              'flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all',
              isDetected
                ? 'border-2 shadow-lg'
                : 'border-white/10 bg-white/5 hover:bg-white/10'
            )}
            style={{
              borderColor: isDetected ? app.color : undefined,
              background: isDetected ? app.bg : undefined,
              boxShadow: isDetected ? `0 0 16px ${app.color}40` : undefined,
            }}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
              style={{ background: app.bg }}
            >
              {app.emoji}
            </div>
            <span className="text-xs font-medium text-foreground">{app.name}</span>
            {isDetected && (
              <span className="text-[9px] text-muted-foreground">Detected</span>
            )}
          </motion.button>
        )
      })}
    </div>
  )
}
