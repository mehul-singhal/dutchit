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

// Currencies supported by Frankfurter (others fall back to open.er-api.com)
const FRANKFURTER_CURRENCIES = new Set([
  'AUD','BRL','CAD','CHF','CNY','CZK','DKK','EUR','GBP','HKD','HUF',
  'IDR','ILS','INR','ISK','JPY','KRW','MXN','MYR','NOK','NZD','PHP',
  'PLN','RON','SEK','SGD','THB','TRY','USD','ZAR',
])

/**
 * Fetch how many units of `to` one unit of `from` is worth.
 * Uses Frankfurter for supported currencies, falls back to open.er-api.com for others (e.g. AED).
 * Returns null on network failure — caller should handle gracefully.
 */
export async function fetchExchangeRate(from: string, to: string = 'INR'): Promise<number | null> {
  if (from === to) return 1
  try {
    if (FRANKFURTER_CURRENCIES.has(from) && FRANKFURTER_CURRENCIES.has(to)) {
      const res = await fetch(
        `https://api.frankfurter.dev/v1/latest?from=${from}&to=${to}`,
        { cache: 'no-store' }
      )
      if (!res.ok) throw new Error('frankfurter failed')
      const data = await res.json() as { rates: Record<string, number> }
      return data.rates?.[to] ?? null
    }
    // Fallback: open.er-api.com supports 160+ currencies including AED
    const res = await fetch(
      `https://open.er-api.com/v6/latest/${from}`,
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
