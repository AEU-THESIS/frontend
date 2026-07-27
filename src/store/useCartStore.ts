import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { placeOrder } from '@/api/order'
import { getActivePromotions } from '@/api/promotion'
import { cartDiscounts, type CartLineForCalc } from '@/lib/promotionDiscount'
import type { Promotion } from '@/types/promotion.types'
import type {
  CartItem,
  CartItemOption,
  OrderType,
  PaymentCurrency,
  CreateOrderPayload,
} from '@/types/order.types'

const generateCartId = () => {
  return Math.random().toString(36).substring(2, 9) + '-' + Date.now().toString(36)
}

export const useCartStore = defineStore('cart', () => {
  const items = ref<CartItem[]>([])
  const orderType = ref<OrderType>('dine_in')
  const exchangeRate = ref(4100) // Snapshot exchange rate (defaults to 4100)
  const isSubmitting = ref(false)
  const isCashModalOpen = ref(false)
  const activePromotions = ref<Promotion[]>([])

  // Getters
  // Gross subtotal (before any promotion discount).
  const cartTotal = computed(() => {
    return items.value.reduce((sum, item) => sum + item.itemTotal, 0)
  })

  const cartLines = computed<CartLineForCalc[]>(() =>
    items.value.map(item => ({
      productId: item.productId,
      categoryId: item.categoryId,
      quantity: item.quantity,
      // itemTotal = unitPrice * quantity, so unitPrice = itemTotal / quantity.
      unitPrice: item.quantity > 0 ? item.itemTotal / item.quantity : item.itemTotal,
      subtotal: item.itemTotal,
    }))
  )

  // Every promotion that applies to the current cart (they stack across items) and
  // the summed discount.
  const appliedResult = computed(() => cartDiscounts(activePromotions.value, cartLines.value))
  const appliedPromotions = computed(() => appliedResult.value.applied)
  const discountTotal = computed(() => appliedResult.value.total)

  // Net total actually charged (subtotal − discount). EPSILON-aligned with the
  // backend round2 helper for exact parity.
  const netTotal = computed(
    () => Math.round((cartTotal.value - discountTotal.value + Number.EPSILON) * 100) / 100
  )

  // The active promotion that covers a given product (by product id, its category,
  // or an ALL-scope promo), or null. Used to surface a promo badge on POS cards so
  // the cashier can see at a glance which items carry a discount. If several apply,
  // the most recently created one wins (list is ordered createdAt desc).
  const promotionForProduct = (productId: number, categoryId: number): Promotion | null =>
    activePromotions.value.find(
      p =>
        p.scope === 'ALL' || p.productIds.includes(productId) || p.categoryIds.includes(categoryId)
    ) ?? null

  const lineInScope = (promo: Promotion, item: CartItem): boolean =>
    promo.scope === 'ALL' ||
    promo.productIds.includes(item.productId) ||
    promo.categoryIds.includes(item.categoryId)

  // How many free units each applied BOGO promo grants to each cart line. Mirrors
  // the discount engine: per BOGO promo, expand its in-scope units, make the
  // cheapest half free, then attribute those free units back to their cart line so
  // the sidebar can show a "N free" tag.
  const bogoFreeByCartId = computed<Record<string, number>>(() => {
    const map: Record<string, number> = {}
    for (const { promotion } of appliedPromotions.value) {
      if (promotion.discountType !== 'BOGO') continue

      const units = items.value
        .filter(item => lineInScope(promotion, item))
        .flatMap(item => {
          const unitPrice = item.quantity > 0 ? item.itemTotal / item.quantity : item.itemTotal
          return Array.from({ length: item.quantity }, () => ({ cartId: item.cartId, unitPrice }))
        })
        .sort((a, b) => a.unitPrice - b.unitPrice)

      const freeCount = Math.floor(units.length / 2)
      for (const { cartId } of units.slice(0, freeCount)) {
        map[cartId] = (map[cartId] ?? 0) + 1
      }
    }
    return map
  })

  const cartTotalInRiel = computed(() => {
    return Math.ceil(cartTotal.value * exchangeRate.value)
  })

  const netTotalInRiel = computed(() => {
    return Math.ceil(netTotal.value * exchangeRate.value)
  })

  const itemsCount = computed(() => {
    return items.value.reduce((sum, item) => sum + item.quantity, 0)
  })

  // Actions
  const addToCart = (
    productId: number,
    categoryId: number,
    productName: string,
    imageUrl: string | null,
    basePrice: number,
    quantity: number,
    selectedOptions: CartItemOption[]
  ) => {
    // Generate sorting key to group identical items with exact same options
    const optionsKey = [...selectedOptions]
      .sort((a, b) => a.elementId - b.elementId)
      .map(o => `${o.elementId}`)
      .join('-')

    // Find if identical item already in cart
    const existing = items.value.find(
      item =>
        item.productId === productId &&
        [...item.selectedOptions]
          .sort((a, b) => a.elementId - b.elementId)
          .map(o => `${o.elementId}`)
          .join('-') === optionsKey
    )

    const extraPriceSum = selectedOptions.reduce((sum, o) => sum + o.extraPrice, 0)
    const unitPrice = basePrice + extraPriceSum

    if (existing) {
      existing.quantity += quantity
      existing.itemTotal = unitPrice * existing.quantity
    } else {
      items.value.push({
        cartId: generateCartId(),
        productId,
        categoryId,
        productName,
        imageUrl,
        basePrice,
        quantity,
        selectedOptions,
        itemTotal: unitPrice * quantity,
      })
    }
  }

  const updateQuantity = (cartId: string, quantity: number) => {
    const item = items.value.find(i => i.cartId === cartId)
    if (!item) return

    if (quantity <= 0) {
      removeFromCart(cartId)
    } else {
      item.quantity = quantity
      const extraPriceSum = item.selectedOptions.reduce((sum, o) => sum + o.extraPrice, 0)
      item.itemTotal = (item.basePrice + extraPriceSum) * item.quantity
    }
  }

  const removeFromCart = (cartId: string) => {
    items.value = items.value.filter(i => i.cartId !== cartId)
  }

  const clearCart = () => {
    items.value = []
  }

  const setOrderType = (type: OrderType) => {
    orderType.value = type
  }

  // Load today's active promotions so the cart can show/apply discounts. The
  // backend independently re-validates and recomputes them at checkout.
  const fetchActivePromotions = async () => {
    try {
      activePromotions.value = await getActivePromotions()
    } catch {
      activePromotions.value = []
    }
  }

  const checkout = async (paymentCurrency: PaymentCurrency, receivedAmount: number) => {
    isSubmitting.value = true
    try {
      const payload: CreateOrderPayload = {
        orderType: orderType.value,
        paymentMethod: 'cash',
        paymentCurrency,
        receivedAmount,
        exchangeRateSnapshot: exchangeRate.value,
        // Net total; the server ignores this and recomputes authoritatively.
        totalAmount: netTotal.value,
        items: items.value.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          selectedOptions: item.selectedOptions,
        })),
      }

      const result = await placeOrder(payload)
      clearCart()
      return result
    } catch (err) {
      throw err
    } finally {
      isSubmitting.value = false
    }
  }

  return {
    items,
    orderType,
    exchangeRate,
    isSubmitting,
    isCashModalOpen,
    activePromotions,
    cartTotal,
    cartTotalInRiel,
    appliedPromotions,
    discountTotal,
    netTotal,
    netTotalInRiel,
    itemsCount,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    setOrderType,
    fetchActivePromotions,
    promotionForProduct,
    bogoFreeByCartId,
    checkout,
  }
})
