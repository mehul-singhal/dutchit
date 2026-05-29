'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Settings, Share2, Copy, Check } from 'lucide-react'
import { toast } from 'sonner'
import { GROUP_CATEGORY_META } from '@/components/groups/group-category-meta'
import { GroupExpenses } from '@/components/expenses/group-expenses'
import { GroupBalances } from '@/components/groups/group-balances'
import { GroupMembers } from '@/components/groups/group-members'
import { GroupActivity } from '@/components/groups/group-activity'
import { GroupSettingsDialog } from '@/components/groups/group-settings-dialog'
import { GroupExportButton } from '@/components/groups/group-export-button'
import { GroupAnalytics } from '@/components/groups/group-analytics'
import type { Group, MemberRole } from '@/types/database'

interface Props {
  group: Group
  userId: string
  userRole: MemberRole
}

export function GroupDetail({ group: initialGroup, userId, userRole }: Props) {
  const [copied, setCopied] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [group, setGroup] = useState(initialGroup)
  const meta = GROUP_CATEGORY_META[group.category]

  async function copyInviteLink() {
    const url = `${window.location.origin}/groups?join=${group.invite_code}`
    await navigator.clipboard.writeText(url)
    setCopied(true)
    toast.success('Invite link copied!')
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Group header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-start gap-4 mb-6"
      >
        <div className="w-14 h-14 rounded-2xl bg-white/8 flex items-center justify-center text-3xl shrink-0">
          {meta.emoji}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold">{group.name}</h1>
            <Badge variant="outline" className="border-white/20 text-muted-foreground text-xs">
              {meta.label}
            </Badge>
            {userRole === 'admin' && (
              <Badge className="bg-primary/20 text-primary border-primary/30 text-xs">Admin</Badge>
            )}
          </div>
          {group.description && (
            <p className="text-sm text-muted-foreground mt-1">{group.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <GroupExportButton groupId={group.id} groupName={group.name} />
          <Button
            variant="outline"
            size="sm"
            className="border-white/10 hover:bg-white/5 gap-1.5"
            onClick={copyInviteLink}
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Share2 className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">Invite</span>
          </Button>
          {userRole === 'admin' && (
            <Button
              variant="outline"
              size="icon"
              className="border-white/10 hover:bg-white/5 w-8 h-8"
              onClick={() => setSettingsOpen(true)}
            >
              <Settings className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </motion.div>

      {/* Invite code display */}
      <div className="glass rounded-xl px-4 py-2.5 flex items-center gap-3 mb-6 text-xs">
        <Copy className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-muted-foreground">Invite code:</span>
        <code className="font-mono text-primary tracking-widest">{group.invite_code}</code>
        <button onClick={copyInviteLink} className="ml-auto text-muted-foreground hover:text-foreground">
          {copied ? <Check className="w-3.5 h-3.5 text-primary" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="expenses">
        <TabsList className="bg-white/5 border border-white/8 mb-6 w-full sm:w-auto">
          <TabsTrigger value="expenses" className="data-[state=active]:bg-primary data-[state=active]:text-[#0a0f1e]">
            Expenses
          </TabsTrigger>
          <TabsTrigger value="balances" className="data-[state=active]:bg-primary data-[state=active]:text-[#0a0f1e]">
            Balances
          </TabsTrigger>
          <TabsTrigger value="analytics" className="data-[state=active]:bg-primary data-[state=active]:text-[#0a0f1e]">
            Analytics
          </TabsTrigger>
          <TabsTrigger value="members" className="data-[state=active]:bg-primary data-[state=active]:text-[#0a0f1e]">
            Members
          </TabsTrigger>
          <TabsTrigger value="activity" className="data-[state=active]:bg-primary data-[state=active]:text-[#0a0f1e]">
            Activity
          </TabsTrigger>
        </TabsList>

        <TabsContent value="expenses">
          <GroupExpenses groupId={group.id} userId={userId} userRole={userRole} groupBaseCurrency={group.base_currency ?? 'INR'} />
        </TabsContent>
        <TabsContent value="balances">
          <GroupBalances groupId={group.id} userId={userId} baseCurrency={group.base_currency ?? 'INR'} />
        </TabsContent>
        <TabsContent value="analytics">
          <GroupAnalytics groupId={group.id} userId={userId} baseCurrency={group.base_currency ?? 'INR'} />
        </TabsContent>
        <TabsContent value="members">
          <GroupMembers groupId={group.id} userId={userId} userRole={userRole} />
        </TabsContent>
        <TabsContent value="activity">
          <GroupActivity groupId={group.id} baseCurrency={group.base_currency ?? 'INR'} />
        </TabsContent>
      </Tabs>

      {userRole === 'admin' && (
        <GroupSettingsDialog
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
          group={group}
          userRole={userRole}
          onUpdated={(updated) => setGroup((prev) => ({ ...prev, ...updated }))}
        />
      )}
    </div>
  )
}
