'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, Trash2 } from 'lucide-react'
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
import type { Group } from '@/types/database'

const schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(50),
  description: z.string().max(200).optional(),
})

type FormData = z.infer<typeof schema>

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  group: Group
  onUpdated: (updated: Partial<Group>) => void
}

export function GroupSettingsDialog({ open, onOpenChange, group, onUpdated }: Props) {
  const [deleting, setDeleting] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: group.name,
      description: group.description ?? '',
    },
  })

  async function onSubmit(data: FormData) {
    const { error } = await supabase
      .from('groups')
      .update({ name: data.name, description: data.description || null })
      .eq('id', group.id)

    if (error) {
      toast.error('Failed to update group')
      return
    }

    toast.success('Group updated')
    onUpdated({ name: data.name, description: data.description || null })
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
