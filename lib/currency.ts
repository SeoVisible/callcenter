export type Currency = 'USD' | 'CHF' | 'EUR'

export function formatCurrency(amount: number, currency: Currency = 'EUR') {
  try {
    // Use German locale to render Euro amounts consistently for the German UI
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency }).format(amount)
  } catch {
    // Fallback to manual formatting
    const symbol = currency === 'CHF' ? 'CHF' : currency === 'EUR' ? '€' : '$'
    return `${symbol}${amount.toFixed(2)}`
  }
}

export const DEFAULT_CURRENCY: Currency = 'EUR'
