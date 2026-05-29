'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { ArrowRight, TrendingUp, TrendingDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { createClient } from '@/lib/supabase/client'
import { calculateBalances, simplifyDebts } from '@/lib/utils/debt-simplifier'
import { formatCurrency, getCurrency } from '@/lib/utils/currency'
import { getInitials } from '@/lib/utils/formatters'
import { UpiPaymentSheet } from '@/components/settlements/upi-payment-sheet'
import { SettlementInfoSheet } from '@/components/settlements/settlement-info-sheet'
import type { UserProfile, DebtSimplification } from '@/types/database'

interface Props {
  groupId: string
  userId: string
  baseCurrency?: string
  settlementCurrency?: string
}

export function GroupBalanceSummary({ groupId, userId, baseCurrency = 'INR', settlementCurrency = 'INR' }: Props) {
  const [payingDebt, setPayingDebt] = useState<DebtSimplification | null>(null)
  const [settlingDebt, setSettlingDebt] = useState<DebtSimplification | null>(null)
  const supabase = createClient()
  const fmt = (n: number) => formatCurrency(n, baseCurrency)

  const { data, isLoading } = useQuery({
    queryKey: ['group-balance-summary', groupId],
    queryFn: async () => {
      const { data: expensesRaw } = await supabase
        .from('expenses')
        .select('id, paid_by, amount, expense_splits(user_id, amount)')
        .eq('group_id', groupId)

      const expenses = expensesRaw as Array<{
        id: string
        paid_by: string
        amount: number
        expense_splits: Array<{ user_id: string; amount: number }>
      }> | null

      const { data: settlements } = await supabase
        .from('settlements')
        .select('paid_by, paid_to, amount')
        .eq('group_id', groupId)
        .eq('status', 'confirmed')

      const { data: membersRaw } = await supabase
        .from('group_members')
        .select('user_id, users(*)')
        .eq('group_id', groupId)

      const members = membersRaw as Array<{ user_id: string; users: UserProfile | null }> | null

      const userMap: Record<string, UserProfile> = {}
      for (const m of members ?? []) {
        if (m.users) userMap[m.user_id] = m.users as UserProfile
      }

      const expenseData = (expenses ?? []).map((e) => ({
        paid_by: e.paid_by,
        splits: e.expense_splits.map((s) => ({ user_id: s.user_id, amount: s.amount })),
      }))

      const balanceMap = calculateBalances(expenseData)
      for (const s of settlements ?? []) {
        balanceMap[s.paid_by] = (balanceMap[s.paid_by] ?? 0) + s.amount
        balanceMap[s.paid_to] = (balanceMap[s.paid_to] ?? 0) - s.amount
      }
      // Re-round after settlement adjustments
      for (const key of Object.keys(balanceMap)) {
        balanceMap[key] = Math.round(balanceMap[key] * 100) / 100
      }

      const debts = simplifyDebts(balanceMap, userMap)
      const myBalance = balanceMap[userId] ?? 0

      return { myBalance, debts, userMap }
    },
  })

  if (isLoading) {
    return (
      <div className="mb-6 space-y-2">
        <div className="h-20 glass rounded-2xl skeleton-shimmer" />
        <div className="h-14 glass rounded-xl skeleton-shimmer" />
      </div>
    )
  }

  const { myBalance = 0, debts = [] } = data ?? {}
  const myDebts = debts.filter((d) => d.from === userId || d.to === userId)

  return (
    <div className="mb-6 space-y-2">
      {/* Net balance card */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className={`glass rounded-2xl p-4 border flex items-center gap-4 ${
          myBalance > 0 ? 'border-emerald-400/20' : myBalance < 0 ? 'border-rose-400/20' : 'border-white/8'
        }`}
      >
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
          myBalance > 0 ? 'bg-emerald-400/10' : myBalance < 0 ? 'bg-rose-400/10' : 'bg-white/5'
        }`}>
          {myBalance > 0
            ? <TrendingUp className="w-5 h-5 text-emerald-400" />
            : myBalance < 0
            ? <TrendingDown className="w-5 h-5 text-rose-400" />
            : <span className="text-lg">🎉</span>}
        </div>
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Your net balance</p>
          {myBalance === 0 ? (
            <p className="text-lg font-bold text-muted-foreground">All settled up!</p>
          ) : (
            <>
              <p className={`text-2xl font-bold ${myBalance > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {myBalance > 0 ? '+' : ''}{fmt(myBalance)}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {myBalance > 0 ? 'Others owe you' : 'You owe in total'}
              </p>
            </>
          )}
        </div>
      </motion.div>

      {/* Your specific debt rows */}
      {myDebts.map((debt, i) => {
        const isMe = debt.from === userId
        const other = isMe ? debt.toUser : debt.fromUser
        return (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.04 }}
            className="glass rounded-xl p-3 flex items-center gap-3"
          >
            <Avatar className="w-8 h-8 shrink-0">
              <AvatarImage src={other?.avatar_url ?? undefined} />
              <AvatarFallback className="bg-primary/20 text-primary text-xs font-semibold">
                {getInitials(other?.full_name ?? '?')}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1 text-sm">
                <span className={`font-medium ${isMe ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {isMe ? 'You' : other?.full_name ?? 'Someone'}
                </span>
                <ArrowRight className="w-3 h-3 text-muted-foreground shrink-0" />
                <span className="font-medium truncate">
                  {isMe ? (other?.full_name ?? 'Someone') : 'You'}
                </span>
              </div>
              <p className={`text-base font-bold ${isMe ? 'text-rose-400' : 'text-emerald-400'}`}>
                {fmt(debt.amount)}
              </p>
            </div>
            {isMe && (
              baseCurrency === 'INR' && settlementCurrency === 'INR' ? (
                <Button size="sm" className="gradient-teal text-[#0a0f1e] font-semibold shrink-0" onClick={() => setPayingDebt(debt)}>
                  Pay Now
                </Button>
              ) : settlementCurrency !== baseCurrency && settlementCurrency === 'INR' ? (
                <Button size="sm" className="gradient-teal text-[#0a0f1e] font-semibold shrink-0" onClick={() => setSettlingDebt(debt)}>
                  Settle in {getCurrency(settlementCurrency).symbol}
                </Button>
              ) : (
                <span className="text-xs text-muted-foreground shrink-0">Settle manually</span>
              )
            )}
          </motion.div>
        )
      })}

      {payingDebt && (
        <UpiPaymentSheet
          debt={payingDebt}
          groupId={groupId}
          baseCurrency={baseCurrency}
          open={!!payingDebt}
          onOpenChange={(open) => !open && setPayingDebt(null)}
        />
      )}

      {settlingDebt && (
        <SettlementInfoSheet
          debt={settlingDebt}
          groupId={groupId}
          baseCurrency={baseCurrency}
          settlementCurrency={settlementCurrency}
          open={!!settlingDebt}
          onOpenChange={(open) => !open && setSettlingDebt(null)}
          onSettled={() => setSettlingDebt(null)}
        />
      )}
    </div>
  )
}
