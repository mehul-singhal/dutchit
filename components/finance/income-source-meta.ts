import type { IncomeSource } from '@/types/database'

export const INCOME_SOURCE_META: Record<IncomeSource, { label: string; emoji: string }> = {
  salary:     { label: 'Salary',     emoji: '💼' },
  freelance:  { label: 'Freelance',  emoji: '💻' },
  rental:     { label: 'Rental',     emoji: '🏠' },
  investment: { label: 'Investment', emoji: '📈' },
  gift:       { label: 'Gift',       emoji: '🎁' },
  other:      { label: 'Other',      emoji: '💰' },
}
