export function formatStatusLabel(s: string | undefined | null) {
  if (!s) return 'Unbekannt'
  const key = String(s)
  const map: Record<string, string> = {
    pending: 'Ausstehend',
    maker: 'Entwurf',
    sent: 'Versendet',
    paid: 'Bezahlt',
    not_paid: 'Nicht bezahlt',
    completed: 'Abgeschlossen',
  }

  return map[key] ?? String(s).replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

export function normalizeStatusKey(s: string | undefined | null) {
  if (!s) return ''
  return String(s)
}
