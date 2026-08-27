import http from './api'
import type { Product, Category, CategoryType, ProductResponse } from '@/types/product.types'
import type { CreateProductPayload } from '@/validations/productValidation'

export const getCategories = async (params: { type?: CategoryType } = {}): Promise<Category[]> => {
  const res = await http.get<Category[]>('/api/categories', { params })
  return res.data
}

export const getProducts = async (filters: {
  categoryId?: number
  search?: string
  isAvailable?: boolean
  page?: number
  pageSize?: number
}): Promise<ProductResponse> => {
  const params = { ...filters }
  if (params.categoryId) params.categoryId = params.categoryId
  if (params.search) params.search = params.search
  if (params.isAvailable !== undefined) params.isAvailable = params.isAvailable
  if (!!filters.page) params.page = filters.page
  if (!!filters.pageSize) params.pageSize = filters.pageSize

  const res = await http.get<ProductResponse>('/api/products', { params })
  return {
    products: res.data.products.map(product => ({
      ...product,
      price: product.price ? Number(product.price) : null,
      optionSets: (product.optionSets || []).map(pos => ({
        ...pos,
        optionSet: {
          ...pos.optionSet,
          elements: (pos.optionSet?.elements || []).map(el => ({
            ...el,
            priceModifier: Number(el.priceModifier),
          })),
        },
      })),
    })),
    total: res.data.total,
  }
}

export const createProduct = async (payload: CreateProductPayload): Promise<Product> => {
  const res = await http.post<Product>('/api/products', payload)
  return res.data
}

export const getProductDetail = async (productId: number): Promise<Product> => {
  const res = await http.get<Product>(`/api/products/${productId}`)
  return {
    ...res.data,
    price: res.data.price ? Number(res.data.price) : null,
    optionSets: (res.data.optionSets || []).map(pos => ({
      ...pos,
      optionSet: {
        ...pos.optionSet,
        elements: (pos.optionSet?.elements || []).map(el => ({
          ...el,
          priceModifier: Number(el.priceModifier),
        })),
      },
    })),
  }
}

export const createCategory = async (data: {
  name: string
  isActive: boolean
  type: CategoryType
}): Promise<Category> => {
  const res = await http.post<Category>('/api/categories', data)
  return res.data
}

export const updateCategory = async (
  categoryId: number,
  data: {
    name: string
    isActive: boolean
    type: CategoryType
  }
): Promise<Category> => {
  const res = await http.put<Category>(`/api/categories/${categoryId}`, data)
  return res.data
}

export const deleteCategory = async (categoryId: number): Promise<void> => {
  await http.delete<null>(`/api/categories/${categoryId}`)
}

export const updateProduct = async (
  productId: number,
  payload: Partial<CreateProductPayload>
): Promise<Product> => {
  const res = await http.put<Product>(`/api/products/${productId}`, payload)
  return res.data
}

export const deleteProduct = async (productId: number): Promise<void> => {
  await http.delete<null>(`/api/products/${productId}`)
}

export const toggleProductAvailable = async (
  productId: number
): Promise<{ id: number; name: string; isAvailable: boolean; message: string }> => {
  const res = await http.put<{ id: number; name: string; isAvailable: boolean; message: string }>(
    `/api/products/${productId}/toggle-available`
  )
  return res.data
}
