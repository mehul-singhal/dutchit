import Link from 'next/link'
import { cn } from '@/lib/utils'

interface DutchItLogoProps {
  size?: 'sm' | 'md' | 'lg'
  href?: string
  className?: string
}

const sizeMap = {
  sm: { icon: 'w-7 h-7 text-xs', text: 'text-lg' },
  md: { icon: 'w-8 h-8 text-sm', text: 'text-xl' },
  lg: { icon: 'w-12 h-12 text-base', text: 'text-3xl' },
}

export function DutchItLogo({ size = 'md', href, className }: DutchItLogoProps) {
  const sizes = sizeMap[size]

  const content = (
    <div className={cn('flex items-center gap-2.5', className)}>
      {/* Logo icon: coin with lightning bolt split */}
      <div
        className={cn(
          'relative rounded-xl gradient-teal flex items-center justify-center font-bold text-[#0a0f1e] glow-teal-sm flex-shrink-0',
          sizes.icon
        )}
      >
        <span className="font-black tracking-tighter leading-none">D|</span>
      </div>
      <span className={cn('font-black tracking-tight text-gradient', sizes.text)}>
        DutchIt
      </span>
    </div>
  )

  if (href) {
    return <Link href={href}>{content}</Link>
  }
  return content
}
