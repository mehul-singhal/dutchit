'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { UserPlus, Mail, Crown, MoreVertical, UserMinus } from 'lucide-react'
import { toast } from 'sonner'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { createClient } from '@/lib/supabase/client'
import { getInitials } from '@/lib/utils/formatters'
import type { MemberRole } from '@/types/database'

interface Props {
  groupId: string
  userId: string
  userRole: MemberRole
}

export function GroupMembers({ groupId, userId, userRole }: Props) {
  const [inviteOpen, setInviteOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [inviting, setInviting] = useState(false)
  const supabase = createClient()
  const queryClient = useQueryClient()

  const { data: members, isLoading } = useQuery({
    queryKey: ['group-members', groupId],
    queryFn: async () => {
      const { data: raw } = await supabase
        .from('group_members')
        .select('id, role, joined_at, users(*)')
        .eq('group_id', groupId)
      const data = raw as Array<{
        id: string
        role: import('@/types/database').MemberRole
        joined_at: string
        users: { id: string; full_name: string | null; avatar_url: string | null; upi_id: string | null } | null
      }> | null
      return data ?? []
    },
  })

  async function inviteByEmail() {
    setInviting(true)
    try {
      // Find user by email from auth (only works with admin API — skip, use invite link instead)
      // For now, look up in public.users (email is in auth.users, not public.users)
      // We'll just show the group invite code message
      toast.info(
        `Share the invite code or link with ${email}. They can join using it!`,
        { duration: 5000 }
      )
      setEmail('')
      setInviteOpen(false)
    } finally {
      setInviting(false)
    }
  }

  async function removeMember(memberId: string, memberUserId: string) {
    if (memberUserId === userId) {
      const confirm = window.confirm('Leave this group? You can rejoin with the invite code.')
      if (!confirm) return
    }
    const { error } = await supabase
      .from('group_members')
      .delete()
      .eq('id', memberId)

    if (error) {
      toast.error('Failed to remove member')
      return
    }
    queryClient.invalidateQueries({ queryKey: ['group-members', groupId] })
    toast.success(memberUserId === userId ? 'You left the group' : 'Member removed')
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => <div key={i} className="h-14 glass rounded-xl skeleton-shimmer" />)}
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">{members?.length ?? 0} members</p>
        {userRole === 'admin' && (
          <Button
            size="sm"
            variant="outline"
            className="border-white/10 hover:bg-white/5 gap-1.5"
            onClick={() => setInviteOpen(true)}
          >
            <UserPlus className="w-3.5 h-3.5" /> Add Member
          </Button>
        )}
      </div>

      <div className="space-y-2">
        {members?.map((member, i) => {
          const user = member.users
          return (
            <motion.div
              key={member.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="glass rounded-xl p-3 flex items-center gap-3"
            >
              <Avatar className="w-9 h-9 shrink-0">
                <AvatarImage src={user?.avatar_url ?? undefined} />
                <AvatarFallback className="bg-primary/20 text-primary text-xs font-semibold">
                  {getInitials(user?.full_name ?? '?')}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-medium truncate">
                    {user?.full_name ?? 'Unknown'}
                    {user?.id === userId && <span className="text-muted-foreground"> (you)</span>}
                  </p>
                  {member.role === 'admin' && <Crown className="w-3.5 h-3.5 text-amber-400" />}
                </div>
                {user?.upi_id && (
                  <p className="text-xs text-muted-foreground truncate">{user.upi_id}</p>
                )}
              </div>
              <Badge
                variant="outline"
                className={`shrink-0 text-[10px] ${member.role === 'admin' ? 'border-amber-400/40 text-amber-400' : 'border-white/20 text-muted-foreground'}`}
              >
                {member.role}
              </Badge>
              {(userRole === 'admin' || user?.id === userId) && (
                <DropdownMenu>
                  <DropdownMenuTrigger className="inline-flex items-center justify-center w-7 h-7 shrink-0 rounded-md hover:bg-white/10 transition-colors">
                    <MoreVertical className="w-3.5 h-3.5" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-[#111827] border-white/10">
                    <DropdownMenuItem
                      className="text-rose-400 hover:text-rose-300 hover:bg-rose-400/10 cursor-pointer"
                      onClick={() => removeMember(member.id, user?.id ?? '')}
                    >
                      <UserMinus className="w-3.5 h-3.5 mr-2" />
                      {user?.id === userId ? 'Leave group' : 'Remove member'}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </motion.div>
          )
        })}
      </div>

      {/* Invite dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="glass-strong border-white/10 text-foreground max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Member</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="friend@example.com"
                    type="email"
                    className="pl-9 bg-white/5 border-white/10"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <Button
                  className="gradient-teal text-[#0a0f1e] font-semibold"
                  onClick={inviteByEmail}
                  disabled={!email || inviting}
                >
                  Notify
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                This will suggest they join using the group invite code.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
