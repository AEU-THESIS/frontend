import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getPublicMenu, type PublicShop } from '@/api/publicOrder'
import type { Product } from '@/types/product.types'

/**
 * Holds the resolved shop + menu for the current Mini App session, loaded once by
 * slug and shared across the public views (menu, checkout, confirmation).
 */
export const usePublicShopStore = defineStore('publicShop', () => {
  const slug = ref('')
  const shop = ref<PublicShop | null>(null)
  const categories = ref<{ id: number; name: string; sortOrder: number }[]>([])
  const products = ref<Product[]>([])
  const loading = ref(false)
  const error = ref(false)

  const loadMenu = async (nextSlug: string, force = false) => {
    if (!force && slug.value === nextSlug && shop.value) return
    slug.value = nextSlug
    loading.value = true
    error.value = false
    try {
      const menu = await getPublicMenu(nextSlug)
      shop.value = menu.shop
      categories.value = menu.categories
      products.value = menu.products
    } catch {
      error.value = true
      shop.value = null
      categories.value = []
      products.value = []
    } finally {
      loading.value = false
    }
  }

  return { slug, shop, categories, products, loading, error, loadMenu }
})
