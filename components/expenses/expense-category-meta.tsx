import type { ExpenseCategory } from '@/types/database'

export const EXPENSE_CATEGORY_META: Record<ExpenseCategory, { label: string; emoji: string }> = {
  food: { label: 'Food & Drinks', emoji: '🍔' },
  travel: { label: 'Travel', emoji: '✈️' },
  accommodation: { label: 'Stay', emoji: '🏨' },
  entertainment: { label: 'Entertainment', emoji: '🎬' },
  shopping: { label: 'Shopping', emoji: '🛍️' },
  utilities: { label: 'Utilities', emoji: '⚡' },
  other: { label: 'Other', emoji: '🌐' },
}
