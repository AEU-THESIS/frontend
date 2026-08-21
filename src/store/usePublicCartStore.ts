import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Product } from '@/types/product.types'
import type { PreOrderItemPayload } from '@/api/publicOrder'
import { usePublicShopStore } from './usePublicShopStore'
import { cartDiscounts, isLineInScope, type CartLineForCalc } from '@/lib/promotionDiscount'

/**
 * Client-side cart for the Telegram Mini App pre-order flow.
 * Evaluates active promotions from usePublicShopStore to display discounts and net totals.
 * The server recomputes the authoritative total at submit.
 */
export interface PublicCartOption {
  optionSetId: number
  elementId: number
  groupName: string
  optionName: string
  extraPrice: number
}

export interface PublicCartItem {
  cartId: string
  productId: number
  categoryId: number
  name: string
  imageUrl: string | null
  basePrice: number
  quantity: number
  options: PublicCartOption[]
  unitPrice: number
  lineTotal: number
}

const genId = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36)

const optionsKey = (opts: PublicCartOption[]) =>
  [...opts]
    .map(o => o.elementId)
    .sort((a, b) => a - b)
    .join('-')

export const usePublicCartStore = defineStore('publicCart', () => {
  const shopStore = usePublicShopStore()
  const items = ref<PublicCartItem[]>([])

  const count = computed(() => items.value.reduce((sum, i) => sum + i.quantity, 0))
  const subtotal = computed(
    () => Math.round(items.value.reduce((sum, i) => sum + i.lineTotal, 0) * 100) / 100
  )

  const cartLines = computed<CartLineForCalc[]>(() =>
    items.value.map(item => ({
      productId: item.productId,
      categoryId: item.categoryId,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      subtotal: item.lineTotal,
    }))
  )

  const appliedResult = computed(() => cartDiscounts(shopStore.promotions, cartLines.value))
  const appliedPromotions = computed(() => appliedResult.value.applied)
  const discountTotal = computed(() => appliedResult.value.total)
  const total = computed(() =>
    Math.max(0, Math.round((subtotal.value - discountTotal.value + Number.EPSILON) * 100) / 100)
  )

  const bogoFreeByCartId = computed<Record<string, number>>(() => {
    const map: Record<string, number> = {}
    for (const { promotion } of appliedPromotions.value) {
      if (promotion.discountType !== 'BOGO') continue

      const units = items.value
        .filter(item =>
          isLineInScope(promotion, {
            productId: item.productId,
            categoryId: item.categoryId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            subtotal: item.lineTotal,
          })
        )
        .flatMap(item =>
          Array.from({ length: item.quantity }, () => ({
            cartId: item.cartId,
            unitPrice: item.unitPrice,
          }))
        )
        .sort((a, b) => a.unitPrice - b.unitPrice)

      const freeCount = Math.floor(units.length / 2)
      for (const { cartId } of units.slice(0, freeCount)) {
        map[cartId] = (map[cartId] ?? 0) + 1
      }
    }
    return map
  })

  const addItem = (product: Product, quantity: number, options: PublicCartOption[]) => {
    const basePrice = product.price == null ? 0 : Number(product.price)
    const extra = options.reduce((sum, o) => sum + o.extraPrice, 0)
    const unitPrice = basePrice + extra
    const key = optionsKey(options)

    const existing = items.value.find(
      i => i.productId === product.id && optionsKey(i.options) === key
    )
    if (existing) {
      existing.quantity += quantity
      existing.lineTotal = existing.unitPrice * existing.quantity
      return
    }

    items.value.push({
      cartId: genId(),
      productId: product.id,
      categoryId: product.categoryId,
      name: product.name,
      imageUrl: product.imageUrl,
      basePrice,
      quantity,
      options,
      unitPrice,
      lineTotal: unitPrice * quantity,
    })
  }

  const updateQuantity = (cartId: string, quantity: number) => {
    const item = items.value.find(i => i.cartId === cartId)
    if (!item) return
    if (quantity <= 0) {
      remove(cartId)
      return
    }
    item.quantity = quantity
    item.lineTotal = item.unitPrice * quantity
  }

  const remove = (cartId: string) => {
    items.value = items.value.filter(i => i.cartId !== cartId)
  }

  const clear = () => {
    items.value = []
  }

  /** Maps the cart to the create-pre-order payload (ids only; server prices it). */
  const toPayloadItems = (): PreOrderItemPayload[] =>
    items.value.map(i => ({
      productId: i.productId,
      quantity: i.quantity,
      selectedOptions: i.options.map(o => ({ optionSetId: o.optionSetId, elementId: o.elementId })),
    }))

  return {
    items,
    count,
    subtotal,
    discountTotal,
    appliedPromotions,
    total,
    bogoFreeByCartId,
    addItem,
    updateQuantity,
    remove,
    clear,
    toPayloadItems,
  }
})
