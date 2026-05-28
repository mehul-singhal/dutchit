'use client'

import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { startOfMonth, endOfMonth } from 'date-fns'
import { TrendingUp, TrendingDown, PiggyBank } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatINR } from '@/lib/utils/formatters'
import { CountUp } from '@/components/animations/count-up'
import { cn } from '@/lib/utils'

interface Props {
  userId: string
  month: Date
}

export function FinanceOverview({ userId, month }: Props) {
  const supabase = createClient()
  const monthStart = startOfMonth(month).toISOString().split('T')[0]
  const monthEnd = endOfMonth(month).toISOString().split('T')[0]

  const { data: summary, isLoading } = useQuery({
    queryKey: ['finance-overview', userId, monthStart],
    queryFn: async () => {
      const [incomeRes, savingsRes, expensesRes] = await Promise.all([
        supabase
          .from('personal_income')
          .select('amount')
          .eq('user_id', userId)
          .eq('month', month.getMonth() + 1)
          .eq('year', month.getFullYear()),
        supabase
          .from('personal_savings')
          .select('amount')
          .eq('user_id', userId)
          .gte('date', monthStart)
          .lte('date', monthEnd),
        supabase
          .from('personal_expenses')
          .select('amount, paid_from')
          .eq('user_id', userId)
          .gte('date', monthStart)
          .lte('date', monthEnd),
      ])

      const totalIncome = (incomeRes.data ?? []).reduce((s, r) => s + r.amount, 0)
      const totalSavings = (savingsRes.data ?? []).reduce((s, r) => s + r.amount, 0)
      const expenses = expensesRes.data ?? []
      const totalExpenses = expenses.reduce((s, r) => s + r.amount, 0)
      const expensesFromIncome = expenses.filter(e => e.paid_from === 'income').reduce((s, r) => s + r.amount, 0)
      const expensesFromSavings = expenses.filter(e => e.paid_from === 'savings').reduce((s, r) => s + r.amount, 0)
      const freeCash = totalIncome - totalExpenses - totalSavings
      const savingsRate = totalIncome > 0 ? (totalSavings / totalIncome) * 100 : 0

      return { totalIncome, totalSavings, totalExpenses, expensesFromIncome, expensesFromSavings, freeCash, savingsRate }
    },
  })

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => <div key={i} className="h-24 glass rounded-2xl skeleton-shimmer" />)}
      </div>
    )
  }

  const s = summary ?? { totalIncome: 0, totalSavings: 0, totalExpenses: 0, expensesFromIncome: 0, expensesFromSavings: 0, freeCash: 0, savingsRate: 0 }
  const hasIncome = s.totalIncome > 0

  const savingsRateColor =
    s.savingsRate >= 20 ? 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' :
    s.savingsRate >= 5  ? 'text-amber-400 bg-amber-400/10 border-amber-400/20' :
    hasIncome           ? 'text-rose-400 bg-rose-400/10 border-rose-400/20' :
    'text-muted-foreground bg-white/5 border-white/10'

  // Cash flow bar segments (as % of totalIncome)
  const barTotal = s.totalIncome
  const expPct    = barTotal > 0 ? Math.min((s.totalExpenses / barTotal) * 100, 100) : 0
  const savPct    = barTotal > 0 ? Math.min((s.totalSavings / barTotal) * 100, 100 - expPct) : 0
  const freePct   = Math.max(100 - expPct - savPct, 0)

  return (
    <div className="space-y-4">
      {/* 3 stat cards */}
      <div className="grid grid-cols-3 gap-3">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-2xl p-4">
          <div className="w-8 h-8 rounded-xl bg-emerald-400/15 flex items-center justify-center mb-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-lg font-bold text-emerald-400">₹<CountUp to={s.totalIncome} /></p>
          <p className="text-xs text-muted-foreground mt-0.5">Income</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="glass rounded-2xl p-4">
          <div className="w-8 h-8 rounded-xl bg-rose-400/15 flex items-center justify-center mb-2">
            <TrendingDown className="w-4 h-4 text-rose-400" />
          </div>
          <p className="text-lg font-bold text-rose-400">₹<CountUp to={s.totalExpenses} /></p>
          <p className="text-xs text-muted-foreground mt-0.5">Expenses</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass rounded-2xl p-4">
          <div className="w-8 h-8 rounded-xl bg-indigo-400/15 flex items-center justify-center mb-2">
            <PiggyBank className="w-4 h-4 text-indigo-400" />
          </div>
          <p className="text-lg font-bold text-indigo-400">₹<CountUp to={s.totalSavings} /></p>
          <p className="text-xs text-muted-foreground mt-0.5">Savings</p>
        </motion.div>
      </div>

      {/* Free cash + savings rate */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="glass rounded-2xl p-5 text-center">
        {hasIncome ? (
          <>
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Free Cash</p>
            <p className={cn('text-3xl font-black mb-3', s.freeCash >= 0 ? 'text-emerald-400' : 'text-rose-400')}>
              {s.freeCash < 0 ? '-' : ''}₹<CountUp to={Math.abs(s.freeCash)} />
            </p>
            <span className={cn('inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full border', savingsRateColor)}>
              <PiggyBank className="w-3 h-3" />
              Savings rate: {s.savingsRate.toFixed(1)}%
            </span>
          </>
        ) : (
          <div>
            <p className="text-2xl mb-2">📊</p>
            <p className="text-sm font-medium">Log income to see your cash flow</p>
            <p className="text-xs text-muted-foreground mt-1">Switch to the Income tab to add your earnings</p>
          </div>
        )}
      </motion.div>

      {/* Cash flow bar */}
      {hasIncome && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass rounded-2xl p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-3">Cash Flow</p>
          <div className="h-4 rounded-full overflow-hidden flex bg-white/5">
            {expPct > 0 && (
              <motion.div
                className="bg-rose-400 h-full"
                initial={{ width: 0 }}
                animate={{ width: `${expPct}%` }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
              />
            )}
            {savPct > 0 && (
              <motion.div
                className="bg-indigo-400 h-full"
                initial={{ width: 0 }}
                animate={{ width: `${savPct}%` }}
                transition={{ duration: 0.6, ease: 'easeOut', delay: 0.1 }}
              />
            )}
            {freePct > 0 && (
              <motion.div
                className="bg-emerald-400/50 h-full"
                initial={{ width: 0 }}
                animate={{ width: `${freePct}%` }}
                transition={{ duration: 0.6, ease: 'easeOut', delay: 0.2 }}
              />
            )}
          </div>
          <div className="flex flex-wrap gap-3 mt-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <div className="w-2.5 h-2.5 rounded-full bg-rose-400" /> Expenses {expPct.toFixed(0)}%
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <div className="w-2.5 h-2.5 rounded-full bg-indigo-400" /> Savings {savPct.toFixed(0)}%
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400/70" /> Free {freePct.toFixed(0)}%
            </div>
          </div>
        </motion.div>
      )}

      {/* Paid-from breakdown */}
      {(s.expensesFromIncome > 0 || s.expensesFromSavings > 0) && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="glass rounded-2xl p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-3">Expenses by Source</p>
          <div className="grid grid-cols-3 gap-2">
            <div className="glass rounded-xl p-3 text-center">
              <p className="text-base mb-1">💼</p>
              <p className="text-sm font-semibold text-emerald-400">{formatINR(s.expensesFromIncome)}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">From Income</p>
            </div>
            <div className="glass rounded-xl p-3 text-center">
              <p className="text-base mb-1">🐷</p>
              <p className="text-sm font-semibold text-indigo-400">{formatINR(s.expensesFromSavings)}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">From Savings</p>
            </div>
            <div className="glass rounded-xl p-3 text-center">
              <p className="text-base mb-1">❓</p>
              <p className="text-sm font-semibold text-muted-foreground">{formatINR(s.totalExpenses - s.expensesFromIncome - s.expensesFromSavings)}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Untagged</p>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  )
}
