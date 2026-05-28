'use client'

import { useState, useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2, Camera, X } from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
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
import { getInitials } from '@/lib/utils/formatters'
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

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  groupId: string
  userId: string
  onSuccess: () => void
}

export function AddExpenseSheet({ open, onOpenChange, groupId, userId, onSuccess }: Props) {
  const [splitType, setSplitType] = useState<SplitType>('equal')
  const [members, setMembers] = useState<UserProfile[]>([])
  const [splitData, setSplitData] = useState<Record<string, number | boolean>>({})
  const [uploading, setUploading] = useState(false)
  const [receiptUrl, setReceiptUrl] = useState('')
  const supabase = createClient()

  const { register, handleSubmit, watch, reset, control, setValue, formState: { errors, isSubmitting } } =
    useForm<FormData>({
      resolver: zodResolver(schema),
      defaultValues: {
        category: 'other',
        date: format(new Date(), 'yyyy-MM-dd'),
        paid_by: userId,
      },
    })

  const amount = parseFloat(watch('amount') || '0')

  // Load members
  useEffect(() => {
    if (!open) return
    supabase
      .from('group_members')
      .select('users(*)')
      .eq('group_id', groupId)
      .then(({ data: raw }) => {
        const data = raw as Array<{ users: UserProfile | null }> | null
        const users = (data ?? []).map((m) => m.users as UserProfile).filter(Boolean)
        setMembers(users)
        // Init equal split — all included
        const init: Record<string, boolean> = {}
        users.forEach((u) => (init[u.id] = true))
        setSplitData(init)
      })
  }, [open, groupId, supabase])

  // Reset split data when split type changes
  useEffect(() => {
    if (!members.length) return
    if (splitType === 'equal') {
      const d: Record<string, boolean> = {}
      members.forEach((u) => (d[u.id] = true))
      setSplitData(d)
    } else if (splitType === 'exact') {
      const perPerson = amount / members.length
      const d: Record<string, number> = {}
      members.forEach((u) => (d[u.id] = Math.round(perPerson * 100) / 100))
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
  }, [splitType, members.length])

  function computeSplits() {
    if (!amount || !members.length) return []
    switch (splitType) {
      case 'equal':
        return calculateEqualSplits(amount, members.map((m) => ({ userId: m.id, included: !!splitData[m.id] })))
      case 'exact':
        return calculateExactSplits(members.map((m) => ({ userId: m.id, amount: Number(splitData[m.id] ?? 0) })))
      case 'percentage':
        return calculatePercentageSplits(amount, members.map((m) => ({ userId: m.id, percentage: Number(splitData[m.id] ?? 0) })))
      case 'shares':
        return calculateShareSplits(amount, members.map((m) => ({ userId: m.id, shares: Number(splitData[m.id] ?? 1) })))
      case 'adjustment':
        return calculateAdjustmentSplits(amount, members.map((m) => ({ userId: m.id, adjustedAmount: Number(splitData[m.id] ?? 0) })))
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

    // Insert expense
    const { data: expense, error } = await supabase
      .from('expenses')
      .insert({
        group_id: groupId,
        title: data.title,
        amount: parseFloat(data.amount),
        category: data.category,
        date: data.date,
        paid_by: data.paid_by,
        notes: data.notes || null,
        receipt_url: receiptUrl || null,
        created_by: userId,
      })
      .select()
      .single()

    if (error) {
      toast.error('Failed to add expense')
      return
    }

    // Insert splits
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
      // Rollback expense
      await supabase.from('expenses').delete().eq('id', expense.id)
      toast.error('Failed to save splits')
      return
    }

    toast.success(`"${data.title}" added! 🎉`)
    reset()
    setReceiptUrl('')
    setSplitType('equal')
    onSuccess()
  }

  const categories = Object.entries(EXPENSE_CATEGORY_META) as [ExpenseCategory, { label: string; emoji: string }][]
  const selectedCategory = watch('category')
  const selectedPaidBy = watch('paid_by')

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="glass-strong border-l border-white/8 text-foreground w-full sm:max-w-md overflow-y-auto"
      >
        <SheetHeader className="mb-6">
          <SheetTitle className="text-xl font-bold">Add Expense</SheetTitle>
          <p className="text-sm text-muted-foreground">Who&apos;s footing the bill?</p>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Title + Amount */}
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
            <Label>Amount (₹)</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">₹</span>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                className="pl-7 bg-white/5 border-white/10 h-11 text-lg font-semibold"
                {...register('amount')}
              />
            </div>
            {errors.amount && <p className="text-destructive text-xs">{errors.amount.message}</p>}
          </div>

          {/* Category */}
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

          {/* Date */}
          <div className="space-y-1.5">
            <Label>Date</Label>
            <Input type="date" className="bg-white/5 border-white/10 h-11" {...register('date')} />
          </div>

          {/* Paid by */}
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

          {/* Split type */}
          <div className="space-y-2">
            <Label>Split type</Label>
            <SplitTypeSelector value={splitType} onChange={setSplitType} />
          </div>

          {/* Split inputs */}
          {amount > 0 && (
            <SplitInputs
              splitType={splitType}
              members={members}
              currentUserId={userId}
              totalAmount={amount}
              splitData={splitData}
              onChange={setSplitData}
            />
          )}

          {/* Notes */}
          <div className="space-y-1.5">
            <Label>Notes <span className="text-muted-foreground text-xs">(optional)</span></Label>
            <Textarea
              placeholder="Any details..."
              className="bg-white/5 border-white/10 resize-none"
              rows={2}
              {...register('notes')}
            />
          </div>

          {/* Receipt */}
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

          {/* Submit */}
          <Button
            type="submit"
            className="w-full h-11 gradient-teal text-[#0a0f1e] font-semibold"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Adding...</>
            ) : (
              'Add Expense'
            )}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  )
}
