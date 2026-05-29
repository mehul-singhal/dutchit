export interface Currency {
  code: string
  symbol: string
  name: string
}

export const SUPPORTED_CURRENCIES: Currency[] = [
  { code: 'INR', symbol: '₹',    name: 'Indian Rupee' },
  { code: 'USD', symbol: '$',    name: 'US Dollar' },
  { code: 'EUR', symbol: '€',    name: 'Euro' },
  { code: 'GBP', symbol: '£',    name: 'British Pound' },
  { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham' },
  { code: 'SGD', symbol: 'S$',   name: 'Singapore Dollar' },
  { code: 'JPY', symbol: '¥',    name: 'Japanese Yen' },
  { code: 'THB', symbol: '฿',    name: 'Thai Baht' },
  { code: 'AUD', symbol: 'A$',   name: 'Australian Dollar' },
  { code: 'CAD', symbol: 'CA$',  name: 'Canadian Dollar' },
  { code: 'CHF', symbol: 'Fr',   name: 'Swiss Franc' },
  { code: 'HKD', symbol: 'HK$',  name: 'Hong Kong Dollar' },
  { code: 'MYR', symbol: 'RM',   name: 'Malaysian Ringgit' },
  { code: 'KRW', symbol: '₩',    name: 'South Korean Won' },
]

export function getCurrency(code: string): Currency {
  return SUPPORTED_CURRENCIES.find((c) => c.code === code) ?? { code, symbol: code, name: code }
}

/**
 * Fetch how many units of `to` one unit of `from` is worth.
 * Defaults to INR as the target currency.
 * Returns null on network failure — caller should handle gracefully.
 */
export async function fetchExchangeRate(from: string, to: string = 'INR'): Promise<number | null> {
  if (from === to) return 1
  try {
    const res = await fetch(
      `https://api.frankfurter.app/latest?from=${from}&to=${to}`,
      { cache: 'no-store' }
    )
    if (!res.ok) return null
    const data = await res.json() as { rates: Record<string, number> }
    return data.rates?.[to] ?? null
  } catch {
    return null
  }
}

/**
 * Format an amount in its native currency using Intl.NumberFormat.
 */
export function formatCurrency(amount: number, currency: string): string {
  // JPY and KRW have no fractional digits
  const noDecimals = ['JPY', 'KRW']
  return new Intl.NumberFormat('en', {
    style: 'currency',
    currency,
    minimumFractionDigits: noDecimals.includes(currency) ? 0 : 2,
    maximumFractionDigits: noDecimals.includes(currency) ? 0 : 2,
  }).format(amount)
}

/**
 * Display helper for non-INR expenses: "₹3,150 (US$ 100.00)"
 */
export function formatWithOriginal(
  inrAmount: number,
  origAmount: number,
  origCurrency: string,
): string {
  const inr = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(inrAmount)
  const orig = formatCurrency(origAmount, origCurrency)
  return `${inr} (${orig})`
}
