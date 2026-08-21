import publicHttp from './publicHttp'
import type { Product } from '@/types/product.types'
import type { Promotion } from '@/types/promotion.types'

/** Shop display info returned with the public menu (no internal fields). */
export interface PublicShop {
  id: number
  name: string
  slug: string
  currencySymbol: string
}

export interface PublicMenu {
  shop: PublicShop
  categories: { id: number; name: string; sortOrder: number }[]
  products: Product[]
  promotions: Promotion[]
}

export interface PreOrderItemPayload {
  productId: number
  quantity: number
  // The server re-derives names/prices from the DB; only the ids are sent.
  selectedOptions: { optionSetId: number; elementId: number }[]
}

export interface CreatePreOrderPayload {
  customerName?: string
  customerPhone: string
  deliveryAddress?: string
  deliveryLat?: number
  deliveryLng?: number
  items: PreOrderItemPayload[]
}

export interface PreOrderResult {
  id: number
  orderNumber: string
  // Money comes back as a Prisma Decimal, which serializes as a string — coerce
  // with Number() before doing math or calling .toFixed (see CLAUDE.md §5).
  totalAmount: number | string
  fulfillmentStatus: string
  paymentStatus: string
}

export interface MyPreOrder {
  id: number
  orderNumber: string
  // Prisma Decimal → string on the wire; coerce with Number() before formatting.
  totalAmount: number | string
  fulfillmentStatus: string
  paymentStatus: string
  createdAt: string
  items: { id: number; quantity: number; name: string; options: string[] }[]
}

export interface PaginatedPreOrders {
  orders: MyPreOrder[]
  total: number
  totalPages: number
  page: number
  hasMore: boolean
}

export const getPublicMenu = async (slug: string): Promise<PublicMenu> => {
  const res = await publicHttp.get<PublicMenu>(`/api/public/shops/${slug}/menu`)
  return res.data
}

export const createPreOrder = async (
  slug: string,
  payload: CreatePreOrderPayload
): Promise<PreOrderResult> => {
  const res = await publicHttp.post<PreOrderResult>(`/api/public/shops/${slug}/orders`, payload)
  return res.data
}

export const getMyPreOrders = async (
  slug: string,
  page = 1,
  limit = 10
): Promise<PaginatedPreOrders> => {
  const res = await publicHttp.get<PaginatedPreOrders>(`/api/public/shops/${slug}/orders/mine`, {
    params: { page, limit },
  })
  const raw = res.data as Record<string, unknown>
  const orders: MyPreOrder[] = Array.isArray(raw) ? raw : ((raw?.orders as MyPreOrder[]) ?? [])
  const total = (raw?.total as number) ?? orders.length
  const totalPages = (raw?.totalPages as number) ?? (orders.length ? Math.ceil(total / limit) : 1)
  const currentPage = (raw?.page as number) ?? page

  return {
    orders,
    total,
    totalPages,
    page: currentPage,
    hasMore: currentPage < totalPages,
  }
}
