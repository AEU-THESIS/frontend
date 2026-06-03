export interface ShopSettings {
  id: number
  name: string
  slug: string
  ownerName: string | null
  phone: string | null
  address: string | null
  bakongAccountId: string | null
  currencySymbol: string
  // Prisma Decimal values can arrive from the API as strings; callers normalize at the boundary.
  exchangeRate: string | number
  receiptFooter: string | null
  isOrderManagementEnabled?: boolean
  createdAt: string
  updatedAt: string
}

export interface UpdateShopSettingsPayload {
  name: string
  owner_name: string | null
  phone: string | null
  address: string | null
  bakong_account_id: string | null
  currency_symbol: string
  exchange_rate: number
  receipt_footer: string | null
  is_order_management_enabled?: boolean
}
