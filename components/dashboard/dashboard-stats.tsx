'use client'

import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { TrendingDown, TrendingUp, Users, Receipt } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatINR } from '@/lib/utils/formatters'
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

      // Get expenses where user is involved
      const { data: splitsRaw } = await supabase
        .from('expense_splits')
        .select('amount, expense_id, expenses(paid_by, amount)')
        .eq('user_id', userId)

      const splits = splitsRaw as Array<{
        amount: number
        expense_id: string
        expenses: { paid_by: string; amount: number } | null
      }> | null

      let totalOwed = 0 // others owe you
      let totalOwe = 0  // you owe others

      for (const split of splits ?? []) {
        const expense = split.expenses
        if (!expense) continue
        if (expense.paid_by === userId) {
          // You paid — others owe you (your split back to yourself)
          totalOwed += expense.amount - split.amount
        } else {
          // Someone else paid — you owe them
          totalOwe += split.amount
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

      // Total expenses this month
      const now = new Date()
      const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
      const { data: monthExpenses } = await supabase
        .from('expenses')
        .select('amount')
        .in('group_id', groupIds)
        .gte('created_at', firstOfMonth)

      const monthTotal = monthExpenses?.reduce((s, e) => s + e.amount, 0) ?? 0

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
                  ₹<CountUp to={card.value} decimals={0} />
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
