import { z } from 'zod'

export const shopSettingsSchema = z.object({
  name: z.string().trim().min(1, 'Shop name is required'),
  owner_name: z.string().trim().nullable(),
  phone: z.string().trim().nullable(),
  address: z.string().trim().nullable(),
  bakong_account_id: z.string().trim().nullable(),
  currency_symbol: z.string().trim().min(1, 'Currency symbol is required'),
  exchange_rate: z
    .number()
    .finite('Exchange rate must be a valid number')
    .positive('Exchange rate must be greater than 0'),
  receipt_footer: z.string().trim().nullable(),
  is_order_management_enabled: z.boolean().optional(),
  is_shop_closed: z.boolean().optional(),
})
