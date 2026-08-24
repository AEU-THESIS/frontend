import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getPublicMenu, type PublicShop } from '@/api/publicOrder'
import type { Product } from '@/types/product.types'
import type { Promotion } from '@/types/promotion.types'

/**
 * Holds the resolved shop + menu + active promotions for the current Mini App
 * session, loaded once by slug and shared across the public views (menu, checkout, confirmation).
 */
export const usePublicShopStore = defineStore('publicShop', () => {
  const slug = ref('')
  const shop = ref<PublicShop | null>(null)
  const categories = ref<{ id: number; name: string; sortOrder: number }[]>([])
  const products = ref<Product[]>([])
  const promotions = ref<Promotion[]>([])
  const loading = ref(false)
  const error = ref(false)
  const isBlocked = ref(false)
  const isShopClosed = ref(false)

  const promotionForProduct = (productId: number, categoryId: number): Promotion | null =>
    promotions.value.find(
      p =>
        p.scope === 'ALL' || p.productIds.includes(productId) || p.categoryIds.includes(categoryId)
    ) ?? null

  const loadMenu = async (nextSlug: string, force = false): Promise<boolean> => {
    if (!force && slug.value === nextSlug && (shop.value || isBlocked.value || isShopClosed.value))
      return true
    slug.value = nextSlug
    loading.value = true
    error.value = false
    isBlocked.value = false
    isShopClosed.value = false
    try {
      const menu = await getPublicMenu(nextSlug)
      shop.value = menu.shop
      isShopClosed.value = menu.shop.isShopClosed === true
      categories.value = menu.categories
      products.value = menu.products
      promotions.value = menu.promotions ?? []
      return true
    } catch (err: unknown) {
      const axiosErr = err as { response?: { status?: number } }
      if (axiosErr?.response?.status === 403) {
        isBlocked.value = true
        error.value = false
      } else {
        error.value = true
        isBlocked.value = false
      }
      shop.value = null
      categories.value = []
      products.value = []
      promotions.value = []
      return false
    } finally {
      loading.value = false
    }
  }

  return {
    slug,
    shop,
    categories,
    products,
    promotions,
    loading,
    error,
    isBlocked,
    isShopClosed,
    loadMenu,
    promotionForProduct,
  }
})
