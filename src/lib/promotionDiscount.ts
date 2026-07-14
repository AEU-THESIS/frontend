/**
 * POS cart discount calculation.
 *
 * This mirrors the backend `utils/promotionDiscount.ts` exactly so the discount
 * the cashier sees in the cart matches what the server independently recomputes
 * and persists at checkout. Keep the two in sync.
 *
 * Model: at most one promotion applies per order — the active promotion that
 * produces the largest discount for the cart's in-scope lines.
 */
import type { Promotion } from '@/types/promotion.types'

export interface CartLineForCalc {
  productId: number
  categoryId: number
  subtotal: number // (base price + option extras) * quantity
}

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100

export const isLineInScope = (promo: Promotion, line: CartLineForCalc): boolean =>
  promo.scope === 'ALL' ||
  promo.productIds.includes(line.productId) ||
  promo.categoryIds.includes(line.categoryId)

export const promotionDiscount = (promo: Promotion, lines: CartLineForCalc[]): number => {
  const base = lines
    .filter(line => isLineInScope(promo, line))
    .reduce((sum, line) => sum + line.subtotal, 0)

  if (base <= 0) return 0

  let discount = 0
  if (promo.discountType === 'PERCENTAGE') {
    discount = base * (promo.discountValue / 100)
  } else if (promo.discountType === 'FIXED_AMOUNT') {
    discount = Math.min(promo.discountValue, base)
  } else {
    // BOGO is not auto-applied in cart math (Percentage/Fixed only).
    discount = 0
  }

  return round2(Math.min(discount, base))
}

export const bestPromotion = (
  promos: Promotion[],
  lines: CartLineForCalc[]
): { promotion: Promotion; discount: number } | null => {
  let best: { promotion: Promotion; discount: number } | null = null
  for (const promo of promos) {
    const discount = promotionDiscount(promo, lines)
    if (discount > 0 && (best === null || discount > best.discount)) {
      best = { promotion: promo, discount }
    }
  }
  return best
}
