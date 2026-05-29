'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Loader2, CheckCircle, TrendingDown } from 'lucide-react'
import { toast } from 'sonner'
import confetti from 'canvas-confetti'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/utils/currency'
import { getInitials } from '@/lib/utils/formatters'
import type { DebtSimplification } from '@/types/database'

interface Props {
  debt: DebtSimplification
  groupId: string
  baseCurrency: string
  settlementCurrency: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSettled: () => void
}

export function SettlementInfoSheet({
  debt,
  groupId,
  baseCurrency,
  settlementCurrency,
  open,
  onOpenChange,
  onSettled,
}: Props) {
  const [submitting, setSubmitting] = useState(false)
  const supabase = createClient()
  const queryClient = useQueryClient()

  const { data: rateData, isLoading: loadingRate } = useQuery({
    queryKey: ['settlement-rate', groupId],
    queryFn: async () => {
      const { data } = await supabase
        .from('expenses')
        .select('amount, true_inr_amount')
        .eq('group_id', groupId)
        .not('true_inr_amount', 'is', null)
      if (!data || data.length === 0) return null
      const totalBase = data.reduce((s, e) => s + e.amount, 0)
      const totalInr = data.reduce((s, e) => s + (e.true_inr_amount ?? 0), 0)
      if (totalBase === 0) return null
      return { avgRate: totalInr / totalBase, expenseCount: data.length }
    },
    enabled: open,
  })

  const avgRate = rateData?.avgRate ?? null
  const expenseCount = rateData?.expenseCount ?? 0
  const suggestedAmount = avgRate != null ? Math.round(debt.amount * avgRate) : null

  async function handleMarkSettled() {
    if (suggestedAmount == null) return
    setSubmitting(true)
    try {
      const { error } = await supabase.from('settlements').insert({
        group_id: groupId,
        paid_by: debt.from,
        paid_to: debt.to,
        amount: suggestedAmount,
        status: 'confirmed',
      })
      if (error) throw error

      queryClient.invalidateQueries({ queryKey: ['group-balances', groupId] })
      queryClient.invalidateQueries({ queryKey: ['group-balance-summary', groupId] })
      queryClient.invalidateQueries({ queryKey: ['group-activity', groupId] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })

      toast.success('Settled up!')
      confetti({ particleCount: 80, spread: 60, origin: { y: 0.7 }, colors: ['#00d4aa', '#6366f1', '#f59e0b'] })
      onSettled()
      onOpenChange(false)
    } catch {
      toast.error('Failed to record settlement')
    } finally {
      setSubmitting(false)
    }
  }

  const recipient = debt.toUser

  const content = (
    <div className="flex flex-col gap-5">
      {/* Recipient */}
      <div className="flex items-center gap-4">
        <Avatar className="w-14 h-14">
          <AvatarImage src={recipient?.avatar_url ?? undefined} />
          <AvatarFallback className="bg-primary/20 text-primary text-xl font-bold">
            {getInitials(recipient?.full_name ?? '?')}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="text-xs text-muted-foreground">Settling with</p>
          <p className="text-xl font-bold">{recipient?.full_name ?? 'Unknown'}</p>
          <p className="text-2xl font-black text-rose-400 mt-0.5">
            {formatCurrency(debt.amount, baseCurrency)}
          </p>
        </div>
      </div>

      {/* Rate info */}
      {loadingRate ? (
        <div className="glass rounded-xl p-5 flex items-center gap-3 text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Calculating average trip rate…</span>
        </div>
      ) : avgRate != null ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-xl p-5 space-y-3 border border-primary/20"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Avg trip rate</p>
              <p className="text-lg font-bold mt-0.5">
                1 {baseCurrency} = {formatCurrency(avgRate, settlementCurrency)}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Based on {expenseCount} expense{expenseCount !== 1 ? 's' : ''} entered during the trip
              </p>
            </div>
            <TrendingDown className="w-6 h-6 text-primary opacity-50 shrink-0" />
          </div>
          <div className="border-t border-white/10 pt-3">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Suggested payment</p>
            <p className="text-3xl font-black text-primary mt-1">
              {formatCurrency(suggestedAmount!, settlementCurrency)}
            </p>
          </div>
        </motion.div>
      ) : (
        <div className="glass rounded-xl p-5 text-center border border-amber-400/20">
          <p className="text-2xl mb-2">📊</p>
          <p className="font-semibold">No rate data available</p>
          <p className="text-sm text-muted-foreground mt-1">
            Add expenses with original currency amounts to see a suggested rate. Settle manually for now.
          </p>
        </div>
      )}

      {/* Action */}
      <div className="flex gap-3">
        <Button type="button" variant="ghost" className="flex-1" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button
          className="flex-1 gradient-teal text-[#0a0f1e] font-semibold"
          disabled={submitting || suggestedAmount == null}
          onClick={handleMarkSettled}
        >
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : (
            <><CheckCircle className="w-4 h-4 mr-1.5" /> Mark as Settled</>
          )}
        </Button>
      </div>
    </div>
  )

  const isMobile = typeof window !== 'undefined' && /Android|iPhone|iPad/i.test(navigator.userAgent)

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
