import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { GroupDetail } from '@/components/groups/group-detail'
import type { Metadata } from 'next'

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()
  const { data } = await supabase.from('groups').select('name').eq('id', id).single()
  const d = data as { name: string } | null
  return { title: d?.name ?? 'Group' }
}

export default async function GroupPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: groupData } = await supabase
    .from('groups')
    .select('*')
    .eq('id', id)
    .single()
  const group = groupData as import('@/types/database').Group | null

  if (!group) notFound()

  // Verify membership
  const { data: membershipData } = await supabase
    .from('group_members')
    .select('role')
    .eq('group_id', id)
    .eq('user_id', user.id)
    .single()
  const membership = membershipData as { role: import('@/types/database').MemberRole } | null

  if (!membership) redirect('/groups')

  return <GroupDetail group={group} userId={user.id} userRole={membership.role} />
}
