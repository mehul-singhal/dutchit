'use client'

import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { TrendingDown, TrendingUp, Users, Receipt } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, getCurrency } from '@/lib/utils/currency'
import { CountUp } from '@/components/animations/count-up'

interface Props {
  userId: string
}

export function DashboardStats({ userId }: Props) {
  const supabase = createClient()

  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats', userId],
    queryFn: async () => {
      // Get all group memberships
      const { data: memberships } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', userId)

      const groupIds = memberships?.map((m) => m.group_id) ?? []

      // Get expenses where user is involved — join from expenses side to get all splits
      const { data: expensesRaw } = await supabase
        .from('expenses')
        .select('id, paid_by, inr_amount, amount, expense_splits(user_id, amount)')
        .in('group_id', groupIds)

      const userExpenses = expensesRaw as Array<{
        id: string
        paid_by: string
        inr_amount: number | null
        amount: number
        expense_splits: Array<{ user_id: string; amount: number }>
      }> | null

      let totalOwed = 0 // others owe you (in INR)
      let totalOwe = 0  // you owe others (in INR)

      for (const expense of userExpenses ?? []) {
        const mySplit = expense.expense_splits.find((s) => s.user_id === userId)
        if (!mySplit) continue // user not involved in this expense

        // inr_amount = total in the group's base currency (= INR for INR groups,
        // = EUR/USD/etc for non-INR groups, but it's the stored "base" total).
        // Splits are also stored in that same base currency, so the proportion is correct.
        // We treat inr_amount as the authoritative INR-equivalent total.
        const expenseTotal = expense.inr_amount ?? expense.amount
        const splitsTotal = expense.expense_splits.reduce((s, x) => s + x.amount, 0)
        const scale = splitsTotal > 0 ? expenseTotal / splitsTotal : 1
        const myShareInr = mySplit.amount * scale

        if (expense.paid_by === userId) {
          totalOwed += expenseTotal - myShareInr
        } else {
          totalOwe += myShareInr
        }
      }

      // Adjust for confirmed settlements
      const { data: paidSettlements } = await supabase
        .from('settlements')
        .select('amount')
        .eq('paid_by', userId)
        .eq('status', 'confirmed')

      const { data: receivedSettlements } = await supabase
        .from('settlements')
        .select('amount')
        .eq('paid_to', userId)
        .eq('status', 'confirmed')

      const totalPaidOut = paidSettlements?.reduce((s, p) => s + p.amount, 0) ?? 0
      const totalReceived = receivedSettlements?.reduce((s, p) => s + p.amount, 0) ?? 0

      totalOwe = Math.max(0, totalOwe - totalPaidOut)
      totalOwed = Math.max(0, totalOwed - totalReceived)

      // Total expenses this month (in INR equivalent)
      const now = new Date()
      const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
      const { data: monthExpenses } = await supabase
        .from('expenses')
        .select('amount, inr_amount')
        .in('group_id', groupIds)
        .gte('created_at', firstOfMonth)

      const monthTotal = monthExpenses?.reduce((s, e) => s + (e.inr_amount ?? e.amount), 0) ?? 0

      return {
        totalOwed: Math.round(totalOwed * 100) / 100,
        totalOwe: Math.round(totalOwe * 100) / 100,
        groupCount: groupIds.length,
        monthTotal,
      }
    },
  })

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-28 glass rounded-2xl skeleton-shimmer" />
        ))}
      </div>
    )
  }

  const cards = [
    {
      label: "You're owed",
      value: stats?.totalOwed ?? 0,
      icon: TrendingUp,
      color: 'text-emerald-400',
      bg: 'bg-emerald-400/10',
      border: 'border-emerald-400/20',
      positive: true,
    },
    {
      label: 'You owe',
      value: stats?.totalOwe ?? 0,
      icon: TrendingDown,
      color: 'text-rose-400',
      bg: 'bg-rose-400/10',
      border: 'border-rose-400/20',
      positive: false,
    },
    {
      label: 'Groups',
      value: stats?.groupCount ?? 0,
      icon: Users,
      color: 'text-indigo-400',
      bg: 'bg-indigo-400/10',
      border: 'border-indigo-400/20',
      isCurrency: false,
    },
    {
      label: 'This month',
      value: stats?.monthTotal ?? 0,
      icon: Receipt,
      color: 'text-amber-400',
      bg: 'bg-amber-400/10',
      border: 'border-amber-400/20',
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-3">
      {cards.map((card, i) => {
        const Icon = card.icon
        return (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            className={`glass rounded-2xl p-4 border ${card.border}`}
          >
            <div className={`w-9 h-9 rounded-xl ${card.bg} flex items-center justify-center mb-3`}>
              <Icon className={`w-4.5 h-4.5 ${card.color}`} />
            </div>
            <div className={`text-xl font-bold ${card.color}`}>
              {card.isCurrency === false ? (
                <CountUp to={card.value} />
              ) : (
                <span>
                  {getCurrency('INR').symbol}<CountUp to={card.value} decimals={0} />
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">{card.label}</p>
          </motion.div>
        )
      })}
    </div>
  )
}
