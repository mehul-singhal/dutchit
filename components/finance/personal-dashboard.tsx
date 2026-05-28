'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns'
import { Plus, TrendingDown, TrendingUp, PiggyBank, Loader2, Trash2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { createClient } from '@/lib/supabase/client'
import { formatINR, formatMonthYear } from '@/lib/utils/formatters'
import { EXPENSE_CATEGORY_META } from '@/components/expenses/expense-category-meta'
import { SpendingChart } from '@/components/finance/spending-chart'
import { CategoryBreakdown } from '@/components/finance/category-breakdown'
import { BudgetTracker } from '@/components/finance/budget-tracker'
import { IncomeTracker } from '@/components/finance/income-tracker'
import { SavingsTracker } from '@/components/finance/savings-tracker'
import { FinanceOverview } from '@/components/finance/finance-overview'
import { CountUp } from '@/components/animations/count-up'
import type { ExpenseCategory, ExpenseFundingSource } from '@/types/database'
import { cn } from '@/lib/utils'

const expenseSchema = z.object({
  title: z.string().min(1, 'Required'),
  amount: z.string().refine((v) => !isNaN(Number(v)) && Number(v) > 0, 'Enter valid amount'),
  category: z.enum(['food', 'travel', 'accommodation', 'entertainment', 'shopping', 'utilities', 'other'] as const),
  date: z.string(),
  notes: z.string().optional(),
  paid_from: z.enum(['income', 'savings']).optional(),
})

type ExpenseForm = z.infer<typeof expenseSchema>

interface Props {
  userId: string
}

export function PersonalDashboard({ userId }: Props) {
  const [addOpen, setAddOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  const [selectedMonth, setSelectedMonth] = useState(new Date())
  const supabase = createClient()
  const queryClient = useQueryClient()

  const { register, handleSubmit, watch, setValue, reset, formState: { errors, isSubmitting } } = useForm<ExpenseForm>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      category: 'other',
      date: format(new Date(), 'yyyy-MM-dd'),
    },
  })

  const selectedCategory = watch('category')
  const selectedPaidFrom = watch('paid_from')

  const monthStart = startOfMonth(selectedMonth).toISOString().split('T')[0]
  const monthEnd = endOfMonth(selectedMonth).toISOString().split('T')[0]

  const { data: expenses, isLoading } = useQuery({
    queryKey: ['personal-expenses', userId, monthStart],
    queryFn: async () => {
      const { data } = await supabase
        .from('personal_expenses')
        .select('*')
        .eq('user_id', userId)
        .gte('date', monthStart)
        .lte('date', monthEnd)
        .order('date', { ascending: false })
      return data ?? []
    },
  })

  // Monthly totals for stat cards (income + savings)
  const { data: monthlyTotals } = useQuery({
    queryKey: ['monthly-totals', userId, monthStart],
    queryFn: async () => {
      const [incomeRes, savingsRes] = await Promise.all([
        supabase
          .from('personal_income')
          .select('amount')
          .eq('user_id', userId)
          .eq('month', selectedMonth.getMonth() + 1)
          .eq('year', selectedMonth.getFullYear()),
        supabase
          .from('personal_savings')
          .select('amount')
          .eq('user_id', userId)
          .gte('date', monthStart)
          .lte('date', monthEnd),
      ])
      return {
        totalIncome: (incomeRes.data ?? []).reduce((s, r) => s + r.amount, 0),
        totalSavings: (savingsRes.data ?? []).reduce((s, r) => s + r.amount, 0),
      }
    },
  })

  // Last 6 months for chart
  const { data: chartData } = useQuery({
    queryKey: ['personal-chart', userId],
    queryFn: async () => {
      const months = Array.from({ length: 6 }, (_, i) => subMonths(new Date(), 5 - i))
      const results = await Promise.all(
        months.map(async (month) => {
          const start = startOfMonth(month).toISOString().split('T')[0]
          const end = endOfMonth(month).toISOString().split('T')[0]
          const [expRes, incRes] = await Promise.all([
            supabase.from('personal_expenses').select('amount').eq('user_id', userId).gte('date', start).lte('date', end),
            supabase.from('personal_income').select('amount').eq('user_id', userId).eq('month', month.getMonth() + 1).eq('year', month.getFullYear()),
          ])
          const total = (expRes.data ?? []).reduce((s, e) => s + e.amount, 0)
          const income = (incRes.data ?? []).reduce((s, e) => s + e.amount, 0)
          return { month: format(month, 'MMM'), total, income }
        })
      )
      return results
    },
  })

  const deleteExpense = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('personal_expenses').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personal-expenses'] })
      queryClient.invalidateQueries({ queryKey: ['personal-chart'] })
      queryClient.invalidateQueries({ queryKey: ['finance-overview'] })
      toast.success('Expense deleted')
    },
  })

  async function onSubmit(data: ExpenseForm) {
    const { error } = await supabase.from('personal_expenses').insert({
      user_id: userId,
      title: data.title,
      amount: parseFloat(data.amount),
      category: data.category,
      date: data.date,
      notes: data.notes || null,
      paid_from: data.paid_from ?? null,
    })

    if (error) {
      toast.error('Failed to add expense')
      return
    }

    queryClient.invalidateQueries({ queryKey: ['personal-expenses'] })
    queryClient.invalidateQueries({ queryKey: ['personal-chart'] })
    queryClient.invalidateQueries({ queryKey: ['finance-overview'] })
    toast.success('Expense added!')
    reset()
    setAddOpen(false)
  }

  const totalThisMonth = expenses?.reduce((s, e) => s + e.amount, 0) ?? 0
  const totalIncome = monthlyTotals?.totalIncome ?? 0
  const totalSavings = monthlyTotals?.totalSavings ?? 0
  const freeCash = totalIncome - totalThisMonth - totalSavings
  const categories = Object.entries(EXPENSE_CATEGORY_META) as [ExpenseCategory, { label: string; emoji: string }][]

  const categoryTotals = expenses?.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] ?? 0) + e.amount
    return acc
  }, {} as Record<string, number>) ?? {}

  const addButtonLabel =
    activeTab === 'income' ? '+ Income' :
    activeTab === 'savings' ? '+ Savings' :
    '+ Expense'

  function handleAddClick() {
    if (activeTab === 'income' || activeTab === 'savings') {
      // Handled inside child components via their own + buttons
      // This button is only shown for expense-related tabs
    }
    setAddOpen(true)
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">My Finance</h1>
          <p className="text-muted-foreground text-sm mt-1">Track your income, expenses &amp; savings</p>
        </div>
        {activeTab !== 'income' && activeTab !== 'savings' && (
          <Button
            className="gradient-teal text-[#0a0f1e] font-semibold gap-1"
            onClick={() => setAddOpen(true)}
          >
            <Plus className="w-4 h-4" /> Add
          </Button>
        )}
      </div>

      {/* Month selector */}
      <div className="flex gap-2 mb-6 overflow-x-auto scrollbar-hide pb-1">
        {Array.from({ length: 6 }, (_, i) => subMonths(new Date(), 5 - i)).map((month) => {
          const isSelected = format(month, 'yyyy-MM') === format(selectedMonth, 'yyyy-MM')
          return (
            <button
              key={month.toISOString()}
              onClick={() => setSelectedMonth(month)}
              className={cn(
                'shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-all border',
                isSelected
                  ? 'bg-primary text-[#0a0f1e] border-primary'
                  : 'border-white/10 bg-white/5 text-muted-foreground hover:bg-white/10'
              )}
            >
              {format(month, 'MMM yy')}
            </button>
          )
        })}
      </div>

      {/* Stats — 4 cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-2xl p-4">
          <div className="w-8 h-8 rounded-xl bg-emerald-400/15 flex items-center justify-center mb-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-xl font-bold text-emerald-400">₹<CountUp to={totalIncome} /></p>
          <p className="text-xs text-muted-foreground mt-0.5">Income</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.04 }} className="glass rounded-2xl p-4">
          <div className="w-8 h-8 rounded-xl bg-rose-400/15 flex items-center justify-center mb-2">
            <TrendingDown className="w-4 h-4 text-rose-400" />
          </div>
          <p className="text-xl font-bold text-rose-400">₹<CountUp to={totalThisMonth} /></p>
          <p className="text-xs text-muted-foreground mt-0.5">Expenses</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="glass rounded-2xl p-4">
          <div className="w-8 h-8 rounded-xl bg-indigo-400/15 flex items-center justify-center mb-2">
            <PiggyBank className="w-4 h-4 text-indigo-400" />
          </div>
          <p className="text-xl font-bold text-indigo-400">₹<CountUp to={totalSavings} /></p>
          <p className="text-xs text-muted-foreground mt-0.5">Savings</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }} className="glass rounded-2xl p-4">
          <div className="w-8 h-8 rounded-xl bg-primary/15 flex items-center justify-center mb-2">
            <span className="text-sm">💵</span>
          </div>
          <p className={cn('text-xl font-bold', totalIncome === 0 ? 'text-muted-foreground' : freeCash >= 0 ? 'text-primary' : 'text-rose-400')}>
            {freeCash < 0 ? '-' : ''}₹<CountUp to={Math.abs(freeCash)} />
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">Free Cash</p>
        </motion.div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="overflow-x-auto scrollbar-hide mb-6">
          <TabsList className="bg-white/5 border border-white/8 w-max min-w-full">
            {[
              { value: 'overview', label: 'Overview' },
              { value: 'expenses', label: 'Expenses' },
              { value: 'income',   label: 'Income'   },
              { value: 'savings',  label: 'Savings'  },
              { value: 'analytics',label: 'Analytics'},
              { value: 'budget',   label: 'Budgets'  },
            ].map(tab => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="data-[state=active]:bg-primary data-[state=active]:text-[#0a0f1e]"
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value="overview">
          <FinanceOverview userId={userId} month={selectedMonth} />
        </TabsContent>

        <TabsContent value="expenses">
          {isLoading ? (
            <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-14 glass rounded-xl skeleton-shimmer" />)}</div>
          ) : expenses?.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-3">💸</div>
              <p className="font-semibold">No expenses this month</p>
              <p className="text-sm text-muted-foreground mt-1">Either you&apos;re saving a lot, or you forgot to track!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {expenses?.map((expense, i) => {
                const meta = EXPENSE_CATEGORY_META[expense.category as ExpenseCategory]
                return (
                  <motion.div
                    key={expense.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="glass rounded-xl p-3 flex items-center gap-3 group"
                  >
                    <div className="w-9 h-9 rounded-xl bg-white/8 flex items-center justify-center text-lg shrink-0">
                      {meta.emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{expense.title}</p>
                      <p className="text-xs text-muted-foreground">{format(new Date(expense.date), 'MMM d')} · {meta.label}</p>
                    </div>
                    {expense.paid_from && (
                      <span className={cn(
                        'text-[10px] px-1.5 py-0.5 rounded-full shrink-0',
                        expense.paid_from === 'income'
                          ? 'bg-emerald-400/15 text-emerald-400'
                          : 'bg-indigo-400/15 text-indigo-400'
                      )}>
                        {expense.paid_from === 'income' ? '💼' : '🐷'}
                      </span>
                    )}
                    <span className="font-semibold text-sm">{formatINR(expense.amount)}</span>
                    <button
                      onClick={() => deleteExpense.mutate(expense.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-rose-400 transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </motion.div>
                )
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="income">
          <IncomeTracker userId={userId} month={selectedMonth} />
        </TabsContent>

        <TabsContent value="savings">
          <SavingsTracker userId={userId} month={selectedMonth} />
        </TabsContent>

        <TabsContent value="analytics">
          <div className="space-y-6">
            <SpendingChart data={chartData ?? []} />
            <CategoryBreakdown categoryTotals={categoryTotals} total={totalThisMonth} />
          </div>
        </TabsContent>

        <TabsContent value="budget">
          <BudgetTracker userId={userId} categoryTotals={categoryTotals} month={selectedMonth} />
        </TabsContent>
      </Tabs>

      {/* Add expense dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="glass-strong border-white/10 text-foreground max-w-md">
          <DialogHeader>
            <DialogTitle>Add Personal Expense</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1.5">
                <Label>Title</Label>
                <Input placeholder="Coffee, Groceries..." className="bg-white/5 border-white/10" {...register('title')} />
                {errors.title && <p className="text-destructive text-xs">{errors.title.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Amount (₹)</Label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
                  <Input type="number" step="0.01" className="pl-6 bg-white/5 border-white/10" {...register('amount')} />
                </div>
                {errors.amount && <p className="text-destructive text-xs">{errors.amount.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Date</Label>
                <Input type="date" className="bg-white/5 border-white/10" {...register('date')} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Category</Label>
              <div className="grid grid-cols-4 gap-1.5">
                {categories.map(([key, meta]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setValue('category', key)}
                    className={cn(
                      'flex flex-col items-center gap-1 p-2 rounded-xl border text-[10px] transition-all',
                      selectedCategory === key
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-white/10 bg-white/5 text-muted-foreground hover:bg-white/10'
                    )}
                  >
                    <span className="text-base">{meta.emoji}</span>
                    {meta.label.split(' ')[0]}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Paid from <span className="text-muted-foreground font-normal text-xs">(optional)</span></Label>
              <div className="flex gap-2">
                {(['income', 'savings'] as const).map((source) => (
                  <button
                    key={source}
                    type="button"
                    onClick={() => setValue('paid_from', selectedPaidFrom === source ? undefined : source)}
                    className={cn(
                      'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border text-sm transition-all',
                      selectedPaidFrom === source
                        ? source === 'income'
                          ? 'border-emerald-400 bg-emerald-400/10 text-emerald-400'
                          : 'border-indigo-400 bg-indigo-400/10 text-indigo-400'
                        : 'border-white/10 bg-white/5 text-muted-foreground hover:bg-white/10'
                    )}
                  >
                    {source === 'income' ? '💼' : '🐷'} {source === 'income' ? 'Income' : 'Savings'}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <Button type="button" variant="ghost" className="flex-1" onClick={() => setAddOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="flex-1 gradient-teal text-[#0a0f1e] font-semibold" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add Expense'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
