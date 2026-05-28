import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { getAuthUser } from '@/lib/auth'
import { DashboardStats } from '@/components/dashboard/dashboard-stats'
import { RecentActivity } from '@/components/dashboard/recent-activity'
import { QuickActions } from '@/components/dashboard/quick-actions'
import { GroupsSummary } from '@/components/dashboard/groups-summary'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Dashboard' }

export default async function DashboardPage() {
  const user = await getAuthUser()
  if (!user) return null

  const supabase = await createClient()
  const { data: profileData } = await supabase
    .from('users')
    .select('full_name')
    .eq('id', user.id)
    .single()
  const firstName = profileData?.full_name?.split(' ')[0] ?? 'there'

  return (
    <div className="max-w-6xl mx-auto">
      {/* Greeting */}
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold">
          Hey, {firstName} 👋
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Here&apos;s what&apos;s happening with your money.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        {/* Left column — stats + quick actions */}
        <div className="lg:col-span-2 space-y-4 md:space-y-6">
          <Suspense fallback={<StatsSkeleton />}>
            <DashboardStats userId={user.id} />
          </Suspense>

          <Suspense fallback={<div className="h-40 glass rounded-2xl skeleton-shimmer" />}>
            <GroupsSummary userId={user.id} />
          </Suspense>
        </div>

        {/* Right column — activity + quick actions */}
        <div className="space-y-4 md:space-y-6">
          <QuickActions />

          <Suspense fallback={<div className="h-80 glass rounded-2xl skeleton-shimmer" />}>
            <RecentActivity userId={user.id} />
          </Suspense>
        </div>
      </div>
    </div>
  )
}

function StatsSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="h-28 glass rounded-2xl skeleton-shimmer" />
      ))}
    </div>
  )
}
