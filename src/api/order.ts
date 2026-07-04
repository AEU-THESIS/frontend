import http from './api'
import type {
  CreateOrderPayload,
  OrderResult,
  OrderDetail,
  PaginatedOrders,
  OrdersResponse,
  OrderRow,
  TodayOrdersFilters,
} from '@/types/order.types'
import {
  createOrderSchema,
  fulfillmentStatusSchema,
  getOrdersParamsSchema,
} from '@/validations/orderValidation'

export const placeOrder = async (payload: CreateOrderPayload): Promise<OrderResult> => {
  const parsedPayload = createOrderSchema.parse(payload)
  const res = await http.post<OrderResult>('/api/orders', parsedPayload)
  return res.data
}

export const getOrders = async (params?: {
  status?: string
  paymentStatus?: string
  date?: string
  search?: string
  startDate?: string
  endDate?: string
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

export const getTodayOrders = async (filters: TodayOrdersFilters = {}): Promise<OrderRow[]> => {
  const day = filters.date ?? new Date().toISOString().slice(0, 10)

  const res = await http.get('api/orders', {
    params: {
      startDate: day,
      endDate: day,
      paymentStatus: 'paid',
      ...(filters.paymentMethod ? { paymentMethod: filters.paymentMethod } : {}),
      limit: 200,
    },
  })
  const data: OrdersResponse = res.data
  return data.orders
}
