'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Trash2, Edit2, ChevronDown, ChevronUp } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase/client'
import { formatINR, formatDate, getInitials } from '@/lib/utils/formatters'
import { AddExpenseSheet } from '@/components/expenses/add-expense-sheet'
import { EXPENSE_CATEGORY_META } from '@/components/expenses/expense-category-meta'
import { useFabAction } from '@/lib/utils/fab'
import type { Expense, MemberRole, UserProfile, ExpenseCategory, SplitType } from '@/types/database'

type ExpenseSplitWithUser = {
  id: string
  expense_id: string
  user_id: string
  split_type: SplitType
  amount: number
  percentage: number | null
  shares: number | null
  adjusted_amount: number | null
  users: UserProfile | null
}

type ExpenseWithDetails = Omit<Expense, 'splits'> & {
  paid_by_user: UserProfile | null
  expense_splits: ExpenseSplitWithUser[]
}

interface Props {
  groupId: string
  userId: string
  userRole: MemberRole
}

export function GroupExpenses({ groupId, userId, userRole }: Props) {
  const [addOpen, setAddOpen] = useState(false)
  const [editingExpense, setEditingExpense] = useState<ExpenseWithDetails | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const supabase = createClient()
  const queryClient = useQueryClient()

  // FAB → open add expense dialog when inside a group
  useFabAction(() => setAddOpen(true))

  const { data: expenses, isLoading } = useQuery({
    queryKey: ['expenses', groupId],
    queryFn: async () => {
      const { data: raw } = await supabase
        .from('expenses')
        .select(`
          *,
          paid_by_user:users!expenses_paid_by_fkey(*),
          expense_splits(*, users(*))
        `)
        .eq('group_id', groupId)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })
      return (raw ?? []) as ExpenseWithDetails[]
    },
  })

  const deleteExpense = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('expenses').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses', groupId] })
      queryClient.invalidateQueries({ queryKey: ['group-balances', groupId] })
      toast.success('Expense deleted')
    },
    onError: () => toast.error('Failed to delete expense'),
  })

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 glass rounded-xl skeleton-shimmer" />
        ))}
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">
          {expenses?.length ?? 0} expense{expenses?.length !== 1 ? 's' : ''}
        </p>
        <Button
          size="sm"
          className="gradient-teal text-[#0a0f1e] font-semibold gap-1"
          onClick={() => setAddOpen(true)}
        >
          <Plus className="w-4 h-4" /> Add Expense
        </Button>
      </div>

      {expenses?.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-12"
        >
          <div className="text-4xl mb-3">🧾</div>
          <p className="font-semibold">No expenses yet</p>
          <p className="text-sm text-muted-foreground mt-1 mb-5">
            No expenses yet — someone&apos;s being suspiciously generous 👀
          </p>
          <Button
            className="gradient-teal text-[#0a0f1e] font-semibold"
            onClick={() => setAddOpen(true)}
          >
            <Plus className="w-4 h-4 mr-1" /> Add First Expense
          </Button>
        </motion.div>
      ) : (
        <AnimatePresence>
          <div className="space-y-2">
            {expenses?.map((expense, i) => {
              const meta = EXPENSE_CATEGORY_META[expense.category]
              const paidBy = expense.paid_by_user
              const isExpanded = expandedId === expense.id
              const splits = expense.expense_splits ?? []
              const mySplit = splits.find((s) => s.user_id === userId)

              // Show date separator when the date changes
              const prevExpense = i > 0 ? expenses[i - 1] : null
              const showDateSep = !prevExpense || prevExpense.date !== expense.date

              return (
                <div key={expense.id}>
                  {showDateSep && (
                    <div className="flex items-center gap-3 my-3 first:mt-0">
                      <div className="h-px flex-1 bg-white/8" />
                      <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider px-1">
                        {formatDate(expense.date)}
                      </span>
                      <div className="h-px flex-1 bg-white/8" />
                    </div>
                  )}
              <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.04, 0.3) }}
                  className="glass rounded-xl overflow-hidden"
                >
                  {/* Main row */}
                  <div
                    className="flex items-center gap-3 p-4 cursor-pointer"
                    onClick={() => setExpandedId(isExpanded ? null : expense.id)}
                  >
                    <div className="w-10 h-10 rounded-xl bg-white/8 flex items-center justify-center text-lg shrink-0">
                      {meta.emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{expense.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {paidBy?.id === userId ? 'You' : paidBy?.full_name ?? 'Unknown'} paid
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-semibold text-sm">{formatINR(expense.amount)}</p>
                      {mySplit && (
                        <p className={`text-xs ${paidBy?.id === userId ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {paidBy?.id === userId ? 'you get back' : 'your share'} {formatINR(mySplit.amount)}
                        </p>
                      )}
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-muted-foreground ml-1 shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-muted-foreground ml-1 shrink-0" />
                    )}
                  </div>

                  {/* Expanded details */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="border-t border-white/8 px-4 pb-4"
                      >
                        <div className="pt-3 space-y-3">
                          {/* Splits */}
                          <div>
                            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Split breakdown</p>
                            <div className="space-y-1.5">
                              {splits.map((split) => {
                                const splitUser = split.users
                                return (
                                  <div key={split.id} className="flex items-center gap-2">
                                    <Avatar className="w-6 h-6 shrink-0">
                                      <AvatarImage src={splitUser?.avatar_url ?? undefined} />
                                      <AvatarFallback className="bg-primary/20 text-primary text-[9px]">
                                        {getInitials(splitUser?.full_name ?? '?')}
                                      </AvatarFallback>
                                    </Avatar>
                                    <span className="text-xs flex-1">
                                      {splitUser?.id === userId ? 'You' : splitUser?.full_name ?? 'Unknown'}
                                    </span>
                                    <span className="text-xs font-medium">{formatINR(split.amount)}</span>
                                  </div>
                                )
                              })}
                            </div>
                          </div>

                          {expense.notes && (
                            <p className="text-xs text-muted-foreground italic">{expense.notes}</p>
                          )}

                          {/* Actions */}
                          {(expense.created_by === userId || userRole === 'admin') && (
                            <div className="flex gap-2 pt-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-muted-foreground hover:text-foreground hover:bg-white/10 gap-1 h-7"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setEditingExpense(expense)
                                }}
                              >
                                <Edit2 className="w-3.5 h-3.5" /> Edit
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-rose-400 hover:text-rose-300 hover:bg-rose-400/10 gap-1 h-7"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  if (window.confirm('Delete this expense?')) {
                                    deleteExpense.mutate(expense.id)
                                  }
                                }}
                              >
                                <Trash2 className="w-3.5 h-3.5" /> Delete
                              </Button>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
                </div>
              )
            })}
          </div>
        </AnimatePresence>
      )}

      <AddExpenseSheet
        open={addOpen}
        onOpenChange={setAddOpen}
        groupId={groupId}
        userId={userId}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['expenses', groupId] })
          queryClient.invalidateQueries({ queryKey: ['group-balances', groupId] })
          setAddOpen(false)
        }}
      />

      {editingExpense && (
        <AddExpenseSheet
          open={!!editingExpense}
          onOpenChange={(open) => { if (!open) setEditingExpense(null) }}
          groupId={groupId}
          userId={userId}
          expense={{
            id: editingExpense.id,
            title: editingExpense.title,
            amount: editingExpense.amount,
            category: editingExpense.category,
            date: editingExpense.date,
            paid_by: editingExpense.paid_by,
            notes: editingExpense.notes ?? null,
            receipt_url: editingExpense.receipt_url ?? null,
            expense_splits: editingExpense.expense_splits.map((s) => ({
              user_id: s.user_id,
              amount: s.amount,
              split_type: s.split_type,
            })),
          }}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['expenses', groupId] })
            queryClient.invalidateQueries({ queryKey: ['group-balances', groupId] })
            queryClient.invalidateQueries({ queryKey: ['group-analytics', groupId] })
            setEditingExpense(null)
          }}
        />
      )}
    </div>
  )
}
