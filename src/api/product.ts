import http from './api'
import type { Product, Category } from '@/types/product.types'

export const getCategories = async (): Promise<Category[]> => {
  const res = await http.get<Category[]>('/api/categories')
  return res.data
}

export const getProducts = async (categoryId?: number, search?: string): Promise<Product[]> => {
  const params: { categoryId?: number; search?: string } = {}
  if (categoryId) params.categoryId = categoryId
  if (search) params.search = search

  const res = await http.get<Product[]>('/api/products', { params })
  return res.data
}
