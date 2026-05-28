import { getAuthUser } from '@/lib/auth'
import { PersonalDashboard } from '@/components/finance/personal-dashboard'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'My Finance' }

export default async function PersonalPage() {
  const user = await getAuthUser()
  if (!user) return null
  return <PersonalDashboard userId={user.id} />
}
