'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown, ArrowRight, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { createClient } from '@/lib/supabase/client'
import { calculateBalances, simplifyDebts } from '@/lib/utils/debt-simplifier'
import { formatINR, getInitials } from '@/lib/utils/formatters'
import { UpiPaymentSheet } from '@/components/settlements/upi-payment-sheet'
import type { UserProfile, DebtSimplification } from '@/types/database'

interface Props {
  groupId: string
  userId: string
}

export function GroupBalances({ groupId, userId }: Props) {
  const [payingDebt, setPayingDebt] = useState<DebtSimplification | null>(null)
  const supabase = createClient()

  const { data, isLoading } = useQuery({
    queryKey: ['group-balances', groupId],
    queryFn: async () => {
      // Get all expenses with their splits
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

      // Get confirmed settlements to offset
      const { data: settlements } = await supabase
        .from('settlements')
        .select('paid_by, paid_to, amount')
        .eq('group_id', groupId)
        .eq('status', 'confirmed')

      // Get all members with their profiles
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
        splits: (e.expense_splits ?? []).map((s) => ({
          user_id: s.user_id,
          amount: s.amount,
        })),
      }))

      const balanceMap = calculateBalances(expenseData)

      // Adjust for settlements
      for (const s of settlements ?? []) {
        balanceMap[s.paid_by] = (balanceMap[s.paid_by] ?? 0) - s.amount
        balanceMap[s.paid_to] = (balanceMap[s.paid_to] ?? 0) + s.amount
      }

      const debts = simplifyDebts(balanceMap, userMap)

      return { balanceMap, debts, userMap }
    },
  })

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 glass rounded-xl skeleton-shimmer" />
        ))}
      </div>
    )
  }

  const { balanceMap = {}, debts = [], userMap = {} } = data ?? {}
  const myBalance = balanceMap[userId] ?? 0

  // Debts involving the current user
  const myDebts = debts.filter((d) => d.from === userId || d.to === userId)

  return (
    <div className="space-y-6">
      {/* Your net balance */}
      <div className={`glass rounded-2xl p-5 border ${
        myBalance > 0 ? 'border-emerald-400/20' : myBalance < 0 ? 'border-rose-400/20' : 'border-white/8'
      }`}>
        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Your balance</p>
        <div className="flex items-center gap-2">
          {myBalance > 0 ? (
            <TrendingUp className="w-5 h-5 text-emerald-400" />
          ) : myBalance < 0 ? (
            <TrendingDown className="w-5 h-5 text-rose-400" />
          ) : null}
          <span className={`text-3xl font-bold ${
            myBalance > 0 ? 'text-emerald-400' : myBalance < 0 ? 'text-rose-400' : 'text-muted-foreground'
          }`}>
            {myBalance === 0 ? 'All settled up! 🎉' : `${myBalance > 0 ? '+' : ''}${formatINR(myBalance)}`}
          </span>
        </div>
        {myBalance > 0 && <p className="text-xs text-muted-foreground mt-1">Others owe you this amount</p>}
        {myBalance < 0 && <p className="text-xs text-muted-foreground mt-1">You owe this amount in total</p>}
      </div>

      {/* Simplified debts */}
      {debts.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Suggested settlements
          </h3>
          <div className="space-y-2">
            {debts.map((debt, i) => {
              const isMe = debt.from === userId
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="glass rounded-xl p-4 flex items-center gap-4"
                >
                  <UserAvatar user={debt.fromUser} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 text-sm">
                      <span className={`font-medium ${isMe ? 'text-primary' : ''}`}>
                        {isMe ? 'You' : debt.fromUser?.full_name ?? 'Someone'}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="font-medium">
                        {debt.to === userId ? 'You' : debt.toUser?.full_name ?? 'Someone'}
                      </span>
                    </div>
                    <p className={`text-lg font-bold mt-0.5 ${isMe ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {formatINR(debt.amount)}
                    </p>
                  </div>
                  {isMe && (
                    <Button
                      size="sm"
                      className="gradient-teal text-[#0a0f1e] font-semibold shrink-0"
                      onClick={() => setPayingDebt(debt)}
                    >
                      Pay Now
                    </Button>
                  )}
                </motion.div>
              )
            })}
          </div>
        </div>
      )}

      {debts.length === 0 && (
        <div className="text-center py-12">
          <div className="text-4xl mb-3">🎉</div>
          <p className="font-semibold">You&apos;re all square!</p>
          <p className="text-sm text-muted-foreground mt-1">No outstanding balances in this group.</p>
        </div>
      )}

      {/* UPI Payment Sheet */}
      {payingDebt && (
        <UpiPaymentSheet
          debt={payingDebt}
          groupId={groupId}
          open={!!payingDebt}
          onOpenChange={(open) => !open && setPayingDebt(null)}
        />
      )}
    </div>
  )
}

function UserAvatar({ user }: { user?: UserProfile }) {
  return (
    <Avatar className="w-9 h-9 shrink-0">
      <AvatarImage src={user?.avatar_url ?? undefined} />
      <AvatarFallback className="bg-primary/20 text-primary text-xs font-semibold">
        {getInitials(user?.full_name ?? '?')}
      </AvatarFallback>
    </Avatar>
  )
}
