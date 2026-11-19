const DAY = 24 * 60 * 60 * 1000
const numberFormat = new Intl.NumberFormat('en-GB')

export const formatNumber = (n) => numberFormat.format(n)

export const plural = (n, one, many = `${one}s`) => `${formatNumber(n)} ${n === 1 ? one : many}`

const startOfDay = (date) => {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

// Whole calendar days from today to the date (negative = in the past).
export const daysFromToday = (iso) =>
  Math.round((startOfDay(iso) - startOfDay(Date.now())) / DAY)

export function relativeDay(iso) {
  if (!iso) return null
  const diff = daysFromToday(iso)
  if (diff === 0) return 'today'
  if (diff === -1) return 'yesterday'
  if (diff === 1) return 'tomorrow'
  return diff < 0 ? `${-diff} days ago` : `in ${diff} days`
}

export const weekdayShort = (iso) => new Date(iso).toLocaleDateString('en-GB', { weekday: 'short' })
export const weekdayLetter = (iso) => new Date(iso).toLocaleDateString('en-GB', { weekday: 'narrow' })

export const longDate = (date = new Date()) =>
  date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })

export function greeting(date = new Date()) {
  const hour = date.getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

export function formatBytes(bytes) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export const percent = (part, whole) => (whole ? Math.round((part / whole) * 100) : 0)
