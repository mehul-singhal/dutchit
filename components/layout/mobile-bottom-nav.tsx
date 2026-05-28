'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { LayoutDashboard, Users, Wallet, User, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Home', icon: LayoutDashboard },
  { href: '/groups', label: 'Groups', icon: Users },
  { href: '/personal', label: 'Finance', icon: Wallet },
  { href: '/profile', label: 'Profile', icon: User },
]

export function MobileBottomNav() {
  const pathname = usePathname()
  const router = useRouter()

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 glass-strong border-t border-white/8">
      <div className="flex items-center justify-around px-2 h-16 safe-area-bottom">
        {NAV_ITEMS.slice(0, 2).map((item) => {
          const Icon = item.icon
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-colors',
                active ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
              {active && (
                <motion.div
                  layoutId="mobile-nav-dot"
                  className="w-1 h-1 rounded-full bg-primary absolute bottom-2"
                />
              )}
            </Link>
          )
        })}

        {/* Center FAB — Add Expense */}
        <button
          onClick={() => router.push('/groups?addExpense=true')}
          className="relative -mt-6 w-14 h-14 rounded-2xl gradient-teal flex items-center justify-center glow-teal shadow-xl"
        >
          <Plus className="w-6 h-6 text-[#0a0f1e] font-bold" strokeWidth={3} />
        </button>

        {NAV_ITEMS.slice(2).map((item) => {
          const Icon = item.icon
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-colors',
                active ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
