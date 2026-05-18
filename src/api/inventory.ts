import http from './api'
import type {
  InventoryAdjustmentPayload,
  InventoryItem,
  InventoryItemPayload,
} from '@/types/inventory.types'
import { inventoryAdjustmentSchema, inventoryItemSchema } from '@/validations/inventoryValidation'

const toInventoryFormData = (payload: InventoryItemPayload) => {
  const parsed = inventoryItemSchema.parse(payload)
  const formData = new FormData()

  formData.append('name', parsed.name)
  if (parsed.sku) formData.append('sku', parsed.sku)
  formData.append('unit_of_measure', parsed.unit_of_measure)
  formData.append('quantity', String(parsed.quantity))
  formData.append('min_alert_threshold', String(parsed.min_alert_threshold))
  if (parsed.image) formData.append('image', parsed.image)

  return formData
}

const multipartConfig = {
  headers: { 'Content-Type': 'multipart/form-data' },
}

export const getInventoryItems = async (): Promise<InventoryItem[]> => {
  const res = await http.get<InventoryItem[]>('/api/inventory')
  return res.data
}

export const createInventoryItem = async (
  payload: InventoryItemPayload
): Promise<InventoryItem> => {
  const res = await http.post<InventoryItem>(
    '/api/inventory',
    toInventoryFormData(payload),
    multipartConfig
  )
  return res.data
}

export const updateInventoryItem = async (
  id: number,
  payload: InventoryItemPayload
): Promise<InventoryItem> => {
  const res = await http.put<InventoryItem>(
    `/api/inventory/${id}`,
    toInventoryFormData(payload),
    multipartConfig
  )
  return res.data
}

export const deleteInventoryItem = async (id: number): Promise<void> => {
  await http.delete(`/api/inventory/${id}`)
}

export const adjustInventoryItem = async (
  id: number,
  payload: InventoryAdjustmentPayload
): Promise<InventoryItem> => {
  const parsedPayload = inventoryAdjustmentSchema.parse(payload)
  const res = await http.post<InventoryItem>(`/api/inventory/${id}/adjust`, parsedPayload)
  return res.data
}
