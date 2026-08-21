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

  const promotionForProduct = (productId: number, categoryId: number): Promotion | null =>
    promotions.value.find(
      p =>
        p.scope === 'ALL' || p.productIds.includes(productId) || p.categoryIds.includes(categoryId)
    ) ?? null

  const loadMenu = async (nextSlug: string, force = false): Promise<boolean> => {
    if (!force && slug.value === nextSlug && shop.value) return true
    slug.value = nextSlug
    loading.value = true
    error.value = false
    try {
      const menu = await getPublicMenu(nextSlug)
      shop.value = menu.shop
      categories.value = menu.categories
      products.value = menu.products
      promotions.value = menu.promotions ?? []
      return true
    } catch {
      error.value = true
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
    loadMenu,
    promotionForProduct,
  }
})
