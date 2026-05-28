'use client'

import { useState, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { Camera, Loader2, Zap, LogOut, Check } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { createClient } from '@/lib/supabase/client'
import { validateUpiId } from '@/lib/utils/upi'
import { getInitials } from '@/lib/utils/formatters'
import type { UserProfile } from '@/types/database'

const schema = z.object({
  full_name: z.string().min(2, 'Too short').max(60),
  upi_id: z.string().refine((v) => v === '' || validateUpiId(v), 'Invalid UPI ID format').optional(),
})

type FormData = z.infer<typeof schema>

interface Props {
  profile: UserProfile
  userEmail: string
}

export function ProfileSettings({ profile, userEmail }: Props) {
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url ?? '')
  const [uploading, setUploading] = useState(false)
  const [saved, setSaved] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const supabase = createClient()

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      full_name: profile.full_name ?? '',
      upi_id: profile.upi_id ?? '',
    },
  })

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const ext = file.name.split('.').pop()
      const path = `${profile.id}/avatar.${ext}`
      await supabase.storage.from('avatars').upload(path, file, { upsert: true })
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
      setAvatarUrl(publicUrl)
      await supabase.from('users').update({ avatar_url: publicUrl }).eq('id', profile.id)
      toast.success('Avatar updated!')
    } catch {
      toast.error('Failed to update avatar')
    } finally {
      setUploading(false)
    }
  }

  async function onSubmit(data: FormData) {
    const { error } = await supabase
      .from('users')
      .update({
        full_name: data.full_name,
        upi_id: data.upi_id || null,
      })
      .eq('id', profile.id)

    if (error) {
      toast.error('Failed to save changes')
      return
    }

    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    toast.success('Profile updated!')
    router.refresh()
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="max-w-lg mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Profile</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage your account and preferences</p>
      </div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-2xl p-6 mb-4">
        {/* Avatar */}
        <div className="flex flex-col items-center mb-6">
          <button type="button" onClick={() => fileRef.current?.click()} className="relative group">
            <Avatar className="w-20 h-20">
              <AvatarImage src={avatarUrl} />
              <AvatarFallback className="bg-primary/20 text-primary text-2xl font-bold">
                {getInitials(profile.full_name ?? 'U')}
              </AvatarFallback>
            </Avatar>
            <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              {uploading ? <Loader2 className="w-5 h-5 animate-spin text-white" /> : <Camera className="w-5 h-5 text-white" />}
            </div>
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
          <p className="text-xs text-muted-foreground mt-2">{userEmail}</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Full name</Label>
            <Input className="bg-white/5 border-white/10" {...register('full_name')} />
            {errors.full_name && <p className="text-destructive text-xs">{errors.full_name.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-primary" /> UPI ID
            </Label>
            <Input
              placeholder="yourname@upi or 9876543210@ybl"
              className="bg-white/5 border-white/10 font-mono text-sm"
              {...register('upi_id')}
            />
            {errors.upi_id && <p className="text-destructive text-xs">{errors.upi_id.message}</p>}
            <p className="text-xs text-muted-foreground">
              Friends see this when settling up with you. Supports all UPI apps.
            </p>
          </div>

          <Button type="submit" className="w-full gradient-teal text-[#0a0f1e] font-semibold" disabled={isSubmitting}>
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : saved ? (
              <><Check className="w-4 h-4 mr-1.5" /> Saved!</>
            ) : (
              'Save Changes'
            )}
          </Button>
        </form>
      </motion.div>

      {/* Sign out */}
      <Button
        variant="outline"
        className="w-full border-rose-400/30 text-rose-400 hover:bg-rose-400/10"
        onClick={handleSignOut}
      >
        <LogOut className="w-4 h-4 mr-2" /> Sign Out
      </Button>

      {/* App version */}
      <p className="text-center text-xs text-muted-foreground mt-6">
        DutchIt v1.0.0 · MIT License · Open Source
      </p>
    </div>
  )
}
