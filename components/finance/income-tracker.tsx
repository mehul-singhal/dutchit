'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { format } from 'date-fns'
import { Plus, Trash2, Loader2 } from 'lucide-react'
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
}

export function IncomeTracker({ userId, month }: Props) {
  const [addOpen, setAddOpen] = useState(false)
  const supabase = createClient()
  const queryClient = useQueryClient()

  const { register, handleSubmit, watch, setValue, reset, formState: { errors, isSubmitting } } = useForm<IncomeForm>({
    resolver: zodResolver(incomeSchema),
    defaultValues: { source: 'salary' },
  })
  const selectedSource = watch('source')

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
      queryClient.invalidateQueries({ queryKey: ['finance-overview'] })
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
      month: month.getMonth() + 1,
      year: month.getFullYear(),
      notes: data.notes || null,
    })
    if (error) { toast.error('Failed to add income'); return }
    queryClient.invalidateQueries({ queryKey: ['personal-income'] })
    queryClient.invalidateQueries({ queryKey: ['finance-overview'] })
    queryClient.invalidateQueries({ queryKey: ['monthly-totals'] })
    queryClient.invalidateQueries({ queryKey: ['personal-chart'] })
    toast.success('Income added!')
    reset()
    setAddOpen(false)
  }

  const total = incomeList?.reduce((s, e) => s + e.amount, 0) ?? 0
  const sources = Object.entries(INCOME_SOURCE_META) as [IncomeSource, { label: string; emoji: string }][]

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Total Income</p>
          <p className="text-2xl font-bold text-emerald-400">₹<CountUp to={total} /></p>
          <p className="text-xs text-muted-foreground mt-0.5">{format(month, 'MMMM yyyy')}</p>
        </div>
        <Button
          className="gradient-teal text-[#0a0f1e] font-semibold gap-1"
          onClick={() => setAddOpen(true)}
        >
          <Plus className="w-4 h-4" /> Add Income
        </Button>
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
                  <span className="font-semibold text-sm text-emerald-400">{formatINR(entry.amount)}</span>
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
              <Label>Amount (₹)</Label>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
                <Input type="number" step="0.01" className="pl-6 bg-white/5 border-white/10" {...register('amount')} />
              </div>
              {errors.amount && <p className="text-destructive text-xs">{errors.amount.message}</p>}
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
              <Button type="submit" className="flex-1 gradient-teal text-[#0a0f1e] font-semibold" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add Income'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
