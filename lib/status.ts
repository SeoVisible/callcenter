export function formatStatusLabel(s: string | undefined | null) {
  if (!s) return 'Unknown'
  // Replace underscores, then title-case each word
  return String(s).replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

export function normalizeStatusKey(s: string | undefined | null) {
  if (!s) return ''
  return String(s)
}
