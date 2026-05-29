'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns'
import { Plus, Loader2, Trash2, ChevronDown } from 'lucide-react'
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
import { formatINR } from '@/lib/utils/formatters'
import { SUPPORTED_CURRENCIES, fetchExchangeRate, getCurrency, formatCurrency } from '@/lib/utils/currency'
import { EXPENSE_CATEGORY_META } from '@/components/expenses/expense-category-meta'
import { SpendingChart } from '@/components/finance/spending-chart'
import { CategoryBreakdown } from '@/components/finance/category-breakdown'
import { BudgetTracker } from '@/components/finance/budget-tracker'
import { IncomeTracker } from '@/components/finance/income-tracker'
import { SavingsTracker } from '@/components/finance/savings-tracker'
import { CountUp } from '@/components/animations/count-up'
import type { ExpenseCategory } from '@/types/database'
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
  const [activeTab, setActiveTab] = useState('expenses')
  const [selectedMonth, setSelectedMonth] = useState(new Date())
  const [currency, setCurrency] = useState('INR')
  const [exchangeRate, setExchangeRate] = useState(1)
  const [fetchingRate, setFetchingRate] = useState(false)
  const [currencyOpen, setCurrencyOpen] = useState(false)
  const supabase = createClient()
  const queryClient = useQueryClient()

  const { register, handleSubmit, watch, setValue, reset, formState: { errors, isSubmitting } } = useForm<ExpenseForm>({
    resolver: zodResolver(expenseSchema),
    defaultValues: { category: 'other', date: format(new Date(), 'yyyy-MM-dd') },
  })
  const selectedCategory = watch('category')
  const selectedPaidFrom = watch('paid_from')
  const amount = parseFloat(watch('amount') || '0')
  const inrAmount = amount * exchangeRate

  useEffect(() => {
    if (currency === 'INR') { setExchangeRate(1); return }
    setFetchingRate(true)
    fetchExchangeRate(currency)
      .then((rate) => {
        if (rate) { setExchangeRate(rate) }
        else { toast.error('Could not fetch exchange rate'); setCurrency('INR'); setExchangeRate(1) }
      })
      .finally(() => setFetchingRate(false))
  }, [currency])

  const monthStart = startOfMonth(selectedMonth).toISOString().split('T')[0]
  const monthEnd = endOfMonth(selectedMonth).toISOString().split('T')[0]

  const { data: expenses, isLoading } = useQuery({
    queryKey: ['personal-expenses', userId, monthStart],
    queryFn: async () => {
      const { data } = await supabase
        .from('personal_expenses').select('*').eq('user_id', userId)
        .gte('date', monthStart).lte('date', monthEnd).order('date', { ascending: false })
      return data ?? []
    },
  })

  const { data: monthlyTotals } = useQuery({
    queryKey: ['monthly-totals', userId, monthStart],
    queryFn: async () => {
      const [incomeRes, savingsRes] = await Promise.all([
        supabase.from('personal_income').select('amount, inr_amount').eq('user_id', userId)
          .eq('month', selectedMonth.getMonth() + 1).eq('year', selectedMonth.getFullYear()),
        supabase.from('personal_savings').select('amount, inr_amount').eq('user_id', userId)
          .gte('date', monthStart).lte('date', monthEnd),
      ])
      return {
        totalIncome: (incomeRes.data ?? []).reduce((s, r) => s + (r.inr_amount ?? r.amount), 0),
        totalSavings: (savingsRes.data ?? []).reduce((s, r) => s + (r.inr_amount ?? r.amount), 0),
      }
    },
  })

  const { data: chartData } = useQuery({
    queryKey: ['personal-chart', userId],
    queryFn: async () => {
      const months = Array.from({ length: 6 }, (_, i) => subMonths(new Date(), 5 - i))
      return Promise.all(months.map(async (month) => {
        const start = startOfMonth(month).toISOString().split('T')[0]
        const end = endOfMonth(month).toISOString().split('T')[0]
        const [expRes, incRes] = await Promise.all([
          supabase.from('personal_expenses').select('amount, inr_amount').eq('user_id', userId).gte('date', start).lte('date', end),
          supabase.from('personal_income').select('amount, inr_amount').eq('user_id', userId).eq('month', month.getMonth() + 1).eq('year', month.getFullYear()),
        ])
        return {
          month: format(month, 'MMM'),
          total: (expRes.data ?? []).reduce((s, e) => s + (e.inr_amount ?? e.amount), 0),
          income: (incRes.data ?? []).reduce((s, e) => s + (e.inr_amount ?? e.amount), 0),
        }
      }))
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
      queryClient.invalidateQueries({ queryKey: ['monthly-totals'] })
      toast.success('Expense deleted')
    },
  })

  async function onSubmit(data: ExpenseForm) {
    const { error } = await supabase.from('personal_expenses').insert({
      user_id: userId,
      title: data.title,
      amount: parseFloat(data.amount),
      currency,
      inr_amount: Math.round(inrAmount * 100) / 100,
      exchange_rate: exchangeRate,
      category: data.category,
      date: data.date,
      notes: data.notes || null,
      paid_from: data.paid_from ?? null,
    })
    if (error) { toast.error('Failed to add expense'); return }
    queryClient.invalidateQueries({ queryKey: ['personal-expenses'] })
    queryClient.invalidateQueries({ queryKey: ['personal-chart'] })
    queryClient.invalidateQueries({ queryKey: ['monthly-totals'] })
    toast.success('Expense added!')
    reset()
    setCurrency('INR')
    setExchangeRate(1)
    setAddOpen(false)
  }

  // Use inr_amount for totals, fall back to amount for pre-migration rows
  const totalExpenses = expenses?.reduce((s, e) => s + (e.inr_amount ?? e.amount), 0) ?? 0
  const totalIncome = monthlyTotals?.totalIncome ?? 0
  const totalSavings = monthlyTotals?.totalSavings ?? 0
  const freeCash = totalIncome - totalExpenses - totalSavings
  const savingsRate = totalIncome > 0 ? (totalSavings / totalIncome) * 100 : null
  const categories = Object.entries(EXPENSE_CATEGORY_META) as [ExpenseCategory, { label: string; emoji: string }][]
  const categoryTotals = expenses?.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] ?? 0) + (e.inr_amount ?? e.amount)
    return acc
  }, {} as Record<string, number>) ?? {}

  const barBase = totalIncome > 0 ? totalIncome : (totalExpenses + totalSavings || 1)
  const expPct  = Math.min((totalExpenses / barBase) * 100, 100)
  const savPct  = Math.min((totalSavings  / barBase) * 100, Math.max(0, 100 - expPct))
  const freePct = Math.max(0, 100 - expPct - savPct)

  const selectedCurrencyMeta = getCurrency(currency)

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold">My Finance</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{format(selectedMonth, 'MMMM yyyy')}</p>
        </div>
        {activeTab !== 'income' && activeTab !== 'savings' && (
          <Button className="gradient-teal text-[#0a0f1e] font-semibold gap-1" onClick={() => setAddOpen(true)}>
            <Plus className="w-4 h-4" /> Add
          </Button>
        )}
      </div>

      {/* Month selector */}
      <div className="flex gap-2 mb-5 overflow-x-auto scrollbar-hide pb-1">
        {Array.from({ length: 6 }, (_, i) => subMonths(new Date(), 5 - i)).map((month) => {
          const isSelected = format(month, 'yyyy-MM') === format(selectedMonth, 'yyyy-MM')
          return (
            <button
              key={month.toISOString()}
              onClick={() => setSelectedMonth(month)}
              className={cn(
                'shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-all border',
                isSelected ? 'bg-primary text-[#0a0f1e] border-primary' : 'border-white/10 bg-white/5 text-muted-foreground hover:bg-white/10'
              )}
            >
              {format(month, 'MMM yy')}
            </button>
          )
        })}
      </div>

      {/* Summary card */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-2xl p-5 mb-5">
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div>
            <p className="text-[11px] text-muted-foreground uppercase tracking-wide mb-0.5">Income</p>
            <p className="text-lg font-bold text-emerald-400">₹<CountUp to={totalIncome} /></p>
          </div>
          <div className="text-center">
            <p className="text-[11px] text-muted-foreground uppercase tracking-wide mb-0.5">Spent</p>
            <p className="text-lg font-bold text-rose-400">₹<CountUp to={totalExpenses} /></p>
          </div>
          <div className="text-right">
            <p className="text-[11px] text-muted-foreground uppercase tracking-wide mb-0.5">Saved</p>
            <p className="text-lg font-bold text-indigo-400">₹<CountUp to={totalSavings} /></p>
          </div>
        </div>

        {/* Animated cash flow bar */}
        <div className="h-2.5 rounded-full overflow-hidden flex bg-white/8 mb-2">
          {expPct > 0 && (
            <motion.div className="bg-rose-400 h-full" initial={{ width: 0 }} animate={{ width: `${expPct}%` }} transition={{ duration: 0.5, ease: 'easeOut' }} />
          )}
          {savPct > 0 && (
            <motion.div className="bg-indigo-400 h-full" initial={{ width: 0 }} animate={{ width: `${savPct}%` }} transition={{ duration: 0.5, ease: 'easeOut', delay: 0.1 }} />
          )}
          {freePct > 0 && totalIncome > 0 && (
            <motion.div className="bg-emerald-400/50 h-full" initial={{ width: 0 }} animate={{ width: `${freePct}%` }} transition={{ duration: 0.5, ease: 'easeOut', delay: 0.2 }} />
          )}
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-rose-400 inline-block" />Spent</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-indigo-400 inline-block" />Saved</span>
            {totalIncome > 0 && <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-400/70 inline-block" />Free</span>}
          </div>
          {totalIncome > 0 ? (
            <div className="flex items-center gap-2">
              <span className={cn(
                'text-xs font-semibold px-2 py-0.5 rounded-full',
                savingsRate! >= 20 ? 'bg-emerald-400/15 text-emerald-400' :
                savingsRate! >= 5  ? 'bg-amber-400/15 text-amber-400' :
                                     'bg-rose-400/15 text-rose-400'
              )}>
                {savingsRate!.toFixed(0)}% saved
              </span>
              <span className={cn('text-sm font-bold', freeCash >= 0 ? 'text-primary' : 'text-rose-400')}>
                {freeCash < 0 ? '-' : '+'}₹<CountUp to={Math.abs(freeCash)} />
              </span>
            </div>
          ) : (
            <span className="text-xs text-muted-foreground">Add income to see cash flow</span>
          )}
        </div>
      </motion.div>

      {/* 4 tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-white/5 border border-white/8 mb-5 w-full grid grid-cols-4">
          {[
            { value: 'expenses', label: 'Expenses' },
            { value: 'income',   label: 'Income'   },
            { value: 'savings',  label: 'Savings'  },
            { value: 'analytics',label: 'Analytics'},
          ].map(tab => (
            <TabsTrigger key={tab.value} value={tab.value} className="data-[state=active]:bg-primary data-[state=active]:text-[#0a0f1e]">
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

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
                const isForeign = expense.currency && expense.currency !== 'INR'
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
                        expense.paid_from === 'income' ? 'bg-emerald-400/15 text-emerald-400' : 'bg-indigo-400/15 text-indigo-400'
                      )}>
                        {expense.paid_from === 'income' ? '💼' : '🐷'}
                      </span>
                    )}
                    <div className="text-right shrink-0">
                      {isForeign && expense.inr_amount ? (
                        <>
                          <span className="font-semibold text-sm">{formatCurrency(expense.amount, expense.currency)}</span>
                          <p className="text-xs text-muted-foreground">{formatINR(expense.inr_amount)}</p>
                        </>
                      ) : (
                        <span className="font-semibold text-sm">{formatINR(expense.inr_amount ?? expense.amount)}</span>
                      )}
                    </div>
                    <button onClick={() => deleteExpense.mutate(expense.id)} className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-rose-400 transition-all">
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
          <div className="space-y-5">
            <SpendingChart data={chartData ?? []} />
            <CategoryBreakdown categoryTotals={categoryTotals} total={totalExpenses} />
            <BudgetTracker userId={userId} categoryTotals={categoryTotals} month={selectedMonth} />
          </div>
        </TabsContent>
      </Tabs>

      {/* Add expense dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="glass-strong border-white/10 text-foreground max-w-md">
          <DialogHeader>
            <DialogTitle>Add Expense</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1.5">
                <Label>Title</Label>
                <Input placeholder="Coffee, Groceries..." className="bg-white/5 border-white/10" {...register('title')} />
                {errors.title && <p className="text-destructive text-xs">{errors.title.message}</p>}
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>Amount</Label>
                <div className="flex gap-2">
                  {/* Currency selector */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setCurrencyOpen(!currencyOpen)}
                      className="flex items-center gap-1 h-9 px-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/8 transition-colors text-sm font-medium min-w-[70px]"
                    >
                      <span>{selectedCurrencyMeta.symbol}</span>
                      <span className="text-xs text-muted-foreground">{currency}</span>
                      <ChevronDown className="w-3 h-3 text-muted-foreground" />
                    </button>
                    {currencyOpen && (
                      <div className="absolute top-10 left-0 z-50 glass-strong border border-white/10 rounded-xl overflow-hidden w-52 shadow-xl max-h-60 overflow-y-auto">
                        {SUPPORTED_CURRENCIES.map((c) => (
                          <button
                            key={c.code}
                            type="button"
                            onClick={() => { setCurrency(c.code); setCurrencyOpen(false) }}
                            className={cn(
                              'w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left transition-colors',
                              currency === c.code ? 'bg-primary/15 text-primary' : 'hover:bg-white/5 text-foreground'
                            )}
                          >
                            <span className="w-6 text-center font-medium">{c.symbol}</span>
                            <span className="font-medium">{c.code}</span>
                            <span className="text-muted-foreground text-xs truncate">{c.name}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <Input type="number" step="0.01" className="flex-1 bg-white/5 border-white/10" {...register('amount')} />
                </div>
                {errors.amount && <p className="text-destructive text-xs">{errors.amount.message}</p>}
                {currency !== 'INR' && amount > 0 && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {fetchingRate ? (
                      <><Loader2 className="w-3 h-3 animate-spin" /> Fetching rate...</>
                    ) : (
                      <><span className="text-primary font-medium">{formatINR(inrAmount)}</span><span>· 1 {currency} = {formatINR(exchangeRate)}</span></>
                    )}
                  </div>
                )}
              </div>
              <div className="col-span-2 space-y-1.5">
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
                        ? source === 'income' ? 'border-emerald-400 bg-emerald-400/10 text-emerald-400' : 'border-indigo-400 bg-indigo-400/10 text-indigo-400'
                        : 'border-white/10 bg-white/5 text-muted-foreground hover:bg-white/10'
                    )}
                  >
                    {source === 'income' ? '💼' : '🐷'} {source === 'income' ? 'Income' : 'Savings'}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <Button type="button" variant="ghost" className="flex-1" onClick={() => setAddOpen(false)}>Cancel</Button>
              <Button type="submit" className="flex-1 gradient-teal text-[#0a0f1e] font-semibold" disabled={isSubmitting || fetchingRate}>
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add Expense'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
