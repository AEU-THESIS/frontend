import http from './api'
import type { Promotion, PromotionListResult, PromotionPayload } from '@/types/promotion.types'

export interface GetPromotionsParams {
  page?: number
  limit?: number
  search?: string
}

// Money/Decimal columns can serialize as strings over JSON; coerce to a number so
// callers can safely do arithmetic / .toFixed (mirrors api/product.ts price handling).
const normalize = (promotion: Promotion): Promotion => ({
  ...promotion,
  discountValue: Number(promotion.discountValue),
})

export const getPromotions = async (
  params: GetPromotionsParams = {}
): Promise<PromotionListResult> => {
  const res = await http.get<PromotionListResult>('/api/promotions', { params })
  return { ...res.data, data: res.data.data.map(normalize) }
}

// Active promotions for the POS cart (accessible to cashiers).
export const getActivePromotions = async (): Promise<Promotion[]> => {
  const res = await http.get<Promotion[]>('/api/promotions/active')
  return res.data.map(normalize)
}

export const createPromotion = async (payload: PromotionPayload): Promise<Promotion> => {
  const res = await http.post<Promotion>('/api/promotions', payload)
  return normalize(res.data)
}

export const updatePromotion = async (
  id: number,
  payload: Partial<PromotionPayload>
): Promise<Promotion> => {
  const res = await http.put<Promotion>(`/api/promotions/${id}`, payload)
  return normalize(res.data)
}

export const deletePromotion = async (id: number): Promise<void> => {
  await http.delete(`/api/promotions/${id}`)
}
