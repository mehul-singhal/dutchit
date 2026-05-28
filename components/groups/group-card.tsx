'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { Users, ChevronRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { GROUP_CATEGORY_META } from '@/components/groups/group-category-meta'
import type { Group } from '@/types/database'

interface Props {
  group: Group
  userId: string
}

export function GroupCard({ group, userId }: Props) {
  const supabase = createClient()
  const meta = GROUP_CATEGORY_META[group.category]

  const { data: memberCount } = useQuery({
    queryKey: ['group-member-count', group.id],
    queryFn: async () => {
      const { count } = await supabase
        .from('group_members')
        .select('*', { count: 'exact', head: true })
        .eq('group_id', group.id)
      return count ?? 0
    },
  })

  const { data: balance } = useQuery({
    queryKey: ['group-balance-card', group.id, userId],
    queryFn: async () => {
      // User's splits in this group
      const { data: splitsRaw } = await supabase
        .from('expense_splits')
        .select('amount, expenses!inner(paid_by, group_id)')
        .eq('user_id', userId)
        .eq('expenses.group_id', group.id)

      const splits = splitsRaw as Array<{
        amount: number
        expenses: { paid_by: string; group_id: string }
      }> | null

      let net = 0
      for (const split of splits ?? []) {
        const expense = split.expenses as { paid_by: string; group_id: string }
        if (expense.paid_by === userId) {
          net += split.amount // wait — this is your own share
        } else {
          net -= split.amount // you owe
        }
      }
      return net
    },
  })

  return (
    <Link href={`/groups/${group.id}`}>
      <motion.div
        whileHover={{ y: -2 }}
        whileTap={{ scale: 0.98 }}
        className="glass rounded-2xl p-5 h-full cursor-pointer border border-white/5 hover:border-primary/20 transition-colors group"
      >
        <div className="flex items-start justify-between mb-4">
          <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-2xl">
            {meta.emoji}
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
        </div>

        <h3 className="font-semibold text-base mb-1 truncate">{group.name}</h3>
        <p className="text-xs text-muted-foreground mb-3">{meta.label}</p>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Users className="w-3.5 h-3.5" />
            <span>{memberCount ?? '—'} members</span>
          </div>
          {balance !== undefined && Math.abs(balance) > 0.01 && (
            <span className={`text-xs font-semibold ${balance > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {balance > 0 ? '+' : ''}₹{Math.abs(balance).toLocaleString('en-IN')}
            </span>
          )}
        </div>
      </motion.div>
    </Link>
  )
}
