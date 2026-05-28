import type { UpiApp } from '@/types/database'

/**
 * Validates a UPI ID against standard format
 * Format: handle@provider (e.g., name@upi, 9876543210@paytm)
 */
export function validateUpiId(upiId: string): boolean {
  const upiRegex = /^[\w.\-]{2,256}@[a-zA-Z]{2,64}$/
  return upiRegex.test(upiId)
}

/**
 * Build a UPI deep link for specific payment apps
 */
export function buildUpiDeepLink(
  app: UpiApp,
  params: {
    upiId: string
    name: string
    amount: number
    note?: string
  }
): string {
  const { upiId, name, amount, note = 'Dutch It! Settlement' } = params
  const encodedName = encodeURIComponent(name)
  const encodedNote = encodeURIComponent(note)
  const amt = amount.toFixed(2)

  switch (app) {
    case 'gpay':
      return `gpay://upi/pay?pa=${upiId}&pn=${encodedName}&am=${amt}&cu=INR&tn=${encodedNote}`
    case 'phonepe':
      return `phonepe://pay?pa=${upiId}&pn=${encodedName}&am=${amt}&cu=INR&tn=${encodedNote}`
    case 'paytm':
      return `paytmmp://pay?pa=${upiId}&pn=${encodedName}&am=${amt}&cu=INR&tn=${encodedNote}`
    case 'bhim':
      return `bhim://pay?pa=${upiId}&pn=${encodedName}&am=${amt}&cu=INR&tn=${encodedNote}`
    case 'generic':
    default:
      return buildUpiQrString({ upiId, name, amount, note })
  }
}

/**
 * Builds the standard UPI QR string (used in QR code generation)
 */
export function buildUpiQrString(params: {
  upiId: string
  name: string
  amount: number
  note?: string
}): string {
  const { upiId, name, amount, note = 'Dutch It! Settlement' } = params
  const encodedName = encodeURIComponent(name)
  const encodedNote = encodeURIComponent(note)
  return `upi://pay?pa=${upiId}&pn=${encodedName}&am=${amount.toFixed(2)}&cu=INR&tn=${encodedNote}`
}

/**
 * Detects which UPI app handles a given UPI ID based on the handle/VPA suffix
 */
export function getUpiAppFromId(upiId: string): UpiApp {
  if (!upiId || !upiId.includes('@')) return 'generic'
  const handle = upiId.split('@')[1].toLowerCase()

  const handleMap: Record<string, UpiApp> = {
    // Google Pay
    okicici: 'gpay',
    oksbi: 'gpay',
    okaxis: 'gpay',
    okhdfcbank: 'gpay',
    // PhonePe
    ybl: 'phonepe',
    ibl: 'phonepe',
    axl: 'phonepe',
    // Paytm
    paytm: 'paytm',
    ptyes: 'paytm',
    pthdfc: 'paytm',
    ptaxis: 'paytm',
    ptkotak: 'paytm',
    // BHIM / UPI
    upi: 'bhim',
    bhim: 'bhim',
    rbl: 'bhim',
    npci: 'bhim',
  }

  return handleMap[handle] ?? 'generic'
}

/**
 * Returns a friendly display name for the UPI app
 */
export function getUpiAppName(upiId: string): string {
  const app = getUpiAppFromId(upiId)
  const names: Record<UpiApp, string> = {
    gpay: 'Google Pay',
    phonepe: 'PhonePe',
    paytm: 'Paytm',
    bhim: 'BHIM',
    generic: 'UPI',
  }
  return names[app]
}

export type { UpiApp }
