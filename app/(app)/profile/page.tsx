import { createClient } from '@/lib/supabase/server'
import { ProfileSettings } from '@/components/profile/profile-settings'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Profile' }

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase.from('users').select('*').eq('id', user.id).single()
  if (!profile) return null

  return <ProfileSettings profile={profile} userEmail={user.email ?? ''} />
}
