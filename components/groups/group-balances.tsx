'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown, ArrowRight, Users, Receipt, PieChart as PieIcon } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts'
import { createClient } from '@/lib/supabase/client'
import { calculateBalances, simplifyDebts } from '@/lib/utils/debt-simplifier'
import { getInitials } from '@/lib/utils/formatters'
import { formatCurrency, getCurrency } from '@/lib/utils/currency'
import { EXPENSE_CATEGORY_META } from '@/components/expenses/expense-category-meta'
import { UpiPaymentSheet } from '@/components/settlements/upi-payment-sheet'
import { SettlementInfoSheet } from '@/components/settlements/settlement-info-sheet'
import type { UserProfile, DebtSimplification, ExpenseCategory } from '@/types/database'

interface Props {
  groupId: string
  userId: string
  baseCurrency?: string
  settlementCurrency?: string
}

const PIE_COLORS = ['#00d4aa', '#6366f1', '#f43f5e', '#f59e0b', '#10b981', '#3b82f6', '#a855f7']

export function GroupBalances({ groupId, userId, baseCurrency = 'INR', settlementCurrency = 'INR' }: Props) {
  const [payingDebt, setPayingDebt] = useState<DebtSimplification | null>(null)
  const [settlingDebt, setSettlingDebt] = useState<DebtSimplification | null>(null)
  const supabase = createClient()
  const fmt = (n: number) => formatCurrency(n, baseCurrency)

  const { data, isLoading } = useQuery({
    queryKey: ['group-balances', groupId],
    queryFn: async () => {
      const { data: expensesRaw } = await supabase
        .from('expenses')
        .select('id, paid_by, amount, category, date, expense_splits(user_id, amount)')
        .eq('group_id', groupId)
        .order('date', { ascending: true })

      const expenses = expensesRaw as Array<{
        id: string
        paid_by: string
        amount: number
        category: string
        date: string
        expense_splits: Array<{ user_id: string; amount: number }>
      }> | null

      const { data: settlements } = await supabase
        .from('settlements')
        .select('paid_by, paid_to, amount')
        .eq('group_id', groupId)
        .eq('status', 'confirmed')

      const { data: membersRaw } = await supabase
        .from('group_members')
        .select('user_id, users(*)')
        .eq('group_id', groupId)

      const members = membersRaw as Array<{ user_id: string; users: UserProfile | null }> | null

      const userMap: Record<string, UserProfile> = {}
      for (const m of members ?? []) {
        if (m.users) userMap[m.user_id] = m.users as UserProfile
      }

      const expenseList = expenses ?? []

      // Net balance map
      const expenseData = expenseList.map((e) => ({
        paid_by: e.paid_by,
        splits: e.expense_splits.map((s) => ({ user_id: s.user_id, amount: s.amount })),
      }))
      const balanceMap = calculateBalances(expenseData)
      for (const s of settlements ?? []) {
        balanceMap[s.paid_by] = (balanceMap[s.paid_by] ?? 0) + s.amount
        balanceMap[s.paid_to] = (balanceMap[s.paid_to] ?? 0) - s.amount
      }

      // Total group spend
      const totalSpend = expenseList.reduce((sum, e) => sum + e.amount, 0)

      // Per-member paid out
      const paidByMap: Record<string, number> = {}
      for (const e of expenseList) {
        paidByMap[e.paid_by] = (paidByMap[e.paid_by] ?? 0) + e.amount
      }

      // Category breakdown
      const categoryMap: Record<string, number> = {}
      for (const e of expenseList) {
        categoryMap[e.category] = (categoryMap[e.category] ?? 0) + e.amount
      }

      // Monthly spend (last 6 months)
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

      // Category chart data
      const categoryData = Object.entries(categoryMap)
        .map(([cat, amount]) => ({
          name: EXPENSE_CATEGORY_META[cat as ExpenseCategory]?.label ?? cat,
          emoji: EXPENSE_CATEGORY_META[cat as ExpenseCategory]?.emoji ?? '📦',
          value: amount,
          pct: totalSpend > 0 ? Math.round((amount / totalSpend) * 100) : 0,
        }))
        .sort((a, b) => b.value - a.value)

      const debts = simplifyDebts(balanceMap, userMap)

      return { balanceMap, debts, userMap, totalSpend, paidByMap, categoryData, monthlyData, members: members ?? [] }
    },
  })

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => <div key={i} className="h-16 glass rounded-xl skeleton-shimmer" />)}
      </div>
    )
  }

  const { balanceMap = {}, debts = [], userMap = {}, totalSpend = 0, paidByMap = {}, categoryData = [], monthlyData = [], members = [] } = data ?? {}
  const myBalance = balanceMap[userId] ?? 0
  const mySpend = paidByMap[userId] ?? 0
  const myPct = totalSpend > 0 ? Math.round((mySpend / totalSpend) * 100) : 0

  return (
    <div className="space-y-6">

      {/* ── Summary stats ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <StatCard label="Total spent" value={fmt(totalSpend)} icon={<Receipt className="w-4 h-4" />} />
        <StatCard label="You paid" value={fmt(mySpend)} sub={`${myPct}% of total`} icon={<TrendingUp className="w-4 h-4" />} />
        <StatCard label="Members" value={String(members.length)} icon={<Users className="w-4 h-4" />} className="col-span-2 sm:col-span-1" />
      </div>

      {/* ── Your net balance ── */}
      <div className={`glass rounded-2xl p-5 border ${myBalance > 0 ? 'border-emerald-400/20' : myBalance < 0 ? 'border-rose-400/20' : 'border-white/8'}`}>
        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Your net balance</p>
        <div className="flex items-center gap-2">
          {myBalance > 0 ? <TrendingUp className="w-5 h-5 text-emerald-400" /> : myBalance < 0 ? <TrendingDown className="w-5 h-5 text-rose-400" /> : null}
          <span className={`text-3xl font-bold ${myBalance > 0 ? 'text-emerald-400' : myBalance < 0 ? 'text-rose-400' : 'text-muted-foreground'}`}>
            {myBalance === 0 ? 'All settled up! 🎉' : `${myBalance > 0 ? '+' : ''}${fmt(myBalance)}`}
          </span>
        </div>
        {myBalance > 0 && <p className="text-xs text-muted-foreground mt-1">Others owe you this amount</p>}
        {myBalance < 0 && <p className="text-xs text-muted-foreground mt-1">You owe this amount in total</p>}
      </div>

      {/* ── All members balances ── */}
      {members.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Member balances</h3>
          <div className="space-y-2">
            {members
              .filter((m) => m.users)
              .sort((a, b) => (balanceMap[b.user_id] ?? 0) - (balanceMap[a.user_id] ?? 0))
              .map((m, i) => {
                const user = m.users as UserProfile
                const balance = balanceMap[m.user_id] ?? 0
                const paid = paidByMap[m.user_id] ?? 0
                const isMe = m.user_id === userId
                return (
                  <motion.div
                    key={m.user_id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="glass rounded-xl p-3 flex items-center gap-3"
                  >
                    <Avatar className="w-9 h-9 shrink-0">
                      <AvatarImage src={user.avatar_url ?? undefined} />
                      <AvatarFallback className="bg-primary/20 text-primary text-xs font-semibold">
                        {getInitials(user.full_name ?? '?')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {isMe ? 'You' : user.full_name ?? 'Unknown'}
                      </p>
                      <p className="text-xs text-muted-foreground">paid {fmt(paid)}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`text-sm font-bold ${balance > 0 ? 'text-emerald-400' : balance < 0 ? 'text-rose-400' : 'text-muted-foreground'}`}>
                        {balance === 0 ? 'settled' : `${balance > 0 ? '+' : ''}${fmt(balance)}`}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {balance > 0 ? 'gets back' : balance < 0 ? 'owes' : ''}
                      </p>
                    </div>
                  </motion.div>
                )
              })}
          </div>
        </div>
      )}

      {/* ── Suggested settlements ── */}
      {debts.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Suggested settlements</h3>
          <div className="space-y-2">
            {debts.map((debt, i) => {
              const isMe = debt.from === userId
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="glass rounded-xl p-4 flex items-center gap-4"
                >
                  <UserAvatar user={debt.fromUser} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 text-sm">
                      <span className={`font-medium ${isMe ? 'text-primary' : ''}`}>
                        {isMe ? 'You' : debt.fromUser?.full_name ?? 'Someone'}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="font-medium">
                        {debt.to === userId ? 'You' : debt.toUser?.full_name ?? 'Someone'}
                      </span>
                    </div>
                    <p className={`text-lg font-bold mt-0.5 ${isMe ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {fmt(debt.amount)}
                    </p>
                  </div>
                  {isMe && (
                    baseCurrency === 'INR' && settlementCurrency === 'INR' ? (
                      <Button size="sm" className="gradient-teal text-[#0a0f1e] font-semibold shrink-0" onClick={() => setPayingDebt(debt)}>
                        Pay Now
                      </Button>
                    ) : settlementCurrency !== baseCurrency && settlementCurrency === 'INR' ? (
                      <Button size="sm" className="gradient-teal text-[#0a0f1e] font-semibold shrink-0" onClick={() => setSettlingDebt(debt)}>
                        Settle in {getCurrency(settlementCurrency).symbol}
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground shrink-0">Settle manually</span>
                    )
                  )}
                </motion.div>
              )
            })}
          </div>
        </div>
      )}

      {debts.length === 0 && totalSpend > 0 && (
        <div className="text-center py-8">
          <div className="text-4xl mb-3">🎉</div>
          <p className="font-semibold">All square!</p>
          <p className="text-sm text-muted-foreground mt-1">No outstanding balances in this group.</p>
        </div>
      )}

      {/* ── Category breakdown ── */}
      {categoryData.length > 0 && (
        <div className="glass rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4 flex items-center gap-2">
            <PieIcon className="w-4 h-4" /> Category Breakdown
          </h3>
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <ResponsiveContainer width={160} height={160}>
              <PieChart>
                <Pie data={categoryData} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={3} dataKey="value">
                  {categoryData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <ReTooltip
                  contentStyle={{ background: 'rgba(17,24,39,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#f8fafc', fontSize: '12px' }}
                  formatter={(value) => [fmt(value as number), '']}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-2 w-full">
              {categoryData.map((item, i) => (
                <div key={item.name}>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                    <span className="text-sm flex-1 truncate">{item.emoji} {item.name}</span>
                    <span className="text-xs text-muted-foreground">{item.pct}%</span>
                    <span className="text-sm font-medium w-20 text-right">{fmt(item.value)}</span>
                  </div>
                  <Progress value={item.pct} className="h-1 bg-white/10" />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Monthly spend chart ── */}
      {totalSpend > 0 && (
        <div className="glass rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">Monthly Spend</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={monthlyData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => formatCurrency(v, baseCurrency).replace(/\.00$/, '')} />
              <ReTooltip
                contentStyle={{ background: 'rgba(17,24,39,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#f8fafc', fontSize: '12px' }}
                formatter={(value) => [fmt(value as number), 'Spent']}
              />
              <Bar dataKey="total" fill="#00d4aa" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── Per-member spend breakdown ── */}
      {totalSpend > 0 && members.length > 1 && (
        <div className="glass rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">Who paid the most</h3>
          <div className="space-y-3">
            {members
              .filter((m) => m.users && (paidByMap[m.user_id] ?? 0) > 0)
              .sort((a, b) => (paidByMap[b.user_id] ?? 0) - (paidByMap[a.user_id] ?? 0))
              .map((m) => {
                const user = m.users as UserProfile
                const paid = paidByMap[m.user_id] ?? 0
                const pct = Math.round((paid / totalSpend) * 100)
                const isMe = m.user_id === userId
                return (
                  <div key={m.user_id}>
                    <div className="flex items-center gap-2 mb-1">
                      <Avatar className="w-6 h-6 shrink-0">
                        <AvatarImage src={user.avatar_url ?? undefined} />
                        <AvatarFallback className="text-[9px] bg-primary/20 text-primary">{getInitials(user.full_name ?? '?')}</AvatarFallback>
                      </Avatar>
                      <span className="text-sm flex-1 truncate">{isMe ? 'You' : user.full_name ?? 'Unknown'}</span>
                      <span className="text-xs text-muted-foreground">{pct}%</span>
                      <span className="text-sm font-medium w-20 text-right">{fmt(paid)}</span>
                    </div>
                    <Progress value={pct} className="h-1.5 bg-white/10" />
                  </div>
                )
              })}
          </div>
        </div>
      )}

      {payingDebt && (
        <UpiPaymentSheet
          debt={payingDebt}
          groupId={groupId}
          baseCurrency={baseCurrency}
          open={!!payingDebt}
          onOpenChange={(open) => !open && setPayingDebt(null)}
        />
      )}

      {settlingDebt && (
        <SettlementInfoSheet
          debt={settlingDebt}
          groupId={groupId}
          baseCurrency={baseCurrency}
          settlementCurrency={settlementCurrency}
          open={!!settlingDebt}
          onOpenChange={(open) => !open && setSettlingDebt(null)}
          onSettled={() => setSettlingDebt(null)}
        />
      )}
    </div>
  )
}

function StatCard({ label, value, sub, icon, className }: { label: string; value: string; sub?: string; icon: React.ReactNode; className?: string }) {
  return (
    <div className={`glass rounded-xl p-4 ${className ?? ''}`}>
      <div className="flex items-center gap-2 text-muted-foreground mb-2">
        {icon}
        <span className="text-xs uppercase tracking-wide">{label}</span>
      </div>
      <p className="text-xl font-bold">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  )
}

function UserAvatar({ user }: { user?: UserProfile }) {
  return (
    <Avatar className="w-9 h-9 shrink-0">
      <AvatarImage src={user?.avatar_url ?? undefined} />
      <AvatarFallback className="bg-primary/20 text-primary text-xs font-semibold">
        {getInitials(user?.full_name ?? '?')}
      </AvatarFallback>
    </Avatar>
  )
}
