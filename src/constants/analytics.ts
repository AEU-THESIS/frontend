/** Stock-alert severity, surfaced from inventory insights. */
export const STOCK_STATUS = {
  CRITICAL: 'critical',
  LOW: 'low',
} as const

/** Which selling-items list a card shows (drives the API `type` below). */
export const SELLING_TABLE = {
  BEST: 'best',
  LOWEST: 'lowest',
} as const

/** The selling-items endpoint's ranking direction. */
export const SELLING_TYPE = {
  TOP: 'top',
  BOTTOM: 'bottom',
} as const
