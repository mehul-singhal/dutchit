'use client'

import { Moon, Sun } from 'lucide-react'
import { useTheme } from '@/lib/theme'
import { cn } from '@/lib/utils'

interface Props {
  className?: string
  collapsed?: boolean
}

export function ThemeToggle({ className, collapsed }: Props) {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <button
      onClick={toggleTheme}
      className={cn(
        'flex items-center gap-3 px-3 py-2 rounded-xl text-muted-foreground hover:bg-white/5 hover:text-foreground transition-colors w-full',
        className
      )}
      aria-label="Toggle theme"
    >
      {isDark ? <Sun className="w-5 h-5 shrink-0" /> : <Moon className="w-5 h-5 shrink-0" />}
      {!collapsed && (
        <span className="text-sm font-medium">{isDark ? 'Light mode' : 'Dark mode'}</span>
      )}
    </button>
  )
}
