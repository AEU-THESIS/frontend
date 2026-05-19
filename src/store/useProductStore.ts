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
    try {
      products.value = await getProducts(selectedCategoryId.value, searchQuery.value)
    } catch (err) {
      const error = err as Error
      lastError.value = error.message || 'Failed to fetch products'
      throw err
    } finally {
      isProductsLoading.value = false
    }
  }

  const setCategoryFilter = (catId?: number) => {
    selectedCategoryId.value = catId
    fetchProducts()
  }

  const setSearchQuery = (query: string) => {
    searchQuery.value = query
    fetchProducts()
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
