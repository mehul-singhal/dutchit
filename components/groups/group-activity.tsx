'use client'

import { useEffect, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Receipt, HandCoins, UserPlus } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatRelative } from '@/lib/utils/formatters'
import { formatCurrency } from '@/lib/utils/currency'

interface Props {
  groupId: string
  baseCurrency?: string
}

export function GroupActivity({ groupId, baseCurrency = 'INR' }: Props) {
  const supabase = createClient()
  const queryClient = useQueryClient()
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  const { data: activities, isLoading } = useQuery({
    queryKey: ['group-activity', groupId],
    queryFn: async () => {
      const { data: expensesRaw } = await supabase
        .from('expenses')
        .select('id, title, amount, created_at, created_by, category, users!expenses_created_by_fkey(full_name)')
        .eq('group_id', groupId)
        .order('created_at', { ascending: false })
        .limit(30)

      const expenses = expensesRaw as Array<{
        id: string
        title: string
        amount: number
        created_at: string
        created_by: string
        category: string
        users: { full_name: string } | null
      }> | null

      const { data: settlementsRaw } = await supabase
        .from('settlements')
        .select('id, amount, status, created_at, payment_app, payer:users!settlements_paid_by_fkey(full_name), recipient:users!settlements_paid_to_fkey(full_name)')
        .eq('group_id', groupId)
        .order('created_at', { ascending: false })
        .limit(30)

      const settlements = settlementsRaw as Array<{
        id: string
        amount: number
        status: string
        created_at: string
        payment_app: string | null
        payer: { full_name: string } | null
        recipient: { full_name: string } | null
      }> | null

      const { data: joinsRaw } = await supabase
        .from('group_members')
        .select('id, joined_at, users(full_name)')
        .eq('group_id', groupId)
        .order('joined_at', { ascending: false })
        .limit(10)

      const joins = joinsRaw as Array<{
        id: string
        joined_at: string
        users: { full_name: string } | null
      }> | null

      const items = [
        ...(expenses ?? []).map((e) => ({
          id: e.id,
          type: 'expense' as const,
          icon: Receipt,
          color: 'text-indigo-400',
          bg: 'bg-indigo-400/15',
          label: `${e.users?.full_name ?? 'Someone'} added "${e.title}"`,
          sub: formatCurrency(e.amount, baseCurrency),
          at: e.created_at,
        })),
        ...(settlements ?? []).map((s) => ({
          id: s.id,
          type: 'settlement' as const,
          icon: HandCoins,
          color: 'text-emerald-400',
          bg: 'bg-emerald-400/15',
          label: `${s.payer?.full_name ?? 'Someone'} paid ${s.recipient?.full_name ?? 'someone'}${s.payment_app ? ` via ${s.payment_app}` : ''}`,
          sub: `${formatCurrency(s.amount, baseCurrency)} · ${s.status.replace('_', ' ')}`,
          at: s.created_at,
        })),
        ...(joins ?? []).map((j) => ({
          id: j.id,
          type: 'join' as const,
          icon: UserPlus,
          color: 'text-amber-400',
          bg: 'bg-amber-400/15',
          label: `${j.users?.full_name ?? 'Someone'} joined the group`,
          sub: '',
          at: j.joined_at,
        })),
      ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())

      return items
    },
  })

  // Real-time subscription
  useEffect(() => {
    channelRef.current = supabase
      .channel(`group-activity-${groupId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'expenses', filter: `group_id=eq.${groupId}` },
        () => queryClient.invalidateQueries({ queryKey: ['group-activity', groupId] })
      )
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'settlements', filter: `group_id=eq.${groupId}` },
        () => queryClient.invalidateQueries({ queryKey: ['group-activity', groupId] })
      )
      .subscribe()

    return () => {
      channelRef.current?.unsubscribe()
    }
  }, [groupId, supabase, queryClient])

  if (isLoading) {
    return <div className="space-y-2">{[1,2,3,4].map(i => <div key={i} className="h-12 glass rounded-xl skeleton-shimmer" />)}</div>
  }

  if (!activities?.length) {
    return (
      <div className="text-center py-12">
        <div className="text-4xl mb-3">📝</div>
        <p className="font-semibold">Nothing yet</p>
        <p className="text-sm text-muted-foreground mt-1">Group activity will appear here as things happen.</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {activities.map((item, i) => {
        const Icon = item.icon
        return (
          <motion.div
            key={`${item.type}-${item.id}`}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i * 0.03, 0.3) }}
            className="glass rounded-xl p-3 flex items-start gap-3"
          >
            <div className={`w-8 h-8 rounded-lg ${item.bg} flex items-center justify-center shrink-0 mt-0.5`}>
              <Icon className={`w-4 h-4 ${item.color}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-foreground">{item.label}</p>
              {item.sub && <p className="text-xs text-muted-foreground mt-0.5">{item.sub}</p>}
            </div>
            <span className="text-[10px] text-muted-foreground shrink-0 mt-1">
              {formatRelative(item.at)}
            </span>
          </motion.div>
        )
      })}
    </div>
  )
}
