'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, ChevronDown } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import { GROUP_CATEGORY_META } from '@/components/groups/group-category-meta'
import { SUPPORTED_CURRENCIES, getCurrency } from '@/lib/utils/currency'
import type { GroupCategory } from '@/types/database'
import { cn } from '@/lib/utils'

const schema = z.object({
  name: z.string().min(2, 'Name too short').max(60, 'Name too long'),
  category: z.enum(['trip', 'home', 'couple', 'friends', 'work', 'other'] as const),
  description: z.string().max(200, 'Too long').optional(),
  base_currency: z.string().min(1),
})

type FormData = z.infer<typeof schema>

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId: string
  onSuccess: () => void
}

export function CreateGroupDialog({ open, onOpenChange, userId, onSuccess }: Props) {
  const [currencyOpen, setCurrencyOpen] = useState(false)
  const supabase = createClient()

  const { register, handleSubmit, watch, setValue, reset, formState: { errors, isSubmitting } } =
    useForm<FormData>({
      resolver: zodResolver(schema),
      defaultValues: { category: 'friends', base_currency: 'INR' },
    })

  const selectedCategory = watch('category')
  const baseCurrency = watch('base_currency')
  const baseCurrencyMeta = getCurrency(baseCurrency)

  async function onSubmit(data: FormData) {
    const { data: group, error } = await supabase
      .from('groups')
      .insert({
        name: data.name,
        category: data.category,
        description: data.description || null,
        base_currency: data.base_currency,
        created_by: userId,
      })
      .select()
      .single()

    if (error) {
      toast.error('Failed to create group')
      return
    }

    // Add creator as admin
    await supabase.from('group_members').insert({
      group_id: group.id,
      user_id: userId,
      role: 'admin',
    })

    toast.success(`"${data.name}" created! 🎉`)
    reset()
    onSuccess()
  }

  const categories = Object.entries(GROUP_CATEGORY_META) as [GroupCategory, { label: string; emoji: string }][]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong border-white/10 text-foreground max-w-md">
        <DialogHeader>
          <DialogTitle>Create a new group</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label>Group name</Label>
            <Input
              placeholder="Goa Trip 2025, Flat Expenses..."
              className="bg-white/5 border-white/10 h-11"
              {...register('name')}
            />
            {errors.name && <p className="text-destructive text-xs">{errors.name.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>Category</Label>
            <div className="grid grid-cols-3 gap-2">
              {categories.map(([key, meta]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setValue('category', key)}
                  className={cn(
                    'flex flex-col items-center gap-1 p-3 rounded-xl border transition-all text-xs',
                    selectedCategory === key
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-white/10 bg-white/5 text-muted-foreground hover:bg-white/10'
                  )}
                >
                  <span className="text-xl">{meta.emoji}</span>
                  {meta.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Settlement currency</Label>
            <p className="text-xs text-muted-foreground">All balances and settlements will be in this currency</p>
            <div className="relative">
              <button
                type="button"
                onClick={() => setCurrencyOpen(!currencyOpen)}
                className="w-full flex items-center gap-2 h-10 px-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/8 transition-colors text-sm font-medium"
              >
                <span className="text-base">{baseCurrencyMeta.symbol}</span>
                <span>{baseCurrency}</span>
                <span className="text-muted-foreground font-normal text-xs flex-1 text-left">{baseCurrencyMeta.name}</span>
                <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
              {currencyOpen && (
                <div className="absolute top-11 left-0 z-50 glass-strong border border-white/10 rounded-xl overflow-hidden w-full shadow-xl max-h-52 overflow-y-auto">
                  {SUPPORTED_CURRENCIES.map((c) => (
                    <button
                      key={c.code}
                      type="button"
                      onClick={() => { setValue('base_currency', c.code); setCurrencyOpen(false) }}
                      className={cn(
                        'w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left transition-colors',
                        baseCurrency === c.code ? 'bg-primary/15 text-primary' : 'hover:bg-white/5 text-foreground'
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
          </div>

          <div className="space-y-1.5">
            <Label>Description <span className="text-muted-foreground">(optional)</span></Label>
            <Input
              placeholder="What's this group for?"
              className="bg-white/5 border-white/10"
              {...register('description')}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="ghost"
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 gradient-teal text-[#0a0f1e] font-semibold"
              disabled={isSubmitting}
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Group'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
