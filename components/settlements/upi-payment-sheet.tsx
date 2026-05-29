'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQueryClient } from '@tanstack/react-query'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { toast } from 'sonner'
import confetti from 'canvas-confetti'
import { CheckCircle, XCircle, Loader2, Copy, MessageSquare, ExternalLink } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatINR, getInitials } from '@/lib/utils/formatters'
import { formatCurrency } from '@/lib/utils/currency'
import { buildUpiDeepLink, buildUpiQrString, getUpiAppFromId } from '@/lib/utils/upi'
import { UpiAppGrid } from '@/components/settlements/upi-app-grid'
import { QrCodeDisplay } from '@/components/settlements/qr-code-display'
import type { DebtSimplification, UpiApp } from '@/types/database'

type Step = 'pay' | 'confirm' | 'done'

interface Props {
  debt: DebtSimplification
  groupId: string
  baseCurrency?: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function UpiPaymentSheet({ debt, groupId, baseCurrency = 'INR', open, onOpenChange }: Props) {
  const [step, setStep] = useState<Step>('pay')
  const [selectedApp, setSelectedApp] = useState<UpiApp | null>(null)
  const [upiRef, setUpiRef] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const supabase = createClient()
  const queryClient = useQueryClient()
  const recipient = debt.toUser

  const upiId = recipient?.upi_id
  const hasUpi = !!upiId

  const appNames: Record<UpiApp, string> = {
    gpay: 'GPay',
    phonepe: 'PhonePe',
    paytm: 'Paytm',
    bhim: 'BHIM',
    generic: 'UPI',
  }

  function handleUpiAppClick(app: UpiApp) {
    setSelectedApp(app)
    if (!upiId) return

    const link = buildUpiDeepLink(app, {
      upiId,
      name: recipient?.full_name ?? 'DutchIt User',
      amount: debt.amount,
      note: 'Dutch It! Settlement',
    })

    window.location.href = link

    // Give app time to open, then show confirm step
    setTimeout(() => setStep('confirm'), 1500)
  }

  async function handlePaidConfirm() {
    setSubmitting(true)
    try {
      const { error } = await supabase.from('settlements').insert({
        group_id: groupId,
        paid_by: debt.from,
        paid_to: debt.to,
        amount: debt.amount,
        upi_ref: upiRef || null,
        payment_app: selectedApp ? appNames[selectedApp] : null,
        status: 'pending_confirmation',
      })

      if (error) throw error

      queryClient.invalidateQueries({ queryKey: ['group-balances', groupId] })
      queryClient.invalidateQueries({ queryKey: ['group-balance-summary', groupId] })
      queryClient.invalidateQueries({ queryKey: ['group-activity', groupId] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })

      setStep('done')

      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.7 },
        colors: ['#00d4aa', '#6366f1', '#f59e0b'],
      })
    } catch {
      toast.error('Failed to record settlement')
    } finally {
      setSubmitting(false)
    }
  }

  function copyReminder() {
    const msg = `Hey ${recipient?.full_name?.split(' ')[0] ?? 'there'}! Add your UPI ID on Dutch It! so I can pay you back easily. Join at ${window.location.origin}`
    navigator.clipboard.writeText(msg)
    toast.success('Reminder message copied! Paste it anywhere.')
  }

  function handleMarkAsPaidManually() {
    setStep('confirm')
    setSelectedApp('generic')
  }

  const isMobile = typeof window !== 'undefined' && /Android|iPhone|iPad/i.test(navigator.userAgent)

  const content = (
    <div className="flex flex-col h-full">
      {/* Recipient info */}
      <div className="flex items-center gap-4 mb-6">
        <Avatar className="w-14 h-14">
          <AvatarFallback className="bg-primary/20 text-primary text-xl font-bold">
            {getInitials(recipient?.full_name ?? '?')}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="text-xs text-muted-foreground">Paying</p>
          <p className="text-xl font-bold">{recipient?.full_name ?? 'Unknown'}</p>
          <p className="text-3xl font-black text-primary mt-1">{formatCurrency(debt.amount, baseCurrency)}</p>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {/* Step 1: Pay */}
        {step === 'pay' && (
          <motion.div
            key="pay"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex-1"
          >
            {hasUpi ? (
              <div className="space-y-5">
                {/* UPI ID */}
                <div className="glass rounded-xl p-4">
                  <p className="text-xs text-muted-foreground mb-1">Pay to</p>
                  <p className="text-base font-semibold text-primary">{upiId}</p>
                </div>

                {/* UPI App buttons */}
                <div>
                  <p className="text-sm font-medium mb-3">Tap to open payment app:</p>
                  <UpiAppGrid upiId={upiId} onAppClick={handleUpiAppClick} />
                </div>

                {/* QR Code */}
                <div>
                  <p className="text-sm font-medium mb-3">Or scan QR code:</p>
                  <QrCodeDisplay
                    upiString={buildUpiQrString({
                      upiId,
                      name: recipient?.full_name ?? 'DutchIt User',
                      amount: debt.amount,
                    })}
                  />
                </div>

                <Button
                  variant="outline"
                  className="w-full border-white/10 hover:bg-white/5"
                  onClick={handleMarkAsPaidManually}
                >
                  Mark as paid manually
                </Button>
              </div>
            ) : (
              /* No UPI ID */
              <div className="space-y-4">
                <div className="glass rounded-xl p-5 text-center border border-amber-400/20">
                  <p className="text-2xl mb-2">🔑</p>
                  <p className="font-semibold">{recipient?.full_name?.split(' ')[0] ?? 'They'} hasn&apos;t added their UPI ID yet</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Remind them to add it on DutchIt so you can pay instantly next time.
                  </p>
                </div>
                <Button
                  className="w-full h-11 gap-2 border-white/10 bg-white/5 hover:bg-white/10"
                  variant="outline"
                  onClick={copyReminder}
                >
                  <Copy className="w-4 h-4" />
                  Copy reminder message
                </Button>
                <Button
                  className="w-full h-11 gradient-teal text-[#0a0f1e] font-semibold"
                  onClick={handleMarkAsPaidManually}
                >
                  Mark as paid (cash / other)
                </Button>
              </div>
            )}
          </motion.div>
        )}

        {/* Step 2: Confirm */}
        {step === 'confirm' && (
          <motion.div
            key="confirm"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex-1 space-y-5"
          >
            <div className="glass rounded-xl p-5 text-center">
              <p className="text-lg font-semibold mb-1">Did the payment go through?</p>
              <p className="text-sm text-muted-foreground">
                Confirm to update balances and notify {recipient?.full_name?.split(' ')[0] ?? 'them'}.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label>UPI Reference <span className="text-muted-foreground">(optional)</span></Label>
              <Input
                placeholder="e.g. 123456789012"
                className="bg-white/5 border-white/10"
                value={upiRef}
                onChange={(e) => setUpiRef(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Copy from your UPI app for record-keeping</p>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 border-rose-400/30 text-rose-400 hover:bg-rose-400/10"
                onClick={() => setStep('pay')}
                disabled={submitting}
              >
                <XCircle className="w-4 h-4 mr-1.5" /> Not yet
              </Button>
              <Button
                className="flex-1 gradient-teal text-[#0a0f1e] font-semibold"
                onClick={handlePaidConfirm}
                disabled={submitting}
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <><CheckCircle className="w-4 h-4 mr-1.5" /> Yes, I paid!</>
                )}
              </Button>
            </div>
          </motion.div>
        )}

        {/* Step 3: Done */}
        {step === 'done' && (
          <motion.div
            key="done"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex-1 flex flex-col items-center justify-center text-center gap-4 py-8"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
              className="w-20 h-20 rounded-full gradient-teal flex items-center justify-center glow-teal"
            >
              <CheckCircle className="w-10 h-10 text-[#0a0f1e]" />
            </motion.div>
            <div>
              <h3 className="text-2xl font-bold">Payment recorded! 🎉</h3>
              <p className="text-muted-foreground mt-1 text-sm">
                {recipient?.full_name?.split(' ')[0] ?? 'They'} will confirm once they see it. Balances will update then.
              </p>
            </div>
            <Button
              className="w-full gradient-teal text-[#0a0f1e] font-semibold"
              onClick={() => {
                onOpenChange(false)
                setStep('pay')
                setUpiRef('')
                setSelectedApp(null)
              }}
            >
              Done
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="glass-strong border-t border-white/10 text-foreground h-auto max-h-[90vh] overflow-y-auto rounded-t-3xl">
          <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-6" />
          {content}
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong border-white/10 text-foreground max-w-md">
        {content}
      </DialogContent>
    </Dialog>
  )
}
