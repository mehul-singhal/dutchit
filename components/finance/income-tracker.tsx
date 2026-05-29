'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { format } from 'date-fns'
import { Trash2, Loader2, ChevronDown } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { createClient } from '@/lib/supabase/client'
import { formatINR } from '@/lib/utils/formatters'
import { SUPPORTED_CURRENCIES, fetchExchangeRate, getCurrency, formatCurrency } from '@/lib/utils/currency'
import { INCOME_SOURCE_META } from '@/components/finance/income-source-meta'
import { CountUp } from '@/components/animations/count-up'
import type { IncomeSource } from '@/types/database'
import { cn } from '@/lib/utils'

const incomeSchema = z.object({
  title: z.string().min(1, 'Required'),
  amount: z.string().refine((v) => !isNaN(Number(v)) && Number(v) > 0, 'Enter valid amount'),
  source: z.enum(['salary', 'freelance', 'rental', 'investment', 'gift', 'other'] as const),
  notes: z.string().optional(),
})
type IncomeForm = z.infer<typeof incomeSchema>

interface Props {
  userId: string
  month: Date
  addOpen?: boolean
  onAddOpenChange?: (open: boolean) => void
}

export function IncomeTracker({ userId, month, addOpen: externalAddOpen, onAddOpenChange }: Props) {
  const [internalAddOpen, setInternalAddOpen] = useState(false)
  const addOpen = externalAddOpen ?? internalAddOpen
  const setAddOpen = onAddOpenChange ?? setInternalAddOpen
  const [currency, setCurrency] = useState('INR')
  const [exchangeRate, setExchangeRate] = useState(1)
  const [fetchingRate, setFetchingRate] = useState(false)
  const [currencyOpen, setCurrencyOpen] = useState(false)
  const supabase = createClient()
  const queryClient = useQueryClient()

  const { register, handleSubmit, watch, setValue, reset, formState: { errors, isSubmitting } } = useForm<IncomeForm>({
    resolver: zodResolver(incomeSchema),
    defaultValues: { source: 'salary' },
  })
  const selectedSource = watch('source')
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

  const { data: incomeList, isLoading } = useQuery({
    queryKey: ['personal-income', userId, month.getFullYear(), month.getMonth() + 1],
    queryFn: async () => {
      const { data } = await supabase
        .from('personal_income')
        .select('*')
        .eq('user_id', userId)
        .eq('month', month.getMonth() + 1)
        .eq('year', month.getFullYear())
        .order('created_at', { ascending: false })
      return data ?? []
    },
  })

  const deleteIncome = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('personal_income').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personal-income'] })
      queryClient.invalidateQueries({ queryKey: ['monthly-totals'] })
      queryClient.invalidateQueries({ queryKey: ['personal-chart'] })
      toast.success('Income entry deleted')
    },
  })

  async function onSubmit(data: IncomeForm) {
    const { error } = await supabase.from('personal_income').insert({
      user_id: userId,
      source: data.source,
      title: data.title,
      amount: parseFloat(data.amount),
      currency,
      inr_amount: Math.round(inrAmount * 100) / 100,
      exchange_rate: exchangeRate,
      month: month.getMonth() + 1,
      year: month.getFullYear(),
      notes: data.notes || null,
    })
    if (error) { toast.error('Failed to add income'); return }
    queryClient.invalidateQueries({ queryKey: ['personal-income'] })
    queryClient.invalidateQueries({ queryKey: ['monthly-totals'] })
    queryClient.invalidateQueries({ queryKey: ['personal-chart'] })
    toast.success('Income added!')
    reset()
    setCurrency('INR')
    setExchangeRate(1)
    setAddOpen(false)
  }

  // Use inr_amount for totals, fall back to amount for pre-migration rows
  const total = incomeList?.reduce((s, e) => s + (e.inr_amount ?? e.amount), 0) ?? 0
  const sources = Object.entries(INCOME_SOURCE_META) as [IncomeSource, { label: string; emoji: string }][]
  const selectedCurrencyMeta = getCurrency(currency)

  return (
    <div>
      {/* Header */}
      <div className="mb-4">
        <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Total Income</p>
        <p className="text-2xl font-bold text-emerald-400">₹<CountUp to={total} /></p>
        <p className="text-xs text-muted-foreground mt-0.5">{format(month, 'MMMM yyyy')}</p>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => <div key={i} className="h-14 glass rounded-xl skeleton-shimmer" />)}
        </div>
      ) : incomeList?.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-4xl mb-3">💰</div>
          <p className="font-semibold">No income logged for {format(month, 'MMMM')}</p>
          <p className="text-sm text-muted-foreground mt-1">Tap + Add Income to get started</p>
        </div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence>
            {incomeList?.map((entry, i) => {
              const meta = INCOME_SOURCE_META[entry.source as IncomeSource]
              const isForeign = entry.currency && entry.currency !== 'INR'
              return (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ delay: i * 0.03 }}
                  className="glass rounded-xl p-3 flex items-center gap-3 group"
                >
                  <div className="w-9 h-9 rounded-xl bg-emerald-400/10 flex items-center justify-center text-lg shrink-0">
                    {meta.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{entry.title}</p>
                    <p className="text-xs text-muted-foreground">{meta.label}</p>
                  </div>
                  <div className="text-right shrink-0">
                    {isForeign && entry.inr_amount ? (
                      <>
                        <span className="font-semibold text-sm text-emerald-400">{formatCurrency(entry.amount, entry.currency)}</span>
                        <p className="text-xs text-muted-foreground">{formatINR(entry.inr_amount)}</p>
                      </>
                    ) : (
                      <span className="font-semibold text-sm text-emerald-400">{formatINR(entry.inr_amount ?? entry.amount)}</span>
                    )}
                  </div>
                  <button
                    onClick={() => deleteIncome.mutate(entry.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-rose-400 transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Add dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="glass-strong border-white/10 text-foreground max-w-md">
          <DialogHeader>
            <DialogTitle>Add Income</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label>Title</Label>
              <Input placeholder="e.g. Monthly Salary, Project payment..." className="bg-white/5 border-white/10" {...register('title')} />
              {errors.title && <p className="text-destructive text-xs">{errors.title.message}</p>}
            </div>

            <div className="space-y-1.5">
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

            <div className="space-y-2">
              <Label>Source</Label>
              <div className="grid grid-cols-3 gap-1.5">
                {sources.map(([key, meta]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setValue('source', key)}
                    className={cn(
                      'flex flex-col items-center gap-1 p-2 rounded-xl border text-[10px] transition-all',
                      selectedSource === key
                        ? 'border-emerald-400 bg-emerald-400/10 text-emerald-400'
                        : 'border-white/10 bg-white/5 text-muted-foreground hover:bg-white/10'
                    )}
                  >
                    <span className="text-base">{meta.emoji}</span>
                    {meta.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <Button type="button" variant="ghost" className="flex-1" onClick={() => setAddOpen(false)}>Cancel</Button>
              <Button type="submit" className="flex-1 gradient-teal text-[#0a0f1e] font-semibold" disabled={isSubmitting || fetchingRate}>
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add Income'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
