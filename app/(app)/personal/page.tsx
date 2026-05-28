import { createClient } from '@/lib/supabase/server'
import { PersonalDashboard } from '@/components/finance/personal-dashboard'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'My Finance' }

export default async function PersonalPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  return <PersonalDashboard userId={user.id} />
}
