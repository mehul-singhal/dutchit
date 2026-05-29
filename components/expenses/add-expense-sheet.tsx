'use client'

import { useState, useEffect, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, Camera, X, ChevronDown } from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { createClient } from '@/lib/supabase/client'
import { EXPENSE_CATEGORY_META } from '@/components/expenses/expense-category-meta'
import { SplitTypeSelector } from '@/components/expenses/split-type-selector'
import { SplitInputs } from '@/components/expenses/split-inputs'
import {
  calculateEqualSplits,
  calculateExactSplits,
  calculatePercentageSplits,
  calculateShareSplits,
  calculateAdjustmentSplits,
} from '@/lib/utils/split-calculator'
import { getInitials, formatINR } from '@/lib/utils/formatters'
import { SUPPORTED_CURRENCIES, fetchExchangeRate, getCurrency, formatCurrency } from '@/lib/utils/currency'
import type { SplitType, ExpenseCategory, UserProfile } from '@/types/database'
import { cn } from '@/lib/utils'

const schema = z.object({
  title: z.string().min(1, 'Title required').max(100),
  amount: z.string().refine((v) => !isNaN(Number(v)) && Number(v) > 0, 'Enter a valid amount'),
  category: z.enum(['food', 'travel', 'accommodation', 'entertainment', 'shopping', 'utilities', 'other'] as const),
  date: z.string(),
  paid_by: z.string().min(1, 'Select who paid'),
  notes: z.string().max(300).optional(),
})

type FormData = z.infer<typeof schema>

interface ExpenseToEdit {
  id: string
  title: string
  amount: number
  currency: string
  inr_amount: number | null
  exchange_rate: number | null
  category: ExpenseCategory
  date: string
  paid_by: string
  notes: string | null
  receipt_url: string | null
  expense_splits: Array<{
    user_id: string
    amount: number
    split_type: SplitType
    percentage: number | null
    shares: number | null
    adjusted_amount: number | null
  }>
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  groupId: string
  userId: string
  groupBaseCurrency?: string
  expense?: ExpenseToEdit
  onSuccess: () => void
}

