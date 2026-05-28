'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { Plus, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { createClient } from '@/lib/supabase/client'
import { EXPENSE_CATEGORY_META } from '@/components/expenses/expense-category-meta'
import { formatINR } from '@/lib/utils/formatters'
import type { ExpenseCategory } from '@/types/database'
import { cn } from '@/lib/utils'

interface Props {
  userId: string
  categoryTotals: Record<string, number>
  month: Date
}

export function BudgetTracker({ userId, categoryTotals, month }: Props) {
  const [editingCat, setEditingCat] = useState<ExpenseCategory | null>(null)
  const [editValue, setEditValue] = useState('')
  const supabase = createClient()
  const queryClient = useQueryClient()

  const { data: budgets } = useQuery({
    queryKey: ['budgets', userId, format(month, 'yyyy-MM')],
    queryFn: async () => {
      const { data } = await supabase
        .from('budgets')
        .select('*')
        .eq('user_id', userId)
        .eq('month', month.getMonth() + 1)
        .eq('year', month.getFullYear())
      return data ?? []
    },
  })

  const saveBudget = useMutation({
    mutationFn: async ({ category, amount }: { category: ExpenseCategory; amount: number }) => {
      const { error } = await supabase.from('budgets').upsert({
        user_id: userId,
        category,
        amount,
        month: month.getMonth() + 1,
        year: month.getFullYear(),
      })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] })
      setEditingCat(null)
      toast.success('Budget saved!')
    },
  })

  const categories = Object.keys(EXPENSE_CATEGORY_META) as ExpenseCategory[]

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Set monthly budgets for {format(month, 'MMMM')}. Tap any category to set or edit.
      </p>

      {categories.map((cat) => {
        const meta = EXPENSE_CATEGORY_META[cat]
        const spent = categoryTotals[cat] ?? 0
        const budget = budgets?.find((b) => b.category === cat)
        const budgetAmount = budget?.amount ?? 0
        const pct = budgetAmount > 0 ? Math.min((spent / budgetAmount) * 100, 100) : 0
        const isOver = budgetAmount > 0 && spent > budgetAmount

        return (
          <div key={cat} className="glass rounded-xl p-4">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-lg">{meta.emoji}</span>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{meta.label}</span>
                  <div className="flex items-center gap-2">
                    <span className={cn('text-sm font-medium', isOver ? 'text-rose-400' : 'text-foreground')}>
                      {formatINR(spent)}
                    </span>
                    {budgetAmount > 0 && (
                      <span className="text-xs text-muted-foreground">/ {formatINR(budgetAmount)}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {editingCat === cat ? (
              <div className="flex gap-2 mt-2">
                <div className="relative flex-1">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">₹</span>
                  <Input
                    type="number"
                    placeholder="Budget amount"
                    className="pl-6 h-8 text-sm bg-white/5 border-white/10"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    autoFocus
                  />
                </div>
                <Button
                  size="sm"
                  className="h-8 gradient-teal text-[#0a0f1e] font-semibold"
                  onClick={() => {
                    const amount = parseFloat(editValue)
                    if (!isNaN(amount) && amount > 0) {
                      saveBudget.mutate({ category: cat, amount })
                    }
                  }}
                  disabled={saveBudget.isPending}
                >
                  {saveBudget.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Save'}
                </Button>
                <Button size="sm" variant="ghost" className="h-8" onClick={() => setEditingCat(null)}>
                  Cancel
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                {budgetAmount > 0 ? (
                  <Progress
                    value={pct}
                    className={cn('flex-1 h-2', isOver ? '[&>div]:bg-rose-400' : '[&>div]:bg-primary')}
                  />
                ) : (
                  <div className="flex-1 h-2 bg-white/5 rounded-full" />
                )}
                <button
                  onClick={() => {
                    setEditingCat(cat)
                    setEditValue(budgetAmount ? String(budgetAmount) : '')
                  }}
                  className="shrink-0 text-xs text-muted-foreground hover:text-primary transition-colors"
                >
                  {budgetAmount ? 'Edit' : 'Set budget'}
                </button>
              </div>
            )}

            {isOver && (
              <p className="text-xs text-rose-400 mt-1">
                Over by {formatINR(spent - budgetAmount)} 😬
              </p>
            )}
          </div>
        )
      })}
    </div>
  )
}
