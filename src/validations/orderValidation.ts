import { z } from 'zod'

const selectedOptionSchema = z.object({
  optionSetId: z.number().int().positive(),
  elementId: z.number().int().positive(),
  groupName: z.string().min(1),
  optionName: z.string().min(1),
  extraPrice: z.number().min(0),
})

const cartItemPayloadSchema = z.object({
  productId: z.number().int().positive(),
  quantity: z.number().int().min(1).max(99),
  selectedOptions: z.array(selectedOptionSchema),
})

export const createOrderSchema = z.object({
  orderType: z.enum(['dine_in', 'takeaway']),
  paymentMethod: z.literal('cash'),
  paymentCurrency: z.enum(['USD', 'KHR']),
  receivedAmount: z.number().positive('Received amount is required'),
  exchangeRateSnapshot: z.number().positive(),
  totalAmount: z.number().positive(),
  items: z.array(cartItemPayloadSchema).min(1, 'At least one item is required'),
})
