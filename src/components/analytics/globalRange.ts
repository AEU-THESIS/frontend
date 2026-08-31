import type { GlobalRangeKey, GlobalRangeValue } from '@/types/analytics.types'
import { shopDateString, shopDayStartUtc, shopDayEndUtc, toShopDateString } from '@/utils/shopDate'

/** Shop-local "YYYY-MM-DD" for the day an instant (Date or ISO string) falls on. */
export const toDateInput = (value: Date | string) => toShopDateString(value)

/** First day of the shop-local month `monthOffset` months from the current one. */
const shopMonthFirst = (monthOffset: number): string => {
  const [y, m] = shopDateString(0).split('-').map(Number)
  const idx = y * 12 + (m - 1) + monthOffset
  return `${Math.floor(idx / 12)}-${String((idx % 12) + 1).padStart(2, '0')}-01`
}

/**
 * Resolves a preset (or an explicit custom window) into concrete start/end
 * instants at the shop's local day boundaries — so the window is the same
 * calendar day the server reports on, regardless of the browser's timezone.
 * Shared by the filter component and the analytics view.
 */
export function resolveGlobalRange(
  key: GlobalRangeKey,
  customStart?: string,
  customEnd?: string
): GlobalRangeValue {
  const today = shopDateString(0)
  let startDay: string
  let endDay: string

  switch (key) {
    case 'yesterday':
      startDay = shopDateString(-1)
      endDay = startDay
      break
    case 'last7':
      startDay = shopDateString(-6)
      endDay = today
      break
    case 'thisMonth':
      startDay = shopMonthFirst(0)
      endDay = today
      break
    case 'thisYear':
      startDay = `${today.slice(0, 4)}-01-01`
      endDay = today
      break
    case 'custom':
      startDay = customStart || today
      endDay = customEnd || today
      break
    case 'today':
    default:
      startDay = today
      endDay = today
  }

  return {
    key,
    startDate: shopDayStartUtc(startDay).toISOString(),
    endDate: shopDayEndUtc(endDay).toISOString(),
  }
}
