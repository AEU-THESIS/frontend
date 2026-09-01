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
  // Complimentary line (loyalty-stamp redemption). Optional so ordinary lines are
  // unchanged; the server owns the pricing and records the reason.
  isComplimentary: z.boolean().optional(),
  // Matches the backend/DB cap (comp_reason VARCHAR(191)).
  compReason: z.string().trim().max(191).optional(),
})

export const createOrderSchema = z
  .object({
    orderType: z.enum(['dine_in', 'takeaway']),
    // 'khqr' is a manual bank transfer recorded by staff (no Bakong API). Mirrors the
    // backend enum so the client rejects a bad value before it round-trips.
    paymentMethod: z.enum(['cash', 'khqr']),
    // Bank the customer paid via for a KHQR order; required when paymentMethod is
    // 'khqr' (see the refine below). Cap matches the backend `bank_name` column.
    bankName: z.string().trim().min(1).max(191).optional(),
    paymentCurrency: z.enum(['USD', 'KHR']),
    // May be 0 for a 100%-off order. The server owns the total and the exchange
    // rate, so they are no longer sent from the client.
    receivedAmount: z.number().min(0, 'Received amount must be zero or more'),
    items: z.array(cartItemPayloadSchema).min(1, 'At least one item is required'),
  })
  // Riel is only tendered in whole 100៛ notes, so a KHR payment must be divisible
  // by 100 (mirrors the backend so the request never round-trips to a 400).
  .superRefine((data, ctx) => {
    if (
      data.paymentCurrency === 'KHR' &&
      (!Number.isInteger(data.receivedAmount) || data.receivedAmount % 100 !== 0)
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['receivedAmount'],
        message: 'KHR amount must be a whole number of 100៛ notes',
      })
    }

    // A manual KHQR payment must record which bank the customer used.
    if (data.paymentMethod === 'khqr' && !data.bankName) {
      ctx.addIssue({
        code: 'custom',
        path: ['bankName'],
        message: 'Bank name is required for KHQR payments',
      })
    }
  })

// Status transitions the board/history may push directly. Cancelling is NOT here:
// it must reverse the money, so it goes through the void endpoint (see api/order.ts).
// The backend's status endpoint rejects `canceled` too — keep these in lockstep.
export const fulfillmentStatusSchema = z.enum(['preparing', 'ready', 'completed'])

export const getOrdersParamsSchema = z.object({
  status: z.string().optional(),
  paymentStatus: z.string().optional(),
  paymentMethod: z.string().optional(),
  // "Free items only" reconciliation filter; serialized to ?hasComp=true.
  hasComp: z.boolean().optional(),
  date: z.string().optional(),
  search: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  // "My sales" filter; the backend forces a Cashier onto their own id.
  userId: z.number().int().positive().optional(),
  page: z.number().int().positive().optional(),
  limit: z.number().int().positive().optional(),
})

export const todayOrdersFiltersSchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD')
    .optional(),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'endDate must be YYYY-MM-DD')
    .optional(),
  paymentMethod: z.enum(['cash', 'khqr']).optional(),
  page: z.number().int().min(1).optional(),
  limit: z.number().int().min(1).optional(),
})
