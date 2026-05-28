'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Plus, UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function QuickActions() {
  return (
    <div className="glass rounded-2xl p-4">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
        Quick Actions
      </h3>
      <div className="space-y-2">
        <Link href="/groups?create=true">
          <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
            <Button className="w-full justify-start h-10 gradient-teal text-[#0a0f1e] font-semibold">
              <Plus className="w-4 h-4 mr-2" /> New Group
            </Button>
          </motion.div>
        </Link>
        <Link href="/groups">
          <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
            <Button variant="outline" className="w-full justify-start h-10 border-white/10 hover:bg-white/5">
              <UserPlus className="w-4 h-4 mr-2" /> Join a Group
            </Button>
          </motion.div>
        </Link>
      </div>
    </div>
  )
}
