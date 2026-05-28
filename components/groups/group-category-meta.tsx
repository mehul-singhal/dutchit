import type { GroupCategory } from '@/types/database'

export const GROUP_CATEGORY_META: Record<GroupCategory, { label: string; emoji: string }> = {
  trip: { label: 'Trip', emoji: '🧳' },
  home: { label: 'Household', emoji: '🏠' },
  couple: { label: 'Couple', emoji: '💑' },
  friends: { label: 'Friends', emoji: '🎉' },
  work: { label: 'Work', emoji: '💼' },
  other: { label: 'Other', emoji: '📦' },
}
