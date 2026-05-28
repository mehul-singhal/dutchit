'use client'

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'
import { EXPENSE_CATEGORY_META } from '@/components/expenses/expense-category-meta'
import { formatINR } from '@/lib/utils/formatters'
import type { ExpenseCategory } from '@/types/database'

interface Props {
  categoryTotals: Record<string, number>
  total: number
}

const COLORS = ['#00d4aa', '#6366f1', '#f43f5e', '#f59e0b', '#10b981', '#3b82f6', '#a855f7']

export function CategoryBreakdown({ categoryTotals, total }: Props) {
  if (total === 0) return null

  const data = Object.entries(categoryTotals)
    .map(([cat, amount]) => ({
      name: EXPENSE_CATEGORY_META[cat as ExpenseCategory]?.label ?? cat,
      emoji: EXPENSE_CATEGORY_META[cat as ExpenseCategory]?.emoji ?? '📦',
      value: amount,
      pct: Math.round((amount / total) * 100),
    }))
    .sort((a, b) => b.value - a.value)

  return (
    <div className="glass rounded-2xl p-5">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
        Category Breakdown
      </h3>
      <div className="flex flex-col sm:flex-row gap-4 items-center">
        <ResponsiveContainer width={160} height={160}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={70}
              paddingAngle={3}
              dataKey="value"
            >
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                background: 'rgba(17,24,39,0.95)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '12px',
                color: '#f8fafc',
                fontSize: '12px',
              }}
              formatter={(value) => [formatINR(value as number), '']}
            />
          </PieChart>
        </ResponsiveContainer>

        <div className="flex-1 space-y-2 w-full">
          {data.map((item, i) => (
            <div key={item.name} className="flex items-center gap-2.5">
              <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
              <span className="text-sm flex-1 truncate">
                {item.emoji} {item.name}
              </span>
              <span className="text-xs text-muted-foreground">{item.pct}%</span>
              <span className="text-sm font-medium w-20 text-right">{formatINR(item.value)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
