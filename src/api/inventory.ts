import http from './api'
import type {
  InventoryAdjustmentPayload,
  InventoryItem,
  InventoryItemPayload,
} from '@/types/inventory.types'
import { inventoryAdjustmentSchema, inventoryItemSchema } from '@/validations/inventoryValidation'

const INVENTORY_ENDPOINT = '/api/inventories'

export interface InventoryItemFilters {
  search?: string
  status?: InventoryItem['status']
  unit?: string
}

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
  headers: {},
}

export const getInventoryItems = async (
  filters: InventoryItemFilters = {}
): Promise<InventoryItem[]> => {
  const res = await http.get<InventoryItem[]>(INVENTORY_ENDPOINT, { params: filters })
  return res.data
}

export const createInventoryItem = async (
  payload: InventoryItemPayload
): Promise<InventoryItem> => {
  const res = await http.post<InventoryItem>(
    INVENTORY_ENDPOINT,
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
    `${INVENTORY_ENDPOINT}/${id}`,
    toInventoryFormData(payload),
    multipartConfig
  )
  return res.data
}

export const deleteInventoryItem = async (id: number): Promise<void> => {
  await http.delete(`${INVENTORY_ENDPOINT}/${id}`)
}

export const adjustInventoryItem = async (
  id: number,
  payload: InventoryAdjustmentPayload
): Promise<InventoryItem> => {
  const parsedPayload = inventoryAdjustmentSchema.parse(payload)
  const res = await http.post<InventoryItem>(
    `${INVENTORY_ENDPOINT}/${id}/adjustments`,
    parsedPayload
  )
  return res.data
}
