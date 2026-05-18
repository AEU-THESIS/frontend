import http from './api'
import type { ShopSettings, UpdateShopSettingsPayload } from '@/types/shop'
import { shopSettingsSchema } from '@/validations/shopSettings'

export const getShopSettings = async (): Promise<ShopSettings> => {
  const res = await http.get<ShopSettings>('/api/shops/settings')
  return res.data
}

export const updateShopSettings = async (
  payload: UpdateShopSettingsPayload
): Promise<ShopSettings> => {
  const parsedPayload = shopSettingsSchema.parse(payload)
  const res = await http.put<ShopSettings>('/api/shops/settings', parsedPayload)
  return res.data
}
