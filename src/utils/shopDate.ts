// Shop-local calendar helpers. Order timestamps are stored in UTC, but every
// report date filter — "today", the presets, custom ranges — must be expressed
// against the *café's* local day, not the browser's. Otherwise a device set to
// another timezone shifts which orders a preset returns, and the figures stop
// matching the server (which evaluates the same day in the shop's timezone).
//
// Cambodia (Asia/Phnom_Penh) is a fixed UTC+7 with no DST, so a constant offset
// is correct and dependency-free. Mirrors the backend's SHOP_UTC_OFFSET_MINUTES
// (backend/src/utils/date.ts); override both together via env for other shops.
// An empty env var (`VITE_SHOP_UTC_OFFSET_MINUTES=`) must NOT be read as 0 —
// Number('') is 0 — or the client would switch to UTC while the backend stays
// on UTC+7, shifting every report window by seven hours. Blank/unset → UTC+7.
const rawOffset = import.meta.env.VITE_SHOP_UTC_OFFSET_MINUTES?.trim()
const configuredOffset = rawOffset ? Number(rawOffset) : NaN
const SHOP_UTC_OFFSET_MINUTES = Number.isFinite(configuredOffset) ? configuredOffset : 420 // UTC+7

/**
 * The shop-local calendar date (`YYYY-MM-DD`) `dayOffset` days from today,
 * independent of the browser's timezone (e.g. -1 for the shop's "yesterday").
 */
export function shopDateString(dayOffset = 0): string {
  const shopNow = new Date(Date.now() + SHOP_UTC_OFFSET_MINUTES * 60_000)
  shopNow.setUTCDate(shopNow.getUTCDate() + dayOffset)
  return formatUtcParts(shopNow)
}

/** The shop-local calendar date (`YYYY-MM-DD`) a UTC instant / ISO string falls on. */
export function toShopDateString(date: Date | string): string {
  const instant = typeof date === 'string' ? new Date(date) : date
  return formatUtcParts(new Date(instant.getTime() + SHOP_UTC_OFFSET_MINUTES * 60_000))
}

/**
 * The UTC instant at the start (00:00:00.000) of the given shop-local day.
 * Accepts a `YYYY-MM-DD` string (any trailing time portion is ignored).
 */
export function shopDayStartUtc(dateStr: string): Date {
  const [year, month, day] = dateStr.slice(0, 10).split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0) - SHOP_UTC_OFFSET_MINUTES * 60_000)
}

/** The UTC instant at the end (23:59:59.999) of the given shop-local day. */
export function shopDayEndUtc(dateStr: string): Date {
  const [year, month, day] = dateStr.slice(0, 10).split('-').map(Number)
  return new Date(
    Date.UTC(year, month - 1, day, 23, 59, 59, 999) - SHOP_UTC_OFFSET_MINUTES * 60_000
  )
}

function formatUtcParts(d: Date): string {
  const year = d.getUTCFullYear()
  const month = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
