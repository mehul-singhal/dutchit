'use client'

import { useState } from 'react'
import { Download, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { calculateBalances, simplifyDebts } from '@/lib/utils/debt-simplifier'
import { EXPENSE_CATEGORY_META } from '@/components/expenses/expense-category-meta'
import type { UserProfile, ExpenseCategory } from '@/types/database'

interface Props {
  groupId: string
  groupName: string
}

function escapeCell(value: string | number | null | undefined): string {
  const str = String(value ?? '')
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function toCSV(rows: (string | number | null | undefined)[][]): string {
  return rows.map((row) => row.map(escapeCell).join(',')).join('\n')
}

function downloadCSV(filename: string, content: string) {
  const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function GroupExportButton({ groupId, groupName }: Props) {
  const [exporting, setExporting] = useState(false)
  const supabase = createClient()

  async function handleExport() {
    setExporting(true)
    try {
      // Fetch all data in parallel
      const [expensesRes, membersRes, settlementsRes] = await Promise.all([
        supabase
          .from('expenses')
          .select('id, title, amount, category, date, notes, paid_by, created_at, expense_splits(user_id, amount), paid_by_user:users!expenses_paid_by_fkey(full_name)')
          .eq('group_id', groupId)
          .order('date', { ascending: false }),
        supabase
          .from('group_members')
          .select('user_id, role, joined_at, users(*)')
          .eq('group_id', groupId),
        supabase
          .from('settlements')
          .select('paid_by, paid_to, amount, status, created_at, paid_by_user:users!settlements_paid_by_fkey(full_name), paid_to_user:users!settlements_paid_to_fkey(full_name)')
          .eq('group_id', groupId),
      ])

      const expenses = expensesRes.data as Array<{
        id: string
        title: string
        amount: number
        category: string
        date: string
        notes: string | null
        paid_by: string
        created_at: string
        expense_splits: Array<{ user_id: string; amount: number }>
        paid_by_user: { full_name: string | null } | null
      }> | null

      const members = membersRes.data as Array<{
        user_id: string
        role: string
        joined_at: string
        users: UserProfile | null
      }> | null

      const settlements = settlementsRes.data as Array<{
        paid_by: string
        paid_to: string
        amount: number
        status: string
        created_at: string
        paid_by_user: { full_name: string | null } | null
        paid_to_user: { full_name: string | null } | null
      }> | null

      // Build user map
      const userMap: Record<string, UserProfile> = {}
      for (const m of members ?? []) {
        if (m.users) userMap[m.user_id] = m.users
      }

      const safe = (name: string) => groupName.replace(/[^a-z0-9]/gi, '_')
      const dateStr = new Date().toISOString().slice(0, 10)

      // ── Sheet 1: Expenses ──
      const expenseRows: (string | number | null)[][] = [
        ['Date', 'Title', 'Category', 'Amount (₹)', 'Paid By', 'Notes', 'Added On'],
      ]
      for (const e of expenses ?? []) {
        expenseRows.push([
          e.date,
          e.title,
          EXPENSE_CATEGORY_META[e.category as ExpenseCategory]?.label ?? e.category,
          e.amount,
          e.paid_by_user?.full_name ?? e.paid_by,
          e.notes ?? '',
          e.created_at.slice(0, 10),
        ])
      }
      expenseRows.push([])
      expenseRows.push(['Total', '', '', (expenses ?? []).reduce((s, e) => s + e.amount, 0), '', '', ''])

      // ── Sheet 2: Splits per expense ──
      const splitRows: (string | number | null)[][] = [
        ['Expense Title', 'Date', 'Member', 'Share (₹)'],
      ]
      for (const e of expenses ?? []) {
        for (const split of e.expense_splits) {
          splitRows.push([
            e.title,
            e.date,
            userMap[split.user_id]?.full_name ?? split.user_id,
            split.amount,
          ])
        }
      }

      // ── Sheet 3: Balances ──
      const expenseData = (expenses ?? []).map((e) => ({
        paid_by: e.paid_by,
        splits: e.expense_splits.map((s) => ({ user_id: s.user_id, amount: s.amount })),
      }))
      const balanceMap = calculateBalances(expenseData)
      for (const s of settlements ?? []) {
        if (s.status === 'confirmed') {
          balanceMap[s.paid_by] = (balanceMap[s.paid_by] ?? 0) - s.amount
          balanceMap[s.paid_to] = (balanceMap[s.paid_to] ?? 0) + s.amount
        }
      }

      const balanceRows: (string | number | null)[][] = [
        ['Member', 'Net Balance (₹)', 'Status'],
      ]
      for (const m of members ?? []) {
        const balance = Math.round((balanceMap[m.user_id] ?? 0) * 100) / 100
        balanceRows.push([
          m.users?.full_name ?? m.user_id,
          balance,
          balance > 0 ? 'Gets back' : balance < 0 ? 'Owes' : 'Settled',
        ])
      }

      // ── Sheet 4: Settlements ──
      const settlementRows: (string | number | null)[][] = [
        ['From', 'To', 'Amount (₹)', 'Status', 'Date'],
      ]
      for (const s of settlements ?? []) {
        settlementRows.push([
          s.paid_by_user?.full_name ?? s.paid_by,
          s.paid_to_user?.full_name ?? s.paid_to,
          s.amount,
          s.status,
          s.created_at.slice(0, 10),
        ])
      }

      // ── Suggested settlements ──
      const debts = simplifyDebts(balanceMap, userMap)
      const debtRows: (string | number | null)[][] = [
        ['Who Pays', 'Who Receives', 'Amount (₹)'],
      ]
      for (const d of debts) {
        debtRows.push([
          d.fromUser?.full_name ?? d.from,
          d.toUser?.full_name ?? d.to,
          d.amount,
        ])
      }

      // Combine all sheets into one CSV with section headers
      const allRows: (string | number | null)[][] = [
        [`DutchIt Export — ${groupName}`, `Generated: ${dateStr}`],
        [],
        ['=== EXPENSES ==='],
        ...expenseRows,
        [],
        ['=== EXPENSE SPLITS ==='],
        ...splitRows,
        [],
        ['=== MEMBER BALANCES ==='],
        ...balanceRows,
        [],
        ['=== SUGGESTED SETTLEMENTS ==='],
        ...debtRows,
        [],
        ['=== PAYMENT HISTORY ==='],
        ...settlementRows,
      ]

      downloadCSV(`dutchit_${safe(groupName)}_${dateStr}.csv`, toCSV(allRows))
      toast.success('Exported successfully!')
    } catch {
      toast.error('Export failed. Please try again.')
    } finally {
      setExporting(false)
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      className="border-white/10 hover:bg-white/5 gap-1.5"
      onClick={handleExport}
      disabled={exporting}
    >
      {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
      <span className="hidden sm:inline">Export</span>
    </Button>
  )
}
