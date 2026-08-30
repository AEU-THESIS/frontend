import type { OrderCashier } from '@/types/order.types'

// Shown for an order carrying no recorded staff member — one placed before cashiers
// were tracked, or a customer pre-order that no one rang up. Matches the label the
// backend's CSV sales export already writes, so exports and screens agree.
export const SYSTEM_CASHIER = 'System'

/**
 * The cashier's name for display. Never returns an empty string: an order with no
 * user (or one whose name is blank) falls back to "System" so every list row, detail
 * panel and receipt has something to show. Screens pass the translated label
 * (`t('common.systemCashier')`) so the fallback follows the UI language; the default
 * keeps the untranslated wording for non-UI callers.
 */
export const cashierName = (
  user?: OrderCashier | null,
  fallback: string = SYSTEM_CASHIER
): string => user?.name?.trim() || fallback
