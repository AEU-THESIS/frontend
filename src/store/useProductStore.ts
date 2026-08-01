import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  getCategories,
  getProducts,
  createCategory as createCategoryApi,
  createProduct as createProductApi,
  getProductDetail,
  updateProduct as updateProductApi,
  deleteProduct as deleteProductApi,
  toggleProductAvailable as toggleProductAvailableApi,
  updateCategory as updateCategoryApi,
  deleteCategory as deleteCategoryApi,
} from '@/api/product'
import type { Product, Category, ProductFilters } from '@/types/product.types'
import type { CreateProductPayload } from '@/validations/productValidation'
import { uploadApi } from '@/api/upload'

export const useProductStore = defineStore('product', () => {
  const categories = ref<Category[]>([])
  const products = ref<Product[]>([])
  const selectedProductDetail = ref<Product | null>(null)
  const isCategoriesLoading = ref(false)
  const isProductsLoading = ref(false)
  const isProductDetailLoading = ref(false)
  const isCreatingProduct = ref(false)
  const isUpdatingProduct = ref(false)
  const isDeletingProduct = ref(false)
  const isUpdatingCategory = ref(false)
  const isDeletingCategory = ref(false)
  const lastError = ref<string | null>(null)
  const totalProducts = ref(0)

  // Filters
  const selectedCategoryId = ref<number | undefined>(undefined)
  const searchQuery = ref('')
  const selectedAvailabilityStatus = ref<boolean | undefined>(undefined)
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
      const result = await getProducts({
        categoryId: selectedCategoryId.value,
        search: searchQuery.value,
        isAvailable: true,
      })
      if (requestId === currentRequestId) {
        products.value = result.products
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

  const fetchProductsManagement = async (params: ProductFilters = {}) => {
    isProductsLoading.value = true
    lastError.value = null
    try {
      const result = await getProducts({
        categoryId: params.categoryId,
        search: params.name ?? '',
        isAvailable: params.isAvailable,
        page: params.paginationParams?.page,
        pageSize: params.paginationParams?.pageSize,
      })
      products.value = result.products
      totalProducts.value = result.total
    } catch (err) {
      throw err
    } finally {
      isProductsLoading.value = false
    }
  }

  const setCategoryFilter = async (catId?: number) => {
    selectedCategoryId.value = catId
    await fetchProducts()
  }

  const setAvailabilityFilter = async (isAvailable?: boolean) => {
    selectedAvailabilityStatus.value = isAvailable
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

  const createCategory = async (data: { name: string; isActive: boolean }) => {
    lastError.value = null
    try {
      const newCategory = await createCategoryApi(data)
      categories.value.push(newCategory)
      categories.value.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
      return newCategory
    } catch (err) {
      const error = err as Error
      lastError.value = error.message || 'Failed to create category'
      throw err
    }
  }

  const updateCategory = async (categoryId: number, data: { name: string; isActive: boolean }) => {
    isUpdatingCategory.value = true
    lastError.value = null
    try {
      const updatedCategory = await updateCategoryApi(categoryId, data)
      const index = categories.value.findIndex(c => c.id === categoryId)
      if (index !== -1) {
        categories.value[index] = updatedCategory
      }
      return updatedCategory
    } catch (err) {
      const error = err as Error
      lastError.value = error.message || 'Failed to update category'
      throw err
    } finally {
      isUpdatingCategory.value = false
    }
  }

  const deleteCategory = async (categoryId: number): Promise<void> => {
    isDeletingCategory.value = true
    lastError.value = null
    try {
      await deleteCategoryApi(categoryId)
      categories.value = categories.value.filter(c => c.id !== categoryId)
    } catch (err) {
      const error = err as Error
      lastError.value = error.message || 'Failed to delete category'
      throw err
    } finally {
      isDeletingCategory.value = false
    }
  }

  const createProduct = async (payload: CreateProductPayload): Promise<Product> => {
    isCreatingProduct.value = true
    lastError.value = null
    try {
      const newProduct = await createProductApi(payload)
      products.value.push(newProduct)
      return newProduct
    } catch (err) {
      const error = err as Error
      lastError.value = error.message || 'Failed to create product'
      throw err
    } finally {
      isCreatingProduct.value = false
    }
  }

  const uploadImage = async (file: File | null): Promise<string | null> => {
    let uploadedImageUrl: string | null = null
    let newlyUploadedImage = false

    try {
      if (file) {
        uploadedImageUrl = await uploadApi.uploadImage(file)
        newlyUploadedImage = true
      }
    } catch {
      // Rollback orphaned image if staff creation/update failed
      if (newlyUploadedImage && uploadedImageUrl) {
        try {
          await uploadApi.deleteImage(uploadedImageUrl)
          uploadedImageUrl = null
        } catch (rollbackErr) {
          console.error('Failed to rollback orphaned image:', rollbackErr)
        }
      }
    }
    return uploadedImageUrl
  }

  const fetchProductDetail = async (productId: number): Promise<Product> => {
    isProductDetailLoading.value = true
    lastError.value = null
    try {
      const product = await getProductDetail(productId)
      selectedProductDetail.value = product
      return product
    } catch (err) {
      const error = err as Error
      lastError.value = error.message || 'Failed to fetch product detail'
      throw err
    } finally {
      isProductDetailLoading.value = false
    }
  }

  const updateProduct = async (
    productId: number,
    payload: Partial<CreateProductPayload>
  ): Promise<Product> => {
    isUpdatingProduct.value = true
    lastError.value = null
    try {
      const updatedProduct = await updateProductApi(productId, payload)
      const index = products.value.findIndex(p => p.id === productId)
      if (index !== -1) {
        products.value[index] = updatedProduct
      }
      if (selectedProductDetail.value?.id === productId) {
        selectedProductDetail.value = updatedProduct
      }
      return updatedProduct
    } catch (err) {
      const error = err as Error
      lastError.value = error.message || 'Failed to update product'
      throw err
    } finally {
      isUpdatingProduct.value = false
    }
  }

  const deleteProduct = async (productId: number): Promise<void> => {
    isDeletingProduct.value = true
    lastError.value = null
    try {
      await deleteProductApi(productId)
      products.value = products.value.filter(p => p.id !== productId)
      if (selectedProductDetail.value?.id === productId) {
        selectedProductDetail.value = null
      }
    } catch (err) {
      const error = err as Error
      lastError.value = error.message || 'Failed to delete product'
      throw err
    } finally {
      isDeletingProduct.value = false
    }
  }

  const toggleAvailable = async (productId: number): Promise<Product> => {
    lastError.value = null
    try {
      const result = await toggleProductAvailableApi(productId)
      // Update the product in the products list
      const index = products.value.findIndex(p => p.id === productId)
      if (index !== -1) {
        products.value[index] = {
          ...products.value[index],
          isAvailable: result.isAvailable,
        }
      }
      // Update the selected product detail if it's the same product
      if (selectedProductDetail.value?.id === productId) {
        selectedProductDetail.value = {
          ...selectedProductDetail.value,
          isAvailable: result.isAvailable,
        }
      }
      return products.value[index]!
    } catch (err) {
      const error = err as Error
      lastError.value = error.message || 'Failed to toggle product availability'
      throw err
    }
  }

  return {
    categories,
    products,
    selectedProductDetail,
    isCategoriesLoading,
    isProductsLoading,
    isProductDetailLoading,
    isCreatingProduct,
    isUpdatingProduct,
    isDeletingProduct,
    isUpdatingCategory,
    isDeletingCategory,
    lastError,
    selectedCategoryId,
    searchQuery,
    selectedAvailabilityStatus,
    totalProducts,
    fetchCategories,
    fetchProducts,
    fetchProductDetail,
    setCategoryFilter,
    setSearchQuery,
    setAvailabilityFilter,
    createCategory,
    updateCategory,
    deleteCategory,
    createProduct,
    updateProduct,
    deleteProduct,
    toggleAvailable,
    uploadImage,
    fetchProductsManagement,
  }
})
