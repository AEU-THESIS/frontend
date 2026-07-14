import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { placeOrder } from '@/api/order'
import { getActivePromotions } from '@/api/promotion'
import { bestPromotion, type CartLineForCalc } from '@/lib/promotionDiscount'
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
      subtotal: item.itemTotal,
    }))
  )

  // The single best-matching active promotion for the current cart (or null).
  const appliedResult = computed(() => bestPromotion(activePromotions.value, cartLines.value))
  const appliedPromotion = computed(() => appliedResult.value?.promotion ?? null)
  const discountTotal = computed(() => appliedResult.value?.discount ?? 0)

  // Net total actually charged (subtotal − discount). EPSILON-aligned with the
  // backend round2 helper for exact parity.
  const netTotal = computed(
    () => Math.round((cartTotal.value - discountTotal.value + Number.EPSILON) * 100) / 100
  )

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
    appliedPromotion,
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
    checkout,
  }
})
