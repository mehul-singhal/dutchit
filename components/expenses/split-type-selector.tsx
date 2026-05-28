'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import type { SplitType } from '@/types/database'

interface Props {
  value: SplitType
  onChange: (type: SplitType) => void
}

const SPLIT_TYPES: { value: SplitType; label: string; desc: string }[] = [
  { value: 'equal', label: 'Equal', desc: 'Split evenly among everyone' },
  { value: 'exact', label: 'Exact', desc: 'Enter specific amounts' },
  { value: 'percentage', label: '%', desc: 'Split by percentage' },
  { value: 'shares', label: 'Shares', desc: 'By ratio (1x, 2x...)' },
  { value: 'adjustment', label: 'Adjust', desc: 'Equal + adjustments' },
]

export function SplitTypeSelector({ value, onChange }: Props) {
  return (
    <div className="flex bg-white/5 rounded-xl p-1 gap-1">
      {SPLIT_TYPES.map((type) => (
        <button
          key={type.value}
          type="button"
          onClick={() => onChange(type.value)}
          className="relative flex-1 py-2 px-1 text-center text-xs font-medium transition-colors"
        >
          {value === type.value && (
            <motion.div
              layoutId="split-type-pill"
              className="absolute inset-0 bg-primary rounded-lg"
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            />
          )}
          <span className={cn('relative z-10', value === type.value ? 'text-[#0a0f1e]' : 'text-muted-foreground')}>
            {type.label}
          </span>
        </button>
      ))}
    </div>
  )
}
