export function formatDateSafe(d: unknown, locale = 'de-DE'): string {
  try {
    if (d === undefined || d === null || d === '') return ''
    const dt = d instanceof Date ? d : new Date(String(d))
    if (isNaN(dt.getTime())) return ''
    return dt.toLocaleDateString(locale)
  } catch {
    return ''
  }
}
