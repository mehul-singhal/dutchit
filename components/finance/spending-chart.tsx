'use client'

import { motion } from 'framer-motion'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'

interface Props {
  data: { month: string; total: number; income?: number }[]
}

export function SpendingChart({ data }: Props) {
  if (!data.length) return null

  const hasIncome = data.some(d => (d.income ?? 0) > 0)

  return (
    <div className="glass rounded-2xl p-5">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
        6-Month Trend
      </h3>
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={data} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="spendGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#34d399" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis
            dataKey="month"
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `₹${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
          />
          <Tooltip
            contentStyle={{
              background: 'rgba(17, 24, 39, 0.95)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '12px',
              color: '#f8fafc',
              fontSize: '12px',
            }}
            formatter={(value, name) => [
              `₹${(value as number).toLocaleString('en-IN')}`,
              name === 'total' ? 'Expenses' : 'Income',
            ]}
          />
          {hasIncome && (
            <Area
              type="monotone"
              dataKey="income"
              stroke="#34d399"
              strokeWidth={2}
              fill="url(#incomeGrad)"
            />
          )}
          <Area
            type="monotone"
            dataKey="total"
            stroke="#f43f5e"
            strokeWidth={2}
            fill="url(#spendGrad)"
          />
          {hasIncome && (
            <Legend
              formatter={(value) => value === 'total' ? 'Expenses' : 'Income'}
              wrapperStyle={{ fontSize: '11px', color: '#94a3b8', paddingTop: '8px' }}
            />
          )}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
