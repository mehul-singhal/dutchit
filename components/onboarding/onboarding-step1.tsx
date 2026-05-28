'use client'

import { useState, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { Camera, Loader2, User, ArrowRight } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import { getInitials } from '@/lib/utils/formatters'

const schema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters').max(60, 'Too long!'),
})

type FormData = z.infer<typeof schema>

interface Props {
  onComplete: (data: { fullName: string; avatarUrl: string }) => void
}

export function OnboardingStep1({ onComplete }: Props) {
  const [avatarUrl, setAvatarUrl] = useState('')
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const name = watch('fullName', '')

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const ext = file.name.split('.').pop()
      const path = `${user.id}/avatar.${ext}`

      const { error } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true })

      if (error) throw error

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(path)

      setAvatarUrl(publicUrl)
      toast.success('Avatar uploaded!')
    } catch {
      toast.error('Failed to upload photo. Skip for now.')
    } finally {
      setUploading(false)
    }
  }

  function onSubmit(data: FormData) {
    onComplete({ fullName: data.fullName, avatarUrl })
  }

  return (
    <div className="glass rounded-2xl p-8 shadow-2xl">
      <h2 className="text-2xl font-bold mb-1">What should we call you?</h2>
      <p className="text-muted-foreground text-sm mb-6">
        Your friends will see this when you add expenses.
      </p>

      {/* Avatar upload */}
      <div className="flex flex-col items-center mb-6">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="relative group"
        >
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center text-[#0a0f1e] text-2xl font-bold overflow-hidden">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
            ) : name ? (
              getInitials(name)
            ) : (
              <User className="w-8 h-8" />
            )}
          </div>
          <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            {uploading ? (
              <Loader2 className="w-5 h-5 text-white animate-spin" />
            ) : (
              <Camera className="w-5 h-5 text-white" />
            )}
          </div>
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleAvatarUpload}
        />
        <p className="text-xs text-muted-foreground mt-2">Tap to add a photo (optional)</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="fullName">Full name</Label>
          <Input
            id="fullName"
            placeholder="Rahul Sharma"
            className="bg-white/5 border-white/10 h-11"
            {...register('fullName')}
          />
          {errors.fullName && (
            <p className="text-destructive text-xs">{errors.fullName.message}</p>
          )}
        </div>

        <Button
          type="submit"
          className="w-full h-11 gradient-teal text-[#0a0f1e] font-semibold"
          disabled={isSubmitting || uploading}
        >
          Continue <ArrowRight className="w-4 h-4 ml-1" />
        </Button>
      </form>
    </div>
  )
}
