import http from './api'
import type {
  CreateOrderPayload,
  OrderResult,
  OrderDetail,
  PaginatedOrders,
} from '@/types/order.types'
import { createOrderSchema } from '@/validations/orderValidation'

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
  const res = await http.get<PaginatedOrders>('/api/orders', { params })
  return res.data
}

export const getOrderDetails = async (id: number): Promise<OrderDetail> => {
  const res = await http.get<OrderDetail>(`/api/orders/${id}`)
  return res.data
}

export const updateOrderStatus = async (id: number, status: string): Promise<OrderDetail> => {
  const res = await http.put<OrderDetail>(`/api/orders/${id}/status`, { status })
  return res.data
}
