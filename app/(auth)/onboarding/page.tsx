'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { OnboardingStep1 } from '@/components/onboarding/onboarding-step1'
import { OnboardingStep2 } from '@/components/onboarding/onboarding-step2'
import { OnboardingStep3 } from '@/components/onboarding/onboarding-step3'
import { AuthBackground } from '@/components/layout/auth-background'
import { DutchItLogo } from '@/components/layout/dutchit-logo'

export default function OnboardingPage() {
  const [step, setStep] = useState(1)
  const [userData, setUserData] = useState({ fullName: '', avatarUrl: '', upiId: '' })
  const router = useRouter()
  const supabase = createClient()

  async function handleStep1Complete(data: { fullName: string; avatarUrl: string }) {
    setUserData((prev) => ({ ...prev, ...data }))
    setStep(2)
  }

  async function handleStep2Complete(data: { upiId: string }) {
    const fullName = userData.fullName
    const avatarUrl = userData.avatarUrl
    setUserData((prev) => ({ ...prev, ...data }))

    // Save to DB — capture fullName/avatarUrl before state update
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase.from('users').upsert({
      id: user.id,
      full_name: fullName,
      avatar_url: avatarUrl || null,
      upi_id: data.upiId || null,
      onboarding_complete: true,
    })

    if (error) {
      toast.error('Failed to save profile. Please try again.')
      return
    }

    setStep(3)
  }

  async function handleFinish() {
    router.push('/dashboard')
  }

  const steps = [
    { num: 1, label: 'Your name' },
    { num: 2, label: 'UPI ID' },
    { num: 3, label: 'Ready!' },
  ]

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden px-4">
      <AuthBackground />

      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <DutchItLogo size="md" />
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {steps.map((s, i) => (
            <div key={s.num} className="flex items-center gap-2">
              <div className="flex flex-col items-center gap-1">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300 ${
                    step > s.num
                      ? 'bg-primary text-[#0a0f1e]'
                      : step === s.num
                      ? 'bg-primary text-[#0a0f1e] glow-teal-sm'
                      : 'bg-white/10 text-muted-foreground'
                  }`}
                >
                  {step > s.num ? '✓' : s.num}
                </div>
                <span className={`text-[10px] ${step === s.num ? 'text-primary' : 'text-muted-foreground'}`}>
                  {s.label}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div
                  className={`h-px w-10 mb-4 transition-all duration-500 ${
                    step > s.num ? 'bg-primary' : 'bg-white/10'
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step content */}
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.3 }}
            >
              <OnboardingStep1 onComplete={handleStep1Complete} />
            </motion.div>
          )}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.3 }}
            >
              <OnboardingStep2 onComplete={handleStep2Complete} onSkip={() => handleStep2Complete({ upiId: '' })} />
            </motion.div>
          )}
          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.3 }}
            >
              <OnboardingStep3 name={userData.fullName} onFinish={handleFinish} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
