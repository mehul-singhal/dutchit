'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { ArrowRight, Info, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { validateUpiId } from '@/lib/utils/upi'

const schema = z.object({
  upiId: z
    .string()
    .refine((val) => val === '' || validateUpiId(val), 'Invalid UPI ID format (e.g. name@upi)')
    .optional(),
})

type FormData = z.infer<typeof schema>

interface Props {
  onComplete: (data: { upiId: string }) => void
  onSkip: () => void
}

const UPI_APPS = [
  { name: 'GPay', color: '#4285F4', emoji: '🔵', example: '@okicici' },
  { name: 'PhonePe', color: '#5F259F', emoji: '🟣', example: '@ybl' },
  { name: 'Paytm', color: '#00BAF2', emoji: '🔷', example: '@paytm' },
  { name: 'BHIM', color: '#FF6B00', emoji: '🟠', example: '@upi' },
]

export function OnboardingStep2({ onComplete, onSkip }: Props) {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  function onSubmit(data: FormData) {
    onComplete({ upiId: data.upiId ?? '' })
  }

  return (
    <div className="glass rounded-2xl p-8 shadow-2xl">
      <div className="flex items-center gap-2 mb-1">
        <Zap className="w-5 h-5 text-primary" />
        <h2 className="text-2xl font-bold">Your UPI ID?</h2>
      </div>
      <p className="text-muted-foreground text-sm mb-6">
        Friends will use this to pay you back instantly. No need to share your number!
      </p>

      {/* UPI app logos */}
      <div className="flex gap-3 mb-5">
        {UPI_APPS.map((app, i) => (
          <motion.div
            key={app.name}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1 }}
            className="flex flex-col items-center gap-1"
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
              style={{ background: `${app.color}22`, border: `1px solid ${app.color}44` }}
            >
              {app.emoji}
            </div>
            <span className="text-[10px] text-muted-foreground">{app.name}</span>
          </motion.div>
        ))}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="upiId">UPI ID</Label>
          <Input
            id="upiId"
            placeholder="yourname@paytm or 9876543210@ybl"
            className="bg-white/5 border-white/10 h-11"
            {...register('upiId')}
          />
          {errors.upiId && (
            <p className="text-destructive text-xs">{errors.upiId.message}</p>
          )}
        </div>

        <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/10 border border-primary/20">
          <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground">
            Format: <span className="text-foreground font-medium">name@upi</span>,{' '}
            <span className="text-foreground font-medium">number@paytm</span>,{' '}
            <span className="text-foreground font-medium">id@ybl</span>. You can update this anytime from settings.
          </p>
        </div>

        <div className="flex gap-3">
          <Button
            type="button"
            variant="ghost"
            className="flex-1 h-11 text-muted-foreground hover:text-foreground"
            onClick={onSkip}
          >
            Skip for now
          </Button>
          <Button
            type="submit"
            className="flex-1 h-11 gradient-teal text-[#0a0f1e] font-semibold"
            disabled={isSubmitting}
          >
            Continue <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </form>
    </div>
  )
}
