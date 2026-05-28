'use client'

import { usePathname } from 'next/navigation'
import { DutchItLogo } from '@/components/layout/dutchit-logo'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { getInitials } from '@/lib/utils/formatters'
import type { UserProfile } from '@/types/database'
import Link from 'next/link'

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/groups': 'Groups',
  '/personal': 'My Finance',
  '/profile': 'Profile',
}

interface Props {
  user: UserProfile
}

export function MobileHeader({ user }: Props) {
  const pathname = usePathname()
  const title = PAGE_TITLES[pathname] ?? 'DutchIt'

  return (
    <header className="md:hidden flex items-center justify-between px-4 h-14 glass-strong border-b border-white/8 sticky top-0 z-40">
      <DutchItLogo size="sm" href="/dashboard" />
      <h1 className="text-sm font-semibold absolute left-1/2 -translate-x-1/2">{title}</h1>
      <Link href="/profile">
        <Avatar className="w-8 h-8">
          <AvatarImage src={user.avatar_url ?? undefined} />
          <AvatarFallback className="bg-primary/20 text-primary text-xs font-semibold">
            {getInitials(user.full_name ?? 'U')}
          </AvatarFallback>
        </Avatar>
      </Link>
    </header>
  )
}
