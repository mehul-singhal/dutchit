// Replay engine — knows how to re-execute each queued mutation type.
// Called by OnlineSync when the connection restores.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecord = Record<string, any>

import { createClient } from '@/lib/supabase/client'
import type { QueuedMutation } from '@/lib/mutation-queue'

export async function replayMutation(m: QueuedMutation): Promise<void> {
  const supabase = createClient()
  const p = m.payload as AnyRecord

  switch (m.type) {
    // ── Expenses ──────────────────────────────────────────────────────────
    case 'expense:add': {
      const { splits, ...expense } = p
      const { data, error } = await supabase
        .from('expenses')
        .insert(expense)
        .select()
        .single()
      if (error) throw error
      if (splits?.length) {
        const { error: se } = await supabase.from('expense_splits').insert(
          splits.map((s: AnyRecord) => ({ ...s, expense_id: data.id }))
        )
        if (se) {
          await supabase.from('expenses').delete().eq('id', data.id)
          throw se
        }
      }
      break
    }

    case 'expense:update': {
      const { id, splits, ...fields } = p
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from('expenses') as any).update(fields).eq('id', id)
      if (error) throw error
      await supabase.from('expense_splits').delete().eq('expense_id', id)
      const { error: se } = await supabase.from('expense_splits').insert(
        splits.map((s: AnyRecord) => ({ ...s, expense_id: id }))
      )
      if (se) throw se
      break
    }

    case 'expense:delete': {
      const { error } = await supabase.from('expenses').delete().eq('id', p.id)
      if (error) throw error
      break
    }

    // ── Personal expenses ─────────────────────────────────────────────────
    case 'personal-expense:add': {
      const { error } = await supabase.from('personal_expenses').insert(p)
      if (error) throw error
      break
    }

    case 'personal-expense:delete': {
      const { error } = await supabase.from('personal_expenses').delete().eq('id', p.id)
      if (error) throw error
      break
    }

    // ── Settlements ───────────────────────────────────────────────────────
    case 'settlement:add': {
      const { error } = await supabase.from('settlements').insert(p)
      if (error) throw error
      break
    }

    // ── Budgets ───────────────────────────────────────────────────────────
    case 'budget:upsert': {
      const { error } = await supabase.from('budgets').upsert(p)
      if (error) throw error
      break
    }

    // ── Groups ────────────────────────────────────────────────────────────
    case 'group:join': {
      const { error } = await supabase.from('group_members').insert(p)
      if (error) throw error
      break
    }

    default:
      // Unknown type — discard silently
      break
  }
}

