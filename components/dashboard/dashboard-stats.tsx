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
        .select('id, paid_by, true_inr_amount, inr_amount, amount, expense_splits(user_id, amount)')
        .in('group_id', groupIds)

      const userExpenses = expensesRaw as Array<{
        id: string
        paid_by: string
        true_inr_amount: number | null
        inr_amount: number | null
        amount: number
        expense_splits: Array<{ user_id: string; amount: number }>
      }> | null

      let totalOwed = 0 // others owe you (in INR)
      let totalOwe = 0  // you owe others (in INR)

      for (const expense of userExpenses ?? []) {
        const mySplit = expense.expense_splits.find((s) => s.user_id === userId)
        if (!mySplit) continue // user not involved in this expense

        // true_inr_amount = original currency converted to INR (e.g. $1888 → ₹157k)
        // Falls back to inr_amount (= group base currency total) for old rows without true_inr_amount
        const expenseTotalInr = expense.true_inr_amount ?? expense.inr_amount ?? expense.amount
        const splitsTotal = expense.expense_splits.reduce((s, x) => s + x.amount, 0)
        // Derive each person's INR share proportionally from the true INR total
        const scale = splitsTotal > 0 ? expenseTotalInr / splitsTotal : 1
        const myShareInr = mySplit.amount * scale

        if (expense.paid_by === userId) {
          totalOwed += expenseTotalInr - myShareInr
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

      // Total expenses this month — user's own share only (in INR)
      const now = new Date()
      const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
      const { data: monthExpensesRaw } = await supabase
        .from('expenses')
        .select('amount, inr_amount, true_inr_amount, expense_splits(user_id, amount)')
        .in('group_id', groupIds)
        .gte('created_at', firstOfMonth)

      const monthExpenses = monthExpensesRaw as Array<{
        amount: number
        inr_amount: number | null
        true_inr_amount: number | null
        expense_splits: Array<{ user_id: string; amount: number }>
      }> | null

      let monthTotal = 0
      for (const e of monthExpenses ?? []) {
        const mySplit = e.expense_splits.find((s) => s.user_id === userId)
        if (!mySplit) continue
        const expenseTotalInr = e.true_inr_amount ?? e.inr_amount ?? e.amount
        const splitsTotal = e.expense_splits.reduce((s, x) => s + x.amount, 0)
        const scale = splitsTotal > 0 ? expenseTotalInr / splitsTotal : 1
        monthTotal += mySplit.amount * scale
      }

      return {
        net: Math.round((totalOwed - totalOwe) * 100) / 100,
        groupCount: groupIds.length,
        monthTotal: Math.round(monthTotal * 100) / 100,
      }
    },
  })

  if (isLoading) {
    return (
      <div className="grid grid-cols-3 gap-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-28 glass rounded-2xl skeleton-shimmer" />
        ))}
      </div>
    )
  }

  const net = stats?.net ?? 0
  const cards = [
    {
      label: net > 0 ? "You're owed" : net < 0 ? 'You owe' : 'All settled',
      sublabel: 'Net across all groups',
      value: Math.abs(net),
      icon: net >= 0 ? TrendingUp : TrendingDown,
      color: net > 0 ? 'text-emerald-400' : net < 0 ? 'text-rose-400' : 'text-muted-foreground',
      bg: net > 0 ? 'bg-emerald-400/10' : net < 0 ? 'bg-rose-400/10' : 'bg-white/5',
      border: net > 0 ? 'border-emerald-400/20' : net < 0 ? 'border-rose-400/20' : 'border-white/10',
      prefix: net > 0 ? '+' : net < 0 ? '-' : '',
    },
    {
      label: 'Groups',
      sublabel: 'you are part of',
      value: stats?.groupCount ?? 0,
      icon: Users,
      color: 'text-indigo-400',
      bg: 'bg-indigo-400/10',
      border: 'border-indigo-400/20',
      isCurrency: false,
    },
    {
      label: 'My spend',
      sublabel: `your share · ${new Date().toLocaleString('en-IN', { month: 'long' })}`,
      value: stats?.monthTotal ?? 0,
      icon: Receipt,
      color: 'text-amber-400',
      bg: 'bg-amber-400/10',
      border: 'border-amber-400/20',
    },
  ]

  return (
    <div className="grid grid-cols-3 gap-3">
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
              ) : net === 0 && i === 0 ? (
                <span className="text-sm font-semibold text-muted-foreground">🎉 All clear</span>
              ) : (
                <span>
                  {'prefix' in card && card.prefix}{getCurrency('INR').symbol}<CountUp to={card.value} decimals={0} />
                </span>
              )}
            </div>
            <p className="text-xs font-medium mt-0.5">{card.label}</p>
            {'sublabel' in card && card.sublabel && (
              <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{card.sublabel}</p>
            )}
          </motion.div>
        )
      })}
    </div>
  )
}
