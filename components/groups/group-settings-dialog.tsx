'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, Trash2, ChevronDown } from 'lucide-react'
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
import { Textarea } from '@/components/ui/textarea'
import { createClient } from '@/lib/supabase/client'
import { SUPPORTED_CURRENCIES, getCurrency } from '@/lib/utils/currency'
import type { Group, MemberRole } from '@/types/database'
import { cn } from '@/lib/utils'

const schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(50),
  description: z.string().max(200).optional(),
  base_currency: z.string().min(1),
})

type FormData = z.infer<typeof schema>

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  group: Group
  userRole: MemberRole
  onUpdated: (updated: Partial<Group>) => void
}

export function GroupSettingsDialog({ open, onOpenChange, group, userRole, onUpdated }: Props) {
  const [deleting, setDeleting] = useState(false)
  const [currencyOpen, setCurrencyOpen] = useState(false)
  const router = useRouter()
  const supabase = createClient()
  const isAdmin = userRole === 'admin'

  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: group.name,
      description: group.description ?? '',
      base_currency: group.base_currency ?? 'INR',
    },
  })

  const baseCurrency = watch('base_currency')
  const baseCurrencyMeta = getCurrency(baseCurrency)

  async function onSubmit(data: FormData) {
    const currencyChanged = isAdmin && data.base_currency !== (group.base_currency ?? 'INR')

    if (currencyChanged) {
      // Check if group has any expenses
      const { count } = await supabase
        .from('expenses')
        .select('*', { count: 'exact', head: true })
        .eq('group_id', group.id)

      if ((count ?? 0) > 0) {
        const confirmed = window.confirm(
          `Changing the settlement currency from ${group.base_currency ?? 'INR'} to ${data.base_currency} won't recalculate past expenses. Balances may appear inconsistent until all expenses are re-entered. Continue?`
        )
        if (!confirmed) return
      }
    }

    const update: Partial<Group> = {
      name: data.name,
      description: data.description || null,
    }
    if (isAdmin) {
      update.base_currency = data.base_currency
    }

    const { error } = await supabase
      .from('groups')
      .update(update)
      .eq('id', group.id)

    if (error) {
      toast.error('Failed to update group')
      return
    }

    toast.success('Group updated')
    onUpdated(update)
    onOpenChange(false)
  }

  async function deleteGroup() {
    const confirmed = window.confirm(
      `Delete "${group.name}"? This will permanently delete all expenses and balances. This cannot be undone.`
    )
    if (!confirmed) return

    setDeleting(true)
    const { error } = await supabase.from('groups').delete().eq('id', group.id)
    setDeleting(false)

    if (error) {
      toast.error('Failed to delete group')
      return
    }

    toast.success('Group deleted')
    router.push('/groups')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong border-white/10 text-foreground max-w-sm">
        <DialogHeader>
          <DialogTitle>Group Settings</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label>Group name</Label>
            <Input
              className="bg-white/5 border-white/10 h-11"
              {...register('name')}
            />
            {errors.name && <p className="text-destructive text-xs">{errors.name.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label>Description <span className="text-muted-foreground text-xs">(optional)</span></Label>
            <Textarea
              className="bg-white/5 border-white/10 resize-none"
              rows={2}
              {...register('description')}
            />
            {errors.description && <p className="text-destructive text-xs">{errors.description.message}</p>}
          </div>

          {isAdmin && (
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
          )}

          <Button
            type="submit"
            className="w-full gradient-teal text-[#0a0f1e] font-semibold"
            disabled={isSubmitting}
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Changes'}
          </Button>
        </form>

        <div className="border-t border-white/10 pt-4 mt-2">
          <p className="text-xs text-muted-foreground mb-3">Danger zone</p>
          <Button
            variant="outline"
            className="w-full border-rose-500/30 text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 gap-2"
            onClick={deleteGroup}
            disabled={deleting}
          >
            {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            Delete Group
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
