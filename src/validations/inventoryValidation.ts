import { z } from 'zod'

export const inventoryItemSchema = z.object({
  name: z.string().trim().min(1, 'Item name is required'),
  unit_of_measure: z.string().trim().min(1, 'Unit of measure is required'),
  quantity: z.number().finite().min(0, 'Stock cannot be negative'),
  min_alert_threshold: z.number().finite().min(0, 'Low stock threshold cannot be negative'),
  unit_cost: z.number().finite().min(0, 'Cost price cannot be negative'),
  image: z.instanceof(File).optional().nullable(),
})

export const inventoryAdjustmentSchema = z.object({
  adjustment_type: z.enum(['add', 'remove']),
  change_amount: z.number().finite().positive('Adjustment amount must be greater than 0'),
  unit_cost: z.number().finite().min(0, 'Cost price cannot be negative').optional().nullable(),
  notes: z.string().trim().optional().nullable(),
})

// Mirrors the backend's inventoryHistoryQuerySchema: the view feeds user-picked
// dates and pagination straight through, so catch a bad range here rather than
// letting the server reject it (or silently return an empty page).
const isoDateTime = z
  .string()
  .trim()
  .refine(value => !Number.isNaN(Date.parse(value)), 'Must be an ISO 8601 date-time')

export const inventoryHistoryQuerySchema = z
  .object({
    from: isoDateTime.optional(),
    to: isoDateTime.optional(),
    page: z.number().int().positive().optional(),
    limit: z.number().int().positive().max(100).optional(),
  })
  .refine(data => !(data.from && data.to) || Date.parse(data.from) <= Date.parse(data.to), {
    message: 'from must be earlier than or equal to to',
    path: ['from'],
  })
