import http from './api'
import type { CreateOrderPayload, OrderResult } from '@/types/order.types'
import { createOrderSchema } from '@/validations/orderValidation'

export const placeOrder = async (payload: CreateOrderPayload): Promise<OrderResult> => {
  const parsedPayload = createOrderSchema.parse(payload)
  const res = await http.post<OrderResult>('/api/orders', parsedPayload)
  return res.data
}
