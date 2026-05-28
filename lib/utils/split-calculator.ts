import type { SplitType } from '@/types/database'

export interface SplitInput {
  userId: string
  amount?: number       // for 'exact'
  percentage?: number   // for 'percentage'
  shares?: number       // for 'shares'
  adjustedAmount?: number // for 'adjustment'
  included?: boolean    // for 'equal' (opt someone out)
}

export interface SplitResult {
  userId: string
  splitType: SplitType
  amount: number
  percentage?: number
  shares?: number
  adjustedAmount?: number
}

/**
 * Calculate equal splits
 * amount / number of included participants
 */
export function calculateEqualSplits(
  totalAmount: number,
  participants: { userId: string; included: boolean }[]
): SplitResult[] {
  const included = participants.filter((p) => p.included)
  if (included.length === 0) return []

  const baseAmount = Math.floor((totalAmount / included.length) * 100) / 100
  const remainder = Math.round((totalAmount - baseAmount * included.length) * 100)

  return included.map((p, i) => ({
    userId: p.userId,
    splitType: 'equal',
    amount: i === 0 ? baseAmount + remainder / 100 : baseAmount,
  }))
}

/**
 * Calculate exact amount splits
 * amounts must sum to total (validated before calling)
 */
export function calculateExactSplits(
  inputs: { userId: string; amount: number }[]
): SplitResult[] {
  return inputs.map((p) => ({
    userId: p.userId,
    splitType: 'exact',
    amount: p.amount,
  }))
}

/**
 * Calculate percentage splits
 * percentages must sum to 100 (validated before calling)
 */
export function calculatePercentageSplits(
  totalAmount: number,
  inputs: { userId: string; percentage: number }[]
): SplitResult[] {
  return inputs.map((p) => ({
    userId: p.userId,
    splitType: 'percentage',
    amount: Math.round((totalAmount * p.percentage) / 100 * 100) / 100,
    percentage: p.percentage,
  }))
}

/**
 * Calculate share-based splits (1x, 2x, 3x etc)
 */
export function calculateShareSplits(
  totalAmount: number,
  inputs: { userId: string; shares: number }[]
): SplitResult[] {
  const totalShares = inputs.reduce((sum, p) => sum + p.shares, 0)
  if (totalShares === 0) return []

  return inputs.map((p) => ({
    userId: p.userId,
    splitType: 'shares',
    amount: Math.round((totalAmount * p.shares) / totalShares * 100) / 100,
    shares: p.shares,
  }))
}

/**
 * Calculate adjustment-based splits
 * Equal base + individual adjustments
 * Sum of adjustments can be positive/negative but total must equal expense amount
 */
export function calculateAdjustmentSplits(
  totalAmount: number,
  inputs: { userId: string; adjustedAmount: number }[]
): SplitResult[] {
  const n = inputs.length
  const totalAdjustments = inputs.reduce((sum, p) => sum + p.adjustedAmount, 0)
  const baseAmount = (totalAmount - totalAdjustments) / n

  return inputs.map((p) => ({
    userId: p.userId,
    splitType: 'adjustment',
    amount: Math.round((baseAmount + p.adjustedAmount) * 100) / 100,
    adjustedAmount: p.adjustedAmount,
  }))
}

/**
 * Validate splits sum to total amount
 */
export function validateSplitTotal(splits: SplitResult[], totalAmount: number): boolean {
  const sum = splits.reduce((acc, s) => acc + s.amount, 0)
  return Math.abs(sum - totalAmount) < 0.01
}

/**
 * Validate percentages sum to 100
 */
export function validatePercentages(percentages: number[]): boolean {
  const sum = percentages.reduce((acc, p) => acc + p, 0)
  return Math.abs(sum - 100) < 0.01
}

/**
 * Format currency in Indian format (₹1,23,456.78)
 */
export function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount)
}
