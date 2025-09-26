export type Currency = 'USD' | 'CHF'

export function formatCurrency(amount: number, currency: Currency = 'USD') {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(amount)
  } catch {
    // Fallback to manual formatting
    const symbol = currency === 'CHF' ? 'CHF' : '$'
    return `${symbol}${amount.toFixed(2)}`
  }
}
export const DEFAULT_CURRENCY: Currency = 'CHF'
