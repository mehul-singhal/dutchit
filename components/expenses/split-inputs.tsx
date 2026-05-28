'use client'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { getInitials, formatINR } from '@/lib/utils/formatters'
import { calculateEqualSplits, calculateShareSplits, calculatePercentageSplits, calculateAdjustmentSplits } from '@/lib/utils/split-calculator'
import type { SplitType, UserProfile } from '@/types/database'
import { cn } from '@/lib/utils'

interface Props {
  splitType: SplitType
  members: UserProfile[]
  currentUserId: string
  totalAmount: number
  splitData: Record<string, number | boolean>
  onChange: (data: Record<string, number | boolean>) => void
}

export function SplitInputs({ splitType, members, currentUserId, totalAmount, splitData, onChange }: Props) {
  if (splitType === 'equal') {
    const included = members.filter((m) => !!splitData[m.id])
    const perPerson = included.length > 0 ? totalAmount / included.length : 0

    return (
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">Select who&apos;s included:</p>
        {members.map((member) => {
          const isIncluded = !!splitData[member.id]
          return (
            <button
              key={member.id}
              type="button"
              onClick={() => onChange({ ...splitData, [member.id]: !isIncluded })}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all text-sm',
                isIncluded ? 'border-primary/30 bg-primary/8' : 'border-white/10 bg-white/5 opacity-60'
              )}
            >
              <Avatar className="w-7 h-7 shrink-0">
                <AvatarImage src={member.avatar_url ?? undefined} />
                <AvatarFallback className="text-[9px] bg-primary/20 text-primary">
                  {getInitials(member.full_name ?? '?')}
                </AvatarFallback>
              </Avatar>
              <span className="flex-1 text-left">{member.id === currentUserId ? 'You' : member.full_name}</span>
              <span className={`text-sm font-medium ${isIncluded ? 'text-primary' : 'text-muted-foreground'}`}>
                {isIncluded ? formatINR(perPerson) : '—'}
              </span>
            </button>
          )
        })}
      </div>
    )
  }

  if (splitType === 'exact') {
    const total = members.reduce((s, m) => s + Number(splitData[m.id] ?? 0), 0)
    const remaining = totalAmount - total
    return (
      <div className="space-y-2">
        <div className="flex justify-between text-xs text-muted-foreground mb-1">
          <span>Enter exact amounts</span>
          <span className={Math.abs(remaining) < 0.01 ? 'text-emerald-400' : 'text-rose-400'}>
            {Math.abs(remaining) < 0.01 ? '✓ Balanced' : `${remaining > 0 ? '+' : ''}${formatINR(remaining)} remaining`}
          </span>
        </div>
        {members.map((member) => (
          <div key={member.id} className="flex items-center gap-3">
            <Avatar className="w-7 h-7 shrink-0">
              <AvatarImage src={member.avatar_url ?? undefined} />
              <AvatarFallback className="text-[9px] bg-primary/20 text-primary">
                {getInitials(member.full_name ?? '?')}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm flex-1">{member.id === currentUserId ? 'You' : member.full_name}</span>
            <div className="relative w-28">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">₹</span>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={String(splitData[member.id] ?? '')}
                onChange={(e) => onChange({ ...splitData, [member.id]: Number(e.target.value) })}
                className="pl-6 h-8 text-sm bg-white/5 border-white/10"
              />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (splitType === 'percentage') {
    const total = members.reduce((s, m) => s + Number(splitData[m.id] ?? 0), 0)
    const remaining = 100 - total
    return (
      <div className="space-y-2">
        <div className="flex justify-between text-xs text-muted-foreground mb-1">
          <span>Enter percentages (must sum to 100%)</span>
          <span className={Math.abs(remaining) < 0.01 ? 'text-emerald-400' : 'text-rose-400'}>
            {Math.abs(remaining) < 0.01 ? '✓ 100%' : `${remaining.toFixed(1)}% left`}
          </span>
        </div>
        {members.map((member) => {
          const pct = Number(splitData[member.id] ?? 0)
          const amount = (totalAmount * pct) / 100
          return (
            <div key={member.id} className="flex items-center gap-3">
              <Avatar className="w-7 h-7 shrink-0">
                <AvatarImage src={member.avatar_url ?? undefined} />
                <AvatarFallback className="text-[9px] bg-primary/20 text-primary">
                  {getInitials(member.full_name ?? '?')}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm flex-1">{member.id === currentUserId ? 'You' : member.full_name}</span>
              <span className="text-xs text-muted-foreground w-16 text-right">{formatINR(amount)}</span>
              <div className="relative w-20">
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={String(pct)}
                  onChange={(e) => onChange({ ...splitData, [member.id]: Number(e.target.value) })}
                  className="pr-5 h-8 text-sm bg-white/5 border-white/10"
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  if (splitType === 'shares') {
    const totalShares = members.reduce((s, m) => s + Number(splitData[m.id] ?? 1), 0)
    return (
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">Assign share multipliers:</p>
        {members.map((member) => {
          const shares = Number(splitData[member.id] ?? 1)
          const amount = totalShares > 0 ? (totalAmount * shares) / totalShares : 0
          return (
            <div key={member.id} className="flex items-center gap-3">
              <Avatar className="w-7 h-7 shrink-0">
                <AvatarImage src={member.avatar_url ?? undefined} />
                <AvatarFallback className="text-[9px] bg-primary/20 text-primary">
                  {getInitials(member.full_name ?? '?')}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm flex-1">{member.id === currentUserId ? 'You' : member.full_name}</span>
              <span className="text-xs text-muted-foreground w-16 text-right">{formatINR(amount)}</span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => onChange({ ...splitData, [member.id]: Math.max(0.5, shares - 0.5) })}
                  className="w-6 h-6 rounded-lg bg-white/10 hover:bg-white/15 flex items-center justify-center text-sm font-bold"
                >−</button>
                <span className="w-8 text-center text-sm font-medium">{shares}x</span>
                <button
                  type="button"
                  onClick={() => onChange({ ...splitData, [member.id]: shares + 0.5 })}
                  className="w-6 h-6 rounded-lg bg-white/10 hover:bg-white/15 flex items-center justify-center text-sm font-bold"
                >+</button>
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  if (splitType === 'adjustment') {
    const n = members.length
    const totalAdjustments = members.reduce((s, m) => s + Number(splitData[m.id] ?? 0), 0)
    const baseAmount = (totalAmount - totalAdjustments) / n
    return (
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">
          Base: {formatINR(baseAmount)} each + adjustments
        </p>
        {members.map((member) => {
          const adj = Number(splitData[member.id] ?? 0)
          const finalAmount = baseAmount + adj
          return (
            <div key={member.id} className="flex items-center gap-3">
              <Avatar className="w-7 h-7 shrink-0">
                <AvatarImage src={member.avatar_url ?? undefined} />
                <AvatarFallback className="text-[9px] bg-primary/20 text-primary">
                  {getInitials(member.full_name ?? '?')}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm flex-1">{member.id === currentUserId ? 'You' : member.full_name}</span>
              <span className="text-xs text-muted-foreground w-16 text-right">{formatINR(finalAmount)}</span>
              <div className="relative w-24">
                <Input
                  type="number"
                  step="0.01"
                  value={String(adj)}
                  onChange={(e) => onChange({ ...splitData, [member.id]: Number(e.target.value) })}
                  className="h-8 text-sm bg-white/5 border-white/10 text-center"
                  placeholder="0"
                />
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  return null
}
