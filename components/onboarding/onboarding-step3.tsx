'use client'

import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import confetti from 'canvas-confetti'
import { ArrowRight, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  name: string
  onFinish: () => void
}

export function OnboardingStep3({ name, onFinish }: Props) {
  const hasRun = useRef(false)

  useEffect(() => {
    if (hasRun.current) return
    hasRun.current = true

    // Confetti burst!
    setTimeout(() => {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#00d4aa', '#6366f1', '#f43f5e', '#f59e0b'],
      })
    }, 400)
  }, [])

  return (
    <div className="glass rounded-2xl p-8 shadow-2xl text-center">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 12, delay: 0.2 }}
        className="w-20 h-20 rounded-full gradient-teal flex items-center justify-center mx-auto mb-6 glow-teal"
      >
        <Sparkles className="w-10 h-10 text-[#0a0f1e]" />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <h2 className="text-3xl font-bold mb-2">
          You&apos;re all set,{' '}
          <span className="text-gradient">{name.split(' ')[0]}!</span>
        </h2>
        <p className="text-muted-foreground mb-2">
          🎉 Welcome to DutchIt!
        </p>
        <p className="text-sm text-muted-foreground mb-8">
          Start by creating a group or adding your first expense. No more awkward money talks — we&apos;ve got you.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="space-y-3"
      >
        <div className="flex gap-4 text-sm text-muted-foreground mb-4">
          {['Track expenses', 'Smart balances', 'Instant UPI'].map((feature, i) => (
            <motion.div
              key={feature}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.6 + i * 0.1 }}
              className="flex items-center gap-1.5 bg-white/5 rounded-full px-3 py-1"
            >
              <span className="text-primary">✓</span> {feature}
            </motion.div>
          ))}
        </div>

        <Button
          onClick={onFinish}
          className="w-full h-12 gradient-teal text-[#0a0f1e] font-semibold text-base glow-teal"
        >
          Go to Dashboard <ArrowRight className="w-5 h-5 ml-1" />
        </Button>
      </motion.div>
    </div>
  )
}
