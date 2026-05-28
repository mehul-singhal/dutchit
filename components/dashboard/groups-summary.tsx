'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { Users, ChevronRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { GROUP_CATEGORY_META } from '@/components/groups/group-category-meta'
import { formatINR } from '@/lib/utils/formatters'
import type { Group } from '@/types/database'

interface Props {
  userId: string
}

export function GroupsSummary({ userId }: Props) {
  const supabase = createClient()

  const { data: groups, isLoading } = useQuery({
    queryKey: ['groups-summary', userId],
    queryFn: async () => {
      const { data: raw } = await supabase
        .from('group_members')
        .select('groups(*)')
        .eq('user_id', userId)
        .limit(5)

      const data = raw as Array<{ groups: Group | null }> | null
      return (data?.map((m) => m.groups).filter(Boolean) as Group[]) ?? []
    },
  })

  if (isLoading) {
    return <div className="h-40 glass rounded-2xl skeleton-shimmer" />
  }

  if (!groups?.length) {
    return (
      <div className="glass rounded-2xl p-8 text-center">
        <div className="text-4xl mb-3">👀</div>
        <p className="text-sm font-medium text-foreground">No groups yet</p>
        <p className="text-xs text-muted-foreground mt-1">
          No expenses yet — someone&apos;s being suspiciously generous
        </p>
        <Link
          href="/groups?create=true"
          className="inline-block mt-4 text-sm text-primary hover:underline"
        >
          Create your first group →
        </Link>
      </div>
    )
  }

  return (
    <div className="glass rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Your Groups
        </h3>
        <Link href="/groups" className="text-xs text-primary hover:underline">
          View all
        </Link>
      </div>

      <div className="space-y-2">
        {groups.map((group, i) => {
          const meta = GROUP_CATEGORY_META[group.category]
          return (
            <motion.div
              key={group.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03 }}
            >
              <Link
                href={`/groups/${group.id}`}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 transition-colors group"
              >
                <span className="text-xl">{meta.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{group.name}</p>
                  <p className="text-xs text-muted-foreground">{meta.label}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              </Link>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