export function AddExpenseSheet({ open, onOpenChange, groupId, userId, groupBaseCurrency = 'INR', expense, onSuccess }: Props) {
  const isEditing = !!expense
  const [splitType, setSplitType] = useState<SplitType>('equal')
  const [members, setMembers] = useState<UserProfile[]>([])
  const [splitData, setSplitData] = useState<Record<string, number | boolean>>({})
  const [uploading, setUploading] = useState(false)
  const [receiptUrl, setReceiptUrl] = useState('')
  const [currency, setCurrency] = useState(groupBaseCurrency)
  const [exchangeRate, setExchangeRate] = useState(1)
  const [fetchingRate, setFetchingRate] = useState(false)
  const [currencyOpen, setCurrencyOpen] = useState(false)
  const splitTypeInitRef = useRef(true)
  const supabase = createClient()

  const { register, handleSubmit, watch, reset, setValue, formState: { errors, isSubmitting } } =
    useForm<FormData>({
      resolver: zodResolver(schema),
      defaultValues: {
        category: 'other',
        date: format(new Date(), 'yyyy-MM-dd'),
        paid_by: userId,
      },
    })

  const amount = parseFloat(watch('amount') || '0')
  const inrAmount = amount * exchangeRate

  // Fetch exchange rate when currency changes (converts to group base currency)
  useEffect(() => {
    if (currency === groupBaseCurrency) {
      setExchangeRate(1)
      return
    }
    setFetchingRate(true)
    fetchExchangeRate(currency, groupBaseCurrency)
      .then((rate) => {
        if (rate) {
          setExchangeRate(rate)
        } else {
          toast.error('Could not fetch exchange rate — please try again')
          setCurrency(groupBaseCurrency)
          setExchangeRate(1)
        }
      })
      .finally(() => setFetchingRate(false))
  }, [currency, groupBaseCurrency])

  // Load members, then pre-fill if editing
  useEffect(() => {
    if (!open) return
    splitTypeInitRef.current = true
    supabase
      .from('group_members')
      .select('users(*)')
      .eq('group_id', groupId)
      .then(({ data: raw }) => {
        const data = raw as Array<{ users: UserProfile | null }> | null
        const users = (data ?? []).map((m) => m.users as UserProfile).filter(Boolean)
        setMembers(users)

        if (expense) {
          setValue('title', expense.title)
          setValue('amount', String(expense.amount))
          setValue('category', expense.category)
          setValue('date', expense.date)
          setValue('paid_by', expense.paid_by)
          setValue('notes', expense.notes ?? '')
          setReceiptUrl(expense.receipt_url ?? '')
          setCurrency(expense.currency ?? groupBaseCurrency)
          setExchangeRate(expense.exchange_rate ?? 1)

          const detectedType = expense.expense_splits[0]?.split_type ?? 'equal'
          setSplitType(detectedType)

          if (detectedType === 'equal') {
            const d: Record<string, boolean> = {}
            users.forEach((u) => (d[u.id] = expense.expense_splits.some((s) => s.user_id === u.id)))
            setSplitData(d)
          } else if (detectedType === 'percentage') {
            const d: Record<string, number> = {}
            users.forEach((u) => {
              const s = expense.expense_splits.find((sp) => sp.user_id === u.id)
              d[u.id] = s ? (s.percentage ?? Math.round((s.amount / (expense.inr_amount ?? expense.amount)) * 10000) / 100) : 0
            })
            setSplitData(d)
          } else if (detectedType === 'shares') {
            const d: Record<string, number> = {}
            users.forEach((u) => {
              const s = expense.expense_splits.find((sp) => sp.user_id === u.id)
              d[u.id] = s ? (s.shares ?? 1) : 1
            })
            setSplitData(d)
          } else if (detectedType === 'adjustment') {
            const d: Record<string, number> = {}
            users.forEach((u) => {
              const s = expense.expense_splits.find((sp) => sp.user_id === u.id)
              d[u.id] = s ? (s.adjusted_amount ?? 0) : 0
            })
            setSplitData(d)
          } else {
            const d: Record<string, number> = {}
            users.forEach((u) => {
              const s = expense.expense_splits.find((sp) => sp.user_id === u.id)
              d[u.id] = s?.amount ?? 0
            })
            setSplitData(d)
          }
        } else {
          reset({
            category: 'other',
            date: format(new Date(), 'yyyy-MM-dd'),
            paid_by: userId,
          })
          setSplitType('equal')
          setCurrency(groupBaseCurrency)
          // Don't manually set exchangeRate here — the rate-fetch effect handles it
          const init: Record<string, boolean> = {}
          users.forEach((u) => (init[u.id] = true))
          setSplitData(init)
          setReceiptUrl('')
        }
      })
  }, [open, groupId, expense])

  // Reset split data when split type changes (user-driven)
  useEffect(() => {
    if (!members.length) return
    if (splitTypeInitRef.current) {
      splitTypeInitRef.current = false
      return
    }
    const currentInrAmount = parseFloat(watch('amount') || '0') * exchangeRate
    if (splitType === 'equal') {
      const d: Record<string, boolean> = {}
      members.forEach((u) => (d[u.id] = true))
      setSplitData(d)
    } else if (splitType === 'exact') {
      const perPerson = currentInrAmount > 0 ? Math.round((currentInrAmount / members.length) * 100) / 100 : 0
      const d: Record<string, number> = {}
      members.forEach((u) => (d[u.id] = perPerson))
      setSplitData(d)
    } else if (splitType === 'percentage') {
      const pct = Math.round((100 / members.length) * 100) / 100
      const d: Record<string, number> = {}
      members.forEach((u) => (d[u.id] = pct))
      setSplitData(d)
    } else if (splitType === 'shares') {
      const d: Record<string, number> = {}
      members.forEach((u) => (d[u.id] = 1))
      setSplitData(d)
    } else if (splitType === 'adjustment') {
      const d: Record<string, number> = {}
      members.forEach((u) => (d[u.id] = 0))
      setSplitData(d)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [splitType])

  // Splits are always computed in INR
  function computeSplits() {
    if (!inrAmount || !members.length) return []
    switch (splitType) {
      case 'equal':
        return calculateEqualSplits(inrAmount, members.map((m) => ({ userId: m.id, included: !!splitData[m.id] })))
      case 'exact':
        return calculateExactSplits(members.map((m) => ({ userId: m.id, amount: Number(splitData[m.id] ?? 0) })))
      case 'percentage':
        return calculatePercentageSplits(inrAmount, members.map((m) => ({ userId: m.id, percentage: Number(splitData[m.id] ?? 0) })))
      case 'shares':
        return calculateShareSplits(inrAmount, members.map((m) => ({ userId: m.id, shares: Number(splitData[m.id] ?? 1) })))
      case 'adjustment':
        return calculateAdjustmentSplits(inrAmount, members.map((m) => ({ userId: m.id, adjustedAmount: Number(splitData[m.id] ?? 0) })))
      default:
        return []
    }
  }

  async function handleReceiptUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const path = `${userId}/${Date.now()}-${file.name}`
      const { error } = await supabase.storage.from('receipts').upload(path, file)
      if (error) throw error
      const { data: { publicUrl } } = supabase.storage.from('receipts').getPublicUrl(path)
      setReceiptUrl(publicUrl)
      toast.success('Receipt uploaded!')
    } catch {
      toast.error('Failed to upload receipt')
    } finally {
      setUploading(false)
    }
  }

  async function onSubmit(data: FormData) {
    const splits = computeSplits()
    if (!splits.length) {
      toast.error('No valid splits — check your inputs')
      return
    }

    if (splitType === 'percentage') {
      const pctSum = members.reduce((s, m) => s + Number(splitData[m.id] ?? 0), 0)
      if (Math.abs(pctSum - 100) > 0.5) {
        toast.error(`Percentages must sum to 100% (currently ${pctSum.toFixed(1)}%)`)
        return
      }
    }
    if (splitType === 'exact') {
      const amountSum = members.reduce((s, m) => s + Number(splitData[m.id] ?? 0), 0)
      if (Math.abs(amountSum - inrAmount) > 0.5) {
        toast.error(`Exact amounts must sum to ${formatCurrency(inrAmount, groupBaseCurrency)} (currently ${formatCurrency(amountSum, groupBaseCurrency)})`)
        return
      }
    }

    const expensePayload = {
      title: data.title,
      amount: parseFloat(data.amount),
      currency,
      inr_amount: Math.round(inrAmount * 100) / 100,
      exchange_rate: exchangeRate,
      category: data.category,
      date: data.date,
      paid_by: data.paid_by,
      notes: data.notes || null,
      receipt_url: receiptUrl || null,
    }

    if (isEditing && expense) {
      const { error } = await supabase
        .from('expenses')
        .update(expensePayload)
        .eq('id', expense.id)

      if (error) {
        toast.error('Failed to update expense')
        return
      }

      await supabase.from('expense_splits').delete().eq('expense_id', expense.id)
      const { error: splitsError } = await supabase.from('expense_splits').insert(
        splits.map((s) => ({
          expense_id: expense.id,
          user_id: s.userId,
          split_type: s.splitType,
          amount: s.amount,
          percentage: s.percentage ?? null,
          shares: s.shares ?? null,
          adjusted_amount: s.adjustedAmount ?? null,
        }))
      )

      if (splitsError) {
        toast.error('Expense updated but failed to save splits')
        return
      }

      toast.success(`"${data.title}" updated!`)
    } else {
      const { data: newExpense, error } = await supabase
        .from('expenses')
        .insert({ group_id: groupId, created_by: userId, ...expensePayload })
        .select()
        .single()

      if (error) {
        toast.error('Failed to add expense')
        return
      }

      const { error: splitsError } = await supabase.from('expense_splits').insert(
        splits.map((s) => ({
          expense_id: newExpense.id,
          user_id: s.userId,
          split_type: s.splitType,
          amount: s.amount,
          percentage: s.percentage ?? null,
          shares: s.shares ?? null,
          adjusted_amount: s.adjustedAmount ?? null,
        }))
      )

      if (splitsError) {
        await supabase.from('expenses').delete().eq('id', newExpense.id)
        toast.error('Failed to save splits')
        return
      }

      toast.success(`"${data.title}" added! 🎉`)
      reset()
      setReceiptUrl('')
      setSplitType('equal')
      setCurrency(groupBaseCurrency)
      // Don't manually set exchangeRate — rate-fetch effect handles it
    }

    onSuccess()
  }

  const categories = Object.entries(EXPENSE_CATEGORY_META) as [ExpenseCategory, { label: string; emoji: string }][]
  const selectedCategory = watch('category')
  const selectedPaidBy = watch('paid_by')
  const selectedCurrencyMeta = getCurrency(currency)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong border-white/10 text-foreground w-full max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader className="mb-2">
          <DialogTitle className="text-xl font-bold">{isEditing ? 'Edit Expense' : 'Add Expense'}</DialogTitle>
          <p className="text-sm text-muted-foreground">
            {isEditing ? 'Update the details below.' : "Who's footing the bill?"}
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="space-y-1.5">
            <Label>What was it for?</Label>
            <Input
              placeholder="Dinner, Uber, Hotel..."
              className="bg-white/5 border-white/10 h-11"
              {...register('title')}
            />
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
                  className="flex items-center gap-1 h-11 px-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/8 transition-colors text-sm font-medium min-w-[70px]"
                >
                  <span>{selectedCurrencyMeta.symbol}</span>
                  <span className="text-xs text-muted-foreground">{currency}</span>
                  <ChevronDown className="w-3 h-3 text-muted-foreground" />
                </button>
                {currencyOpen && (
                  <div className="absolute top-12 left-0 z-50 glass-strong border border-white/10 rounded-xl overflow-hidden w-52 shadow-xl">
                    {SUPPORTED_CURRENCIES.map((c) => (
                      <button
                        key={c.code}
                        type="button"
                        onClick={() => { setCurrency(c.code); setCurrencyOpen(false) }}
                        className={cn(
                          'w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left transition-colors',
                          currency === c.code
                            ? 'bg-primary/15 text-primary'
                            : 'hover:bg-white/5 text-foreground'
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

              {/* Amount input */}
              <div className="flex-1">
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  className="bg-white/5 border-white/10 h-11 text-lg font-semibold"
                  {...register('amount')}
                />
              </div>
            </div>
            {errors.amount && <p className="text-destructive text-xs">{errors.amount.message}</p>}

            {/* Base currency equivalent preview for non-base currencies */}
            {currency !== groupBaseCurrency && amount > 0 && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                {fetchingRate ? (
                  <><Loader2 className="w-3 h-3 animate-spin" /> Fetching rate...</>
                ) : (
                  <>
                    <span className="text-primary font-medium">{formatCurrency(inrAmount, groupBaseCurrency)}</span>
                    <span>· 1 {currency} = {formatCurrency(exchangeRate, groupBaseCurrency)}</span>
                  </>
                )}
              </div>
            )}
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
                    'flex flex-col items-center gap-1 p-2 rounded-xl border transition-all text-[10px]',
                    selectedCategory === key
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-white/10 bg-white/5 text-muted-foreground hover:bg-white/10'
                  )}
                >
                  <span className="text-base">{meta.emoji}</span>
                  <span className="truncate w-full text-center">{meta.label.split(' ')[0]}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Date</Label>
            <Input type="date" className="bg-white/5 border-white/10 h-11" {...register('date')} />
          </div>

          <div className="space-y-2">
            <Label>Paid by</Label>
            <div className="flex flex-wrap gap-2">
              {members.map((member) => (
                <button
                  key={member.id}
                  type="button"
                  onClick={() => setValue('paid_by', member.id)}
                  className={cn(
                    'flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs transition-all',
                    selectedPaidBy === member.id
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-white/10 bg-white/5 text-muted-foreground hover:bg-white/10'
                  )}
                >
                  <Avatar className="w-5 h-5">
                    <AvatarImage src={member.avatar_url ?? undefined} />
                    <AvatarFallback className="text-[8px] bg-primary/20 text-primary">
                      {getInitials(member.full_name ?? '?')}
                    </AvatarFallback>
                  </Avatar>
                  {member.id === userId ? 'You' : member.full_name ?? 'Unknown'}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Split type</Label>
            <SplitTypeSelector value={splitType} onChange={setSplitType} />
          </div>

          {members.length > 0 && (
            <SplitInputs
              splitType={splitType}
              members={members}
              currentUserId={userId}
              totalAmount={inrAmount}
              splitData={splitData}
              onChange={setSplitData}
            />
          )}

          <div className="space-y-1.5">
            <Label>Notes <span className="text-muted-foreground text-xs">(optional)</span></Label>
            <Textarea
              placeholder="Any details..."
              className="bg-white/5 border-white/10 resize-none"
              rows={2}
              {...register('notes')}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Receipt <span className="text-muted-foreground text-xs">(optional)</span></Label>
            {receiptUrl ? (
              <div className="relative inline-block">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={receiptUrl} alt="Receipt" className="w-24 h-24 object-cover rounded-xl" />
                <button
                  type="button"
                  onClick={() => setReceiptUrl('')}
                  className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-destructive flex items-center justify-center"
                >
                  <X className="w-3 h-3 text-white" />
                </button>
              </div>
            ) : (
              <label className="flex items-center gap-2 cursor-pointer w-fit">
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/8 transition-colors text-sm text-muted-foreground">
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                  {uploading ? 'Uploading...' : 'Add receipt photo'}
                </div>
                <input type="file" accept="image/*" className="hidden" onChange={handleReceiptUpload} />
              </label>
            )}
          </div>

          <Button
            type="submit"
            className="w-full h-11 gradient-teal text-[#0a0f1e] font-semibold"
            disabled={isSubmitting || fetchingRate}
          >
            {isSubmitting ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> {isEditing ? 'Saving...' : 'Adding...'}</>
            ) : (
              isEditing ? 'Save Changes' : 'Add Expense'
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
