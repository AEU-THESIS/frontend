export interface ShopSettings {
  id: number
  name: string
  slug: string
  ownerName: string | null
  phone: string | null
  address: string | null
  bakongAccountId: string | null
  // Admin-configurable list of banks for manual KHQR payments. The server always
  // returns at least one (defaults to ["ABA"]).
  paymentBanks: string[]
  currencySymbol: string
  // Prisma Decimal values can arrive from the API as strings; callers normalize at the boundary.
  exchangeRate: string | number
  receiptFooter: string | null
  isOrderManagementEnabled?: boolean
  isShopClosed?: boolean
  // Owner-authored closure notice shown to customers when the shop is closed.
  // Free text in any language; null/blank falls back to the default localized notice.
  closureMessage?: string | null
  closureDescription?: string | null
  createdAt: string
  updatedAt: string
}

export interface UpdateShopSettingsPayload {
  name: string
  owner_name: string | null
  phone: string | null
  address: string | null
  // Dormant since AT-112 removed the Bakong Account ID input; kept optional so the
  // field can be reintroduced without a breaking change.
  bakong_account_id?: string | null
  payment_banks: string[]
  currency_symbol: string
  exchange_rate: number
  receipt_footer: string | null
  is_order_management_enabled?: boolean
  is_shop_closed?: boolean
  closure_message?: string | null
  closure_description?: string | null
}
