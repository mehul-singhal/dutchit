import { Suspense } from 'react'
import { getAuthUser } from '@/lib/auth'
import { GroupsList } from '@/components/groups/groups-list'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Groups' }

export default async function GroupsPage() {
  const user = await getAuthUser()
  if (!user) return null

  return (
    <Suspense>
      <GroupsList userId={user.id} />
    </Suspense>
  )
}
