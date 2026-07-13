export type DiscountType = 'PERCENTAGE' | 'FIXED_AMOUNT' | 'BOGO'
export type PromotionScope = 'ALL' | 'SPECIFIC'

export interface Promotion {
  id: number
  name: string
  code: string | null
  discountType: DiscountType
  discountValue: number
  scope: PromotionScope
  isActive: boolean
  startDate: string | null
  endDate: string | null
  createdAt: string
  categoryIds: number[]
  productIds: number[]
}

export interface PromotionSummary {
  activePromotions: number
  totalRedeemed: number
  upcomingOffers: number
}

export interface PromotionPagination {
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface PromotionListResult {
  data: Promotion[]
  pagination: PromotionPagination
  summary: PromotionSummary
}

export interface PromotionPayload {
  name: string
  code?: string | null
  discountType: DiscountType
  discountValue: number
  scope: PromotionScope
  isActive: boolean
  startDate?: string | null
  endDate?: string | null
  categoryIds: number[]
  productIds: number[]
}
