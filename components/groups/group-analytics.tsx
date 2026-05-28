'use client'

import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import { createClient } from '@/lib/supabase/client'
import { formatINR, getInitials } from '@/lib/utils/formatters'
import { EXPENSE_CATEGORY_META } from '@/components/expenses/expense-category-meta'
import type { UserProfile, ExpenseCategory } from '@/types/database'

interface Props {
  groupId: string
  userId: string
}

const PIE_COLORS = ['#00d4aa', '#6366f1', '#f43f5e', '#f59e0b', '#10b981', '#3b82f6', '#a855f7']

const TOOLTIP_STYLE = {
  background: 'rgba(17,24,39,0.95)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '12px',
  color: '#f8fafc',
  fontSize: '12px',
}

export function GroupAnalytics({ groupId, userId }: Props) {
  const supabase = createClient()

  const { data, isLoading } = useQuery({
    queryKey: ['group-analytics', groupId],
    queryFn: async () => {
      const [expensesRes, membersRes] = await Promise.all([
        supabase
          .from('expenses')
          .select('id, amount, category, date, paid_by, expense_splits(user_id, amount)')
          .eq('group_id', groupId)
          .order('date', { ascending: true }),
        supabase
          .from('group_members')
          .select('user_id, users(*)')
          .eq('group_id', groupId),
      ])

      const expenses = expensesRes.data as Array<{
        id: string
        amount: number
        category: string
        date: string
        paid_by: string
        expense_splits: Array<{ user_id: string; amount: number }>
      }> | null

      const members = membersRes.data as Array<{ user_id: string; users: UserProfile | null }> | null

      const userMap: Record<string, UserProfile> = {}
      for (const m of members ?? []) {
        if (m.users) userMap[m.user_id] = m.users
      }

      const expenseList = expenses ?? []
      const totalSpend = expenseList.reduce((s, e) => s + e.amount, 0)

      // ── Category breakdown ──
      const categoryMap: Record<string, number> = {}
      for (const e of expenseList) {
        categoryMap[e.category] = (categoryMap[e.category] ?? 0) + e.amount
      }
      const categoryData = Object.entries(categoryMap)
        .map(([cat, amount]) => ({
          name: EXPENSE_CATEGORY_META[cat as ExpenseCategory]?.label ?? cat,
          emoji: EXPENSE_CATEGORY_META[cat as ExpenseCategory]?.emoji ?? '📦',
          value: amount,
          pct: totalSpend > 0 ? Math.round((amount / totalSpend) * 100) : 0,
        }))
        .sort((a, b) => b.value - a.value)

      // ── Monthly spend (last 6 months) ──
      const monthlyMap: Record<string, number> = {}
      const now = new Date()
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const key = d.toLocaleString('en-IN', { month: 'short', year: '2-digit' })
        monthlyMap[key] = 0
      }
      for (const e of expenseList) {
        const d = new Date(e.date)
        const key = d.toLocaleString('en-IN', { month: 'short', year: '2-digit' })
        if (key in monthlyMap) monthlyMap[key] += e.amount
      }
      const monthlyData = Object.entries(monthlyMap).map(([month, total]) => ({ month, total }))

      // ── Per-member paid out ──
      const paidByMap: Record<string, number> = {}
      for (const e of expenseList) {
        paidByMap[e.paid_by] = (paidByMap[e.paid_by] ?? 0) + e.amount
      }

      // ── Per-member share (sum of their splits) ──
      const shareMap: Record<string, number> = {}
      for (const e of expenseList) {
        for (const s of e.expense_splits) {
          shareMap[s.user_id] = (shareMap[s.user_id] ?? 0) + s.amount
        }
      }

      // ── Per-member by category ──
      const memberCategoryMap: Record<string, Record<string, number>> = {}
      for (const e of expenseList) {
        if (!memberCategoryMap[e.paid_by]) memberCategoryMap[e.paid_by] = {}
        memberCategoryMap[e.paid_by][e.category] = (memberCategoryMap[e.paid_by][e.category] ?? 0) + e.amount
      }

      // ── Avg expense ──
      const avgExpense = expenseList.length > 0 ? totalSpend / expenseList.length : 0

      // ── Largest single expense ──
      const largest = expenseList.reduce((max, e) => e.amount > max.amount ? e : max, expenseList[0] ?? null)

      return {
        totalSpend, categoryData, monthlyData, paidByMap, shareMap,
        memberCategoryMap, userMap, members: members ?? [],
        expenseCount: expenseList.length, avgExpense, largest,
      }
    },
  })

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4].map((i) => <div key={i} className="h-48 glass rounded-2xl skeleton-shimmer" />)}
      </div>
    )
  }

  const {
    totalSpend = 0, categoryData = [], monthlyData = [], paidByMap = {},
    shareMap = {}, userMap = {}, members = [],
    expenseCount = 0, avgExpense = 0, largest = null,
  } = data ?? {}

  if (expenseCount === 0) {
    return (
      <div className="text-center py-16">
        <div className="text-5xl mb-4">📊</div>
        <p className="font-semibold">No data yet</p>
        <p className="text-sm text-muted-foreground mt-1">Add some expenses to see analytics.</p>
      </div>
    )
  }

  const memberList = members.filter((m) => m.users).sort(
    (a, b) => (paidByMap[b.user_id] ?? 0) - (paidByMap[a.user_id] ?? 0)
  )

  return (
    <div className="space-y-6">

      {/* ── Quick stats ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total spent', value: formatINR(totalSpend) },
          { label: 'Expenses', value: String(expenseCount) },
          { label: 'Avg expense', value: formatINR(Math.round(avgExpense)) },
          { label: 'Largest', value: largest ? formatINR(largest.amount) : '—' },
        ].map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
            className="glass rounded-xl p-4"
          >
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">{s.label}</p>
            <p className="text-lg font-bold">{s.value}</p>
          </motion.div>
        ))}
      </div>

      {/* ── Monthly spend bar chart ── */}
      <div className="glass rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">Monthly Spend</h3>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={monthlyData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false}
              tickFormatter={(v) => `₹${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} />
            <ReTooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [formatINR(v as number), 'Spent']} />
            <Bar dataKey="total" fill="#00d4aa" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* ── Category breakdown ── */}
      <div className="glass rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">Spending by Category</h3>
        <div className="flex flex-col sm:flex-row gap-6 items-center">
          <div className="w-full sm:w-auto shrink-0">
            <ResponsiveContainer width={180} height={180}>
              <PieChart>
                <Pie data={categoryData} cx="50%" cy="50%" innerRadius={55} outerRadius={75} paddingAngle={3} dataKey="value">
                  {categoryData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <ReTooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [formatINR(v as number), '']} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex-1 space-y-3 w-full">
            {categoryData.map((item, i) => (
              <div key={item.name}>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                  <span className="text-sm flex-1">{item.emoji} {item.name}</span>
                  <span className="text-xs text-muted-foreground">{item.pct}%</span>
                  <span className="text-sm font-medium w-24 text-right">{formatINR(item.value)}</span>
                </div>
                <Progress value={item.pct} className="h-1.5 bg-white/10" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Per-member spend ── */}
      <div className="glass rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">Who Paid the Most</h3>
        <div className="space-y-4">
          {memberList.map((m) => {
            const user = m.users as UserProfile
            const paid = paidByMap[m.user_id] ?? 0
            const share = shareMap[m.user_id] ?? 0
            const pct = totalSpend > 0 ? Math.round((paid / totalSpend) * 100) : 0
            const isMe = m.user_id === userId
            const net = paid - share
            return (
              <div key={m.user_id}>
                <div className="flex items-center gap-3 mb-1.5">
                  <Avatar className="w-8 h-8 shrink-0">
                    <AvatarFallback className="text-xs bg-primary/20 text-primary">{getInitials(user.full_name ?? '?')}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{isMe ? 'You' : user.full_name ?? 'Unknown'}</span>
                      <span className="text-sm font-bold">{formatINR(paid)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">{pct}% of total · share {formatINR(share)}</span>
                      <span className={`text-xs font-medium ${net > 0 ? 'text-emerald-400' : net < 0 ? 'text-rose-400' : 'text-muted-foreground'}`}>
                        {net > 0 ? `+${formatINR(net)} net` : net < 0 ? `${formatINR(net)} net` : 'even'}
                      </span>
                    </div>
                  </div>
                </div>
                <Progress value={pct} className="h-1.5 bg-white/10" />
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Per-member category breakdown ── */}
      {memberList.length > 1 && (
        <div className="glass rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">Member Spending by Category</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart
              data={memberList.map((m) => {
                const user = m.users as UserProfile
                const row: Record<string, string | number> = { name: m.user_id === userId ? 'You' : (user.full_name?.split(' ')[0] ?? 'Unknown') }
                for (const [cat] of Object.entries(EXPENSE_CATEGORY_META)) {
                  row[cat] = data?.memberCategoryMap?.[m.user_id]?.[cat] ?? 0
                }
                return row
              })}
              margin={{ top: 5, right: 0, left: -20, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false}
                tickFormatter={(v) => `₹${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} />
              <ReTooltip contentStyle={TOOLTIP_STYLE} formatter={(v, name) => [formatINR(v as number), EXPENSE_CATEGORY_META[name as ExpenseCategory]?.label ?? String(name)]} />
              <Legend formatter={(value) => EXPENSE_CATEGORY_META[value as ExpenseCategory]?.label ?? value} wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }} />
              {Object.entries(EXPENSE_CATEGORY_META).map(([cat, meta], i) => (
                <Bar key={cat} dataKey={cat} stackId="a" fill={PIE_COLORS[i % PIE_COLORS.length]} radius={i === Object.keys(EXPENSE_CATEGORY_META).length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

    </div>
  )
}
