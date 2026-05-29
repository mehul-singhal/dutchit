import type { UserProfile } from '@/types/database'

export interface BalanceMap {
  [userId: string]: number // positive = owed to this person, negative = this person owes
}

export interface Debt {
  from: string
  fromUser: UserProfile
  to: string
  toUser: UserProfile
  amount: number
}

/**
 * Greedy debt simplification algorithm.
 * Minimizes the number of transactions needed to settle all debts.
 *
 * Steps:
 * 1. Build net balance for each person
 * 2. Separate into creditors (positive) and debtors (negative)
 * 3. Greedily match largest debtor with largest creditor
 */
export function simplifyDebts(
  balanceMap: BalanceMap,
  userMap: Record<string, UserProfile>
): Debt[] {
  // Round all balances to avoid floating point issues
  const balances: [string, number][] = Object.entries(balanceMap).map(
    ([userId, amount]) => [userId, Math.round(amount * 100) / 100]
  )

  // Filter out zero balances
  const nonZero = balances.filter(([, amount]) => Math.abs(amount) > 0.01)

  if (nonZero.length === 0) return []

  // Split into creditors and debtors
  const creditors = nonZero
    .filter(([, amount]) => amount > 0)
    .sort((a, b) => b[1] - a[1]) // descending by amount
  const debtors = nonZero
    .filter(([, amount]) => amount < 0)
    .sort((a, b) => a[1] - b[1]) // ascending (most negative first)

  const transactions: Debt[] = []

  let ci = 0
  let di = 0

  while (ci < creditors.length && di < debtors.length) {
    const [creditorId, creditAmount] = creditors[ci]
    const [debtorId, debtAmount] = debtors[di]

    const settleAmount = Math.min(creditAmount, Math.abs(debtAmount))

    if (settleAmount > 0.01) {
      transactions.push({
        from: debtorId,
        fromUser: userMap[debtorId],
        to: creditorId,
        toUser: userMap[creditorId],
        amount: Math.round(settleAmount * 100) / 100,
      })
    }

    creditors[ci] = [creditorId, Math.round((creditAmount - settleAmount) * 100) / 100]
    debtors[di] = [debtorId, Math.round((debtAmount + settleAmount) * 100) / 100]

    if (Math.abs(creditors[ci][1]) < 0.01) ci++
    if (Math.abs(debtors[di][1]) < 0.01) di++
  }

  return transactions
}

/**
 * Calculate per-person net balances for a group.
 * Returns a map of userId → net amount
 * Positive = this person is owed money
 * Negative = this person owes money
 */
export function calculateBalances(
  expenses: {
    paid_by: string
    splits: { user_id: string; amount: number }[]
  }[]
): BalanceMap {
  const balances: BalanceMap = {}

  for (const expense of expenses) {
    // The payer is owed the full amount
    balances[expense.paid_by] = (balances[expense.paid_by] ?? 0) + 0 // will add full below

    for (const split of expense.splits) {
      // Each person in the split owes their share
      balances[split.user_id] = (balances[split.user_id] ?? 0) - split.amount
      // Payer is owed back for this split
      balances[expense.paid_by] = (balances[expense.paid_by] ?? 0) + split.amount
    }
  }

  // Round to avoid floating point accumulation (e.g. 0.009999... showing as +0.01)
  for (const key of Object.keys(balances)) {
    balances[key] = Math.round(balances[key] * 100) / 100
  }

  return balances
}
