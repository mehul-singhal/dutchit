import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { GroupsList } from '@/components/groups/groups-list'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Groups' }

export default async function GroupsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  return (
    <Suspense>
      <GroupsList userId={user.id} />
    </Suspense>
  )
}
