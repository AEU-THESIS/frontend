import type { GlobalRangeKey, GlobalRangeValue } from '@/types/analytics.types'

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0)
const endOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999)
const addDays = (d: Date, n: number) => {
  const copy = new Date(d)
  copy.setDate(copy.getDate() + n)
  return copy
}

/** Local "YYYY-MM-DD" (avoids the UTC shift of toISOString().slice). */
export const toDateInput = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

/** Parse a "YYYY-MM-DD" input as a local calendar date (not UTC midnight). */
export const parseDateInput = (s: string) => {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, (m || 1) - 1, d || 1)
}

/**
 * Resolves a preset (or an explicit custom window) into concrete ISO
 * start/end instants. Shared by the filter component and the analytics view.
 */
export function resolveGlobalRange(
  key: GlobalRangeKey,
  customStart?: string,
  customEnd?: string
): GlobalRangeValue {
  const now = new Date()
  const today = startOfDay(now)
  let start: Date
  let end: Date

  switch (key) {
    case 'yesterday':
      start = addDays(today, -1)
      end = endOfDay(start)
      break
    case 'last7':
      start = addDays(today, -6)
      end = endOfDay(now)
      break
    case 'thisMonth':
      start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0)
      end = endOfDay(now)
      break
    case 'thisYear':
      start = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0)
      end = endOfDay(now)
      break
    case 'custom': {
      start = customStart ? startOfDay(parseDateInput(customStart)) : today
      end = customEnd ? endOfDay(parseDateInput(customEnd)) : endOfDay(now)
      break
    }
    case 'today':
    default:
      start = today
      end = endOfDay(now)
  }

  return { key, startDate: start.toISOString(), endDate: end.toISOString() }
}
