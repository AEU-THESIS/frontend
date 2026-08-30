import http from './api'
import type {
  CreateOrderPayload,
  OrderResult,
  OrderDetail,
  OrderRow,
  PaginatedOrders,
  OrdersResponse,
  TodayOrdersFilters,
} from '@/types/order.types'
import {
  createOrderSchema,
  fulfillmentStatusSchema,
  getOrdersParamsSchema,
  todayOrdersFiltersSchema,
} from '@/validations/orderValidation'

export const placeOrder = async (payload: CreateOrderPayload): Promise<OrderResult> => {
  const parsedPayload = createOrderSchema.parse(payload)
  const res = await http.post<OrderResult>('/api/orders', parsedPayload)
  return res.data
}

export const getOrders = async (params?: {
  status?: string
  paymentStatus?: string
  hasComp?: boolean
  date?: string
  search?: string
  startDate?: string
  endDate?: string
  // Restrict to one cashier's orders. A Cashier is clamped to their own id
  // server-side, so it can only ever return their own sales.
  userId?: number
  page?: number
  limit?: number
}): Promise<PaginatedOrders> => {
  const parsedParams = params ? getOrdersParamsSchema.parse(params) : undefined
  const res = await http.get<PaginatedOrders>('/api/orders', { params: parsedParams })
  return res.data
}

export const getOrderDetails = async (id: number): Promise<OrderDetail> => {
  const res = await http.get<OrderDetail>(`/api/orders/${id}`)
  return res.data
}

export const updateOrderStatus = async (id: number, status: string): Promise<OrderDetail> => {
  const parsedStatus = fulfillmentStatusSchema.parse(status)
  const res = await http.put<OrderDetail>(`/api/orders/${id}/status`, { status: parsedStatus })
  return res.data
}

// Void a whole order — reverses the payment (refund + un-redeem promotions) and
// marks it refunded + canceled. Returns the recalculated order tree.
export const voidOrder = async (id: number, reason?: string): Promise<OrderDetail> => {
  const res = await http.post<OrderDetail>(`/api/orders/${id}/void`, reason ? { reason } : {})
  return res.data
}

// Cancel a single line item — recalculates the order over the survivors and refunds
// the difference. Returns the updated order tree.
export const cancelOrderItem = async (orderId: number, itemId: number): Promise<OrderDetail> => {
  const res = await http.post<OrderDetail>(`/api/orders/${orderId}/items/${itemId}/cancel`, {})
  return res.data
}

const localIsoDate = (d: Date) => new Intl.DateTimeFormat('en-CA').format(d)

/** Rows per server request. The API caps a single page, so wide windows need several. */
const REPORT_PAGE_SIZE = 200
/** Backstop so an unexpected `totalPages` can't fan out into unbounded requests. */
const REPORT_MAX_PAGES = 25

/**
 * Every paid/partially-refunded order in the window, across as many server pages
 * as it takes. The sales report paginates client-side over the whole result, so
 * returning only the first page would silently drop orders past the cap — the
 * more so now that the filter spans a date range rather than a single day.
 */
export const getTodayOrders = async (filters: TodayOrdersFilters = {}): Promise<OrdersResponse> => {
  const parsedFilters = todayOrdersFiltersSchema.parse(filters)
  const startDay = parsedFilters.date ?? localIsoDate(new Date())
  // A missing end keeps the original single-day window.
  const endDay = parsedFilters.endDate ?? startDay

  const baseParams = {
    startDate: startDay,
    endDate: endDay,
    // Include partially-refunded orders so a partly-cancelled sale still shows its
    // surviving amount in the report list (matches the daily-summary totals).
    paymentStatus: 'paid,partially_refunded',
    ...(parsedFilters.paymentMethod ? { paymentMethod: parsedFilters.paymentMethod } : {}),
    limit: REPORT_PAGE_SIZE,
  }

  const fetchPage = async (page: number) => {
    const res = await http.get<OrdersResponse>('api/orders', {
      params: { ...baseParams, page },
    })
    return res.data
  }

  const first = await fetchPage(1)
  const serverPages = first.pagination.totalPages
  const pagesToFetch = Math.min(serverPages, REPORT_MAX_PAGES)

  // Page 1 already told us how many there are, so the rest can go out together
  // rather than in a serial chain.
  const rest =
    pagesToFetch > 1
      ? await Promise.all(Array.from({ length: pagesToFetch - 1 }, (_, i) => fetchPage(i + 2)))
      : []

  if (serverPages > REPORT_MAX_PAGES) {
    console.warn(
      `[getTodayOrders] ${first.pagination.total} orders in ${startDay}..${endDay}; stopped after ${REPORT_MAX_PAGES} pages`
    )
  }

  // Pages are fetched concurrently, so an order landing mid-fetch can shift the
  // window and repeat a row across two pages. Key by id to drop those.
  const byId = new Map<number, OrderRow>()
  for (const chunk of [first, ...rest]) {
    for (const order of chunk.orders) byId.set(order.id, order)
  }
  const orders = [...byId.values()]

  return {
    orders,
    // One combined page: `limit` is what actually came back, so the store's
    // `isTruncated` (total > limit) now flags only a real backstop cut.
    pagination: {
      total: first.pagination.total,
      page: 1,
      limit: orders.length,
      totalPages: 1,
    },
  }
}

// Reject a pending pre-order (unpaid → rejected). Board counterpart to accept.
export const rejectPreOrder = async (id: number): Promise<OrderDetail> => {
  const res = await http.put<OrderDetail>(`/api/orders/${id}/reject`, {})
  return res.data
}
