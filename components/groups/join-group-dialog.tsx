'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, Link as LinkIcon } from 'lucide-react'
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

const schema = z.object({
  inviteCode: z.string().length(12, 'Invite codes are 12 characters'),
})

type FormData = z.infer<typeof schema>

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId: string
  prefillCode?: string
  onSuccess: () => void
}

export function JoinGroupDialog({ open, onOpenChange, userId, prefillCode, onSuccess }: Props) {
  const supabase = createClient()

  const { register, handleSubmit, reset, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  // Pre-fill the code when opened via invite link
  useEffect(() => {
    if (prefillCode) {
      setValue('inviteCode', prefillCode)
    }
  }, [prefillCode, setValue])

  async function onSubmit(data: FormData) {
    // Find group by invite code
    const { data: group, error } = await supabase
      .from('groups')
      .select('id, name')
      .eq('invite_code', data.inviteCode.toLowerCase())
      .maybeSingle()

    if (error || !group) {
      toast.error('Invalid invite code. Double-check and try again!')
      return
    }

    // Check if already a member
    const { data: existing } = await supabase
      .from('group_members')
      .select('id')
      .eq('group_id', group.id)
      .eq('user_id', userId)
      .maybeSingle()

    if (existing) {
      toast.info(`You're already in "${group.name}"!`)
      onOpenChange(false)
      return
    }

    const { error: joinError } = await supabase.from('group_members').insert({
      group_id: group.id,
      user_id: userId,
      role: 'member',
    })

    if (joinError) {
      toast.error('Failed to join group')
      return
    }

    toast.success(`Joined "${group.name}"! 🎉`)
    reset()
    onSuccess()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong border-white/10 text-foreground max-w-md">
        <DialogHeader>
          <DialogTitle>Join a group</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label>Invite code</Label>
            <div className="relative">
              <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="e.g. ABC123DEF456"
                className="pl-9 bg-white/5 border-white/10 h-11 tracking-widest"
                {...register('inviteCode')}
              />
            </div>
            {errors.inviteCode && (
              <p className="text-destructive text-xs">{errors.inviteCode.message}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Ask your group admin to share the invite code or link.
            </p>
          </div>

          <div className="flex gap-3">
            <Button type="button" variant="ghost" className="flex-1" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 gradient-teal text-[#0a0f1e] font-semibold"
              disabled={isSubmitting}
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Join Group'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
