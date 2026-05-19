import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getCategories, getProducts } from '@/api/product'
import type { Product, Category } from '@/types/product.types'

export const useProductStore = defineStore('product', () => {
  const categories = ref<Category[]>([])
  const products = ref<Product[]>([])
  const isCategoriesLoading = ref(false)
  const isProductsLoading = ref(false)
  const lastError = ref<string | null>(null)

  // Filters
  const selectedCategoryId = ref<number | undefined>(undefined)
  const searchQuery = ref('')
  let currentRequestId = 0
  let searchDebounceTimeout: ReturnType<typeof setTimeout> | null = null

  // Actions
  const fetchCategories = async () => {
    isCategoriesLoading.value = true
    lastError.value = null
    try {
      categories.value = await getCategories()
    } catch (err) {
      const error = err as Error
      lastError.value = error.message || 'Failed to fetch categories'
      throw err
    } finally {
      isCategoriesLoading.value = false
    }
  }

  const fetchProducts = async () => {
    isProductsLoading.value = true
    lastError.value = null
    currentRequestId++
    const requestId = currentRequestId
    try {
      const result = await getProducts(selectedCategoryId.value, searchQuery.value)
      if (requestId === currentRequestId) {
        products.value = result
      }
    } catch (err) {
      if (requestId === currentRequestId) {
        const error = err as Error
        lastError.value = error.message || 'Failed to fetch products'
        throw err
      }
    } finally {
      if (requestId === currentRequestId) {
        isProductsLoading.value = false
      }
    }
  }

  const setCategoryFilter = async (catId?: number) => {
    selectedCategoryId.value = catId
    await fetchProducts()
  }

  const setSearchQuery = (query: string): Promise<void> => {
    searchQuery.value = query
    if (searchDebounceTimeout) {
      clearTimeout(searchDebounceTimeout)
    }
    return new Promise<void>((resolve, reject) => {
      searchDebounceTimeout = setTimeout(async () => {
        try {
          await fetchProducts()
          resolve()
        } catch (err) {
          reject(err)
        }
      }, 300)
    })
  }

  return {
    categories,
    products,
    isCategoriesLoading,
    isProductsLoading,
    lastError,
    selectedCategoryId,
    searchQuery,
    fetchCategories,
    fetchProducts,
    setCategoryFilter,
    setSearchQuery,
  }
})
