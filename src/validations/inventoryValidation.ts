import { z } from 'zod'

export const inventoryItemSchema = z.object({
  name: z.string().trim().min(1, 'Item name is required'),
  sku: z.string().trim().optional().nullable(),
  unit_of_measure: z.string().trim().min(1, 'Unit of measure is required'),
  quantity: z.number().finite().min(0, 'Stock cannot be negative'),
  min_alert_threshold: z.number().finite().min(0, 'Low stock threshold cannot be negative'),
  image: z.instanceof(File).optional().nullable(),
})

export const inventoryAdjustmentSchema = z.object({
  adjustment_type: z.enum(['add', 'remove']),
  change_amount: z.number().finite().positive('Adjustment amount must be greater than 0'),
  notes: z.string().trim().optional().nullable(),
})
