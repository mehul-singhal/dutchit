'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Search } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { GroupCard } from '@/components/groups/group-card'
import { CreateGroupDialog } from '@/components/groups/create-group-dialog'
import { JoinGroupDialog } from '@/components/groups/join-group-dialog'
import type { Group } from '@/types/database'

interface Props {
  userId: string
}

export function GroupsList({ userId }: Props) {
  const [search, setSearch] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [joinOpen, setJoinOpen] = useState(false)
  const [prefillCode, setPrefillCode] = useState('')
  const searchParams = useSearchParams()
  const supabase = createClient()
  const queryClient = useQueryClient()

  // Auto-open join dialog when ?join=CODE is in the URL
  useEffect(() => {
    const code = searchParams.get('join')
    if (code) {
      setPrefillCode(code.toUpperCase())
      setJoinOpen(true)
    }
  }, [searchParams])

  const { data: groups, isLoading } = useQuery({
    queryKey: ['groups', userId],
    queryFn: async () => {
      const { data: raw } = await supabase
        .from('group_members')
        .select('groups(*)')
        .eq('user_id', userId)

      const data = raw as Array<{ groups: Group | null }> | null
      return (data?.map((m) => m.groups).filter(Boolean) as Group[]) ?? []
    },
  })

  const filtered = groups?.filter((g) =>
    g.name.toLowerCase().includes(search.toLowerCase())
  ) ?? []

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Groups</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {groups?.length ?? 0} group{groups?.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="border-white/10 hover:bg-white/5"
            onClick={() => setJoinOpen(true)}
          >
            Join
          </Button>
          <Button
            size="sm"
            className="gradient-teal text-[#0a0f1e] font-semibold"
            onClick={() => setCreateOpen(true)}
          >
            <Plus className="w-4 h-4 mr-1" /> New Group
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search groups..."
          className="pl-9 bg-white/5 border-white/10 h-10"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Groups grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-40 glass rounded-2xl skeleton-shimmer" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-16"
        >
          <div className="text-5xl mb-4">👀</div>
          <p className="text-lg font-semibold mb-1">
            {search ? 'No groups found' : 'No groups yet'}
          </p>
          <p className="text-sm text-muted-foreground mb-6">
            {search
              ? 'Try a different search term'
              : "No expenses yet — someone's being suspiciously generous"}
          </p>
          {!search && (
            <Button
              className="gradient-teal text-[#0a0f1e] font-semibold"
              onClick={() => setCreateOpen(true)}
            >
              <Plus className="w-4 h-4 mr-1" /> Create First Group
            </Button>
          )}
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {filtered.map((group, i) => (
              <motion.div
                key={group.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: i * 0.06 }}
              >
                <GroupCard group={group} userId={userId} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      <CreateGroupDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        userId={userId}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['groups'] })
          setCreateOpen(false)
        }}
      />
      <JoinGroupDialog
        open={joinOpen}
        onOpenChange={setJoinOpen}
        userId={userId}
        prefillCode={prefillCode}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['groups'] })
          setJoinOpen(false)
        }}
      />
    </div>
  )
}
