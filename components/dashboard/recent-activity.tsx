'use client'

import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { formatRelative } from '@/lib/utils/formatters'
import { Receipt, HandCoins } from 'lucide-react'

interface Props {
  userId: string
}

export function RecentActivity({ userId }: Props) {
  const supabase = createClient()

  const { data: activities, isLoading } = useQuery({
    queryKey: ['recent-activity', userId],
    queryFn: async () => {
      // Get groups user is in
      const { data: memberships } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', userId)

      const groupIds = memberships?.map((m) => m.group_id) ?? []
      if (!groupIds.length) return []

      // Recent expenses
      const { data: expensesRaw } = await supabase
        .from('expenses')
        .select('id, title, amount, created_at, paid_by, users!expenses_paid_by_fkey(full_name)')
        .in('group_id', groupIds)
        .order('created_at', { ascending: false })
        .limit(5)

      const expenses = expensesRaw as Array<{
        id: string
        title: string
        amount: number
        created_at: string
        paid_by: string
        users: { full_name: string } | null
      }> | null

      // Recent settlements
      const { data: settlementsRaw } = await supabase
        .from('settlements')
        .select('id, amount, status, created_at, paid_by, paid_to, payer:users!settlements_paid_by_fkey(full_name), recipient:users!settlements_paid_to_fkey(full_name)')
        .in('group_id', groupIds)
        .order('created_at', { ascending: false })
        .limit(5)

      const settlements = settlementsRaw as Array<{
        id: string
        amount: number
        status: string
        created_at: string
        paid_by: string
        paid_to: string
        payer: { full_name: string } | null
        recipient: { full_name: string } | null
      }> | null

      const items = [
        ...(expenses ?? []).map((e) => ({
          id: e.id,
          type: 'expense' as const,
          label: `${e.users?.full_name ?? 'Someone'} added "${e.title}"`,
          amount: e.amount,
          at: e.created_at,
        })),
        ...(settlements ?? []).map((s) => ({
          id: s.id,
          type: 'settlement' as const,
          label: `${s.payer?.full_name ?? 'Someone'} paid ${s.recipient?.full_name ?? 'someone'}`,
          amount: s.amount,
          at: s.created_at,
        })),
      ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()).slice(0, 8)

      return items
    },
  })

  if (isLoading) {
    return <div className="h-80 glass rounded-2xl skeleton-shimmer" />
  }

  return (
    <div className="glass rounded-2xl p-4">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
        Recent Activity
      </h3>

      {!activities?.length ? (
        <div className="py-8 text-center">
          <p className="text-2xl mb-2">🎉</p>
          <p className="text-sm text-muted-foreground">All quiet on the expense front!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {activities.map((item, i) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="flex items-start gap-3 py-2"
            >
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                item.type === 'expense' ? 'bg-indigo-400/15 text-indigo-400' : 'bg-emerald-400/15 text-emerald-400'
              }`}>
                {item.type === 'expense' ? (
                  <Receipt className="w-3.5 h-3.5" />
                ) : (
                  <HandCoins className="w-3.5 h-3.5" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-foreground leading-snug">{item.label}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{formatRelative(item.at)}</p>
              </div>
              <span className="text-xs font-semibold text-foreground shrink-0">
                ₹{item.amount.toLocaleString('en-IN')}
              </span>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
