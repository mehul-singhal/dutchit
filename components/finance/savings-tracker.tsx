'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import { Plus, Trash2, Loader2, PiggyBank } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { createClient } from '@/lib/supabase/client'
import { formatINR } from '@/lib/utils/formatters'
import { CountUp } from '@/components/animations/count-up'
import { cn } from '@/lib/utils'

const savingsSchema = z.object({
  title: z.string().min(1, 'Required'),
  amount: z.string().refine((v) => !isNaN(Number(v)) && Number(v) > 0, 'Enter valid amount'),
  date: z.string(),
  notes: z.string().optional(),
})
type SavingsForm = z.infer<typeof savingsSchema>

interface Props {
  userId: string
  month: Date
}

export function SavingsTracker({ userId, month }: Props) {
  const [addOpen, setAddOpen] = useState(false)
  const [editingGoal, setEditingGoal] = useState(false)
  const [goalInput, setGoalInput] = useState('')
  const supabase = createClient()
  const queryClient = useQueryClient()

  const monthStart = startOfMonth(month).toISOString().split('T')[0]
  const monthEnd = endOfMonth(month).toISOString().split('T')[0]

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<SavingsForm>({
    resolver: zodResolver(savingsSchema),
    defaultValues: { date: format(new Date(), 'yyyy-MM-dd') },
  })

  const { data: savingsList, isLoading } = useQuery({
    queryKey: ['personal-savings', userId, monthStart],
    queryFn: async () => {
      const { data } = await supabase
        .from('personal_savings')
        .select('*')
        .eq('user_id', userId)
        .gte('date', monthStart)
        .lte('date', monthEnd)
        .order('date', { ascending: false })
      return data ?? []
    },
  })

  const { data: settings } = useQuery({
    queryKey: ['finance-settings', userId],
    queryFn: async () => {
      const { data } = await supabase
        .from('personal_finance_settings')
        .select('monthly_savings_goal')
        .eq('user_id', userId)
        .single()
      return data
    },
  })

  const deleteSavings = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('personal_savings').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personal-savings'] })
      queryClient.invalidateQueries({ queryKey: ['finance-overview'] })
      queryClient.invalidateQueries({ queryKey: ['monthly-totals'] })
      toast.success('Entry deleted')
    },
  })

  const saveGoal = useMutation({
    mutationFn: async (amount: number) => {
      const { error } = await supabase
        .from('personal_finance_settings')
        .upsert({ user_id: userId, monthly_savings_goal: amount })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance-settings'] })
      setEditingGoal(false)
      toast.success('Savings goal updated!')
    },
  })

  async function onSubmit(data: SavingsForm) {
    const { error } = await supabase.from('personal_savings').insert({
      user_id: userId,
      title: data.title,
      amount: parseFloat(data.amount),
      date: data.date,
      notes: data.notes || null,
    })
    if (error) { toast.error('Failed to add savings entry'); return }
    queryClient.invalidateQueries({ queryKey: ['personal-savings'] })
    queryClient.invalidateQueries({ queryKey: ['finance-overview'] })
    queryClient.invalidateQueries({ queryKey: ['monthly-totals'] })
    toast.success('Savings entry added!')
    reset()
    setAddOpen(false)
  }

  const total = savingsList?.reduce((s, e) => s + e.amount, 0) ?? 0
  const goal = settings?.monthly_savings_goal ?? 0
  const pct = goal > 0 ? Math.min((total / goal) * 100, 100) : 0
  const isGoalMet = goal > 0 && total >= goal

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Total Saved</p>
          <p className="text-2xl font-bold text-indigo-400">₹<CountUp to={total} /></p>
          <p className="text-xs text-muted-foreground mt-0.5">{format(month, 'MMMM yyyy')}</p>
        </div>
        <Button
          className="gradient-teal text-[#0a0f1e] font-semibold gap-1"
          onClick={() => setAddOpen(true)}
        >
          <Plus className="w-4 h-4" /> Add Savings
        </Button>
      </div>

      {/* Goal tracker */}
      <div className="glass rounded-xl p-4 mb-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <PiggyBank className="w-4 h-4 text-indigo-400" />
            <span className="text-sm font-medium">Monthly Goal</span>
          </div>
          {!editingGoal ? (
            <button
              onClick={() => { setEditingGoal(true); setGoalInput(goal ? String(goal) : '') }}
              className="text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              {goal ? 'Edit' : 'Set goal'}
            </button>
          ) : null}
        </div>

        {editingGoal ? (
          <div className="flex gap-2">
            <div className="relative flex-1">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">₹</span>
              <Input
                type="number"
                placeholder="Target savings"
                className="pl-6 h-8 text-sm bg-white/5 border-white/10"
                value={goalInput}
                onChange={(e) => setGoalInput(e.target.value)}
                autoFocus
              />
            </div>
            <Button
              size="sm"
              className="h-8 gradient-teal text-[#0a0f1e] font-semibold"
              onClick={() => {
                const amount = parseFloat(goalInput)
                if (!isNaN(amount) && amount > 0) saveGoal.mutate(amount)
              }}
              disabled={saveGoal.isPending}
            >
              {saveGoal.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Save'}
            </Button>
            <Button size="sm" variant="ghost" className="h-8" onClick={() => setEditingGoal(false)}>Cancel</Button>
          </div>
        ) : goal > 0 ? (
          <div>
            <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
              <span>{formatINR(total)} saved</span>
              <span className={cn(isGoalMet ? 'text-emerald-400 font-medium' : '')}>
                {isGoalMet ? '🎉 Goal met!' : `${formatINR(goal - total)} to go`}
              </span>
            </div>
            <Progress
              value={pct}
              className={cn('h-2', isGoalMet ? '[&>div]:bg-emerald-400' : '[&>div]:bg-indigo-400')}
            />
            <p className="text-xs text-muted-foreground mt-1 text-right">{Math.round(pct)}% of {formatINR(goal)}</p>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">No goal set. Tap "Set goal" to track your progress.</p>
        )}
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => <div key={i} className="h-14 glass rounded-xl skeleton-shimmer" />)}
        </div>
      ) : savingsList?.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-4xl mb-3">🐷</div>
          <p className="font-semibold">No savings logged for {format(month, 'MMMM')}</p>
          <p className="text-sm text-muted-foreground mt-1">Start with anything — every rupee counts!</p>
        </div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence>
            {savingsList?.map((entry, i) => (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ delay: i * 0.03 }}
                className="glass rounded-xl p-3 flex items-center gap-3 group"
              >
                <div className="w-9 h-9 rounded-xl bg-indigo-400/10 flex items-center justify-center text-lg shrink-0">
                  🐷
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{entry.title}</p>
                  <p className="text-xs text-muted-foreground">{format(new Date(entry.date), 'MMM d')}</p>
                </div>
                <span className="font-semibold text-sm text-indigo-400">{formatINR(entry.amount)}</span>
                <button
                  onClick={() => deleteSavings.mutate(entry.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-rose-400 transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Add dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="glass-strong border-white/10 text-foreground max-w-md">
          <DialogHeader>
            <DialogTitle>Add Savings Entry</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label>Title</Label>
              <Input placeholder="e.g. SIP, Emergency Fund, FD..." className="bg-white/5 border-white/10" {...register('title')} />
              {errors.title && <p className="text-destructive text-xs">{errors.title.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
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
            <div className="flex gap-3">
              <Button type="button" variant="ghost" className="flex-1" onClick={() => setAddOpen(false)}>Cancel</Button>
              <Button type="submit" className="flex-1 gradient-teal text-[#0a0f1e] font-semibold" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add Savings'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
