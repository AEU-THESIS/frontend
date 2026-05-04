import http from './api'

export interface ShopSettings {
  id: number
  name: string
  slug: string
  ownerName: string | null
  phone: string | null
  address: string | null
  bakongAccountId: string | null
  currencySymbol: string
  exchangeRate: string | number
  receiptFooter: string | null
  createdAt: string
  updatedAt: string
}

export interface UpdateShopSettingsPayload {
  name?: string
  owner_name?: string | null
  phone?: string | null
  address?: string | null
  bakong_account_id?: string | null
  currency_symbol?: string
  exchange_rate?: number
  receipt_footer?: string | null
}

export const getShopSettings = async (): Promise<ShopSettings> => {
  const res = await http.get<ShopSettings>('/api/shops/settings')
  return res.data
}

export const updateShopSettings = async (
  payload: UpdateShopSettingsPayload
): Promise<ShopSettings> => {
  const res = await http.put<ShopSettings>('/api/shops/settings', payload)
  return res.data
}
