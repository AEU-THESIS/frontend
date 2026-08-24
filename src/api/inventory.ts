import http from './api'
import type {
  InventoryAdjustmentPayload,
  InventoryHistoryQuery,
  InventoryHistoryResponse,
  InventoryItem,
  InventoryItemPayload,
  InventoryValuation,
} from '@/types/inventory.types'
import {
  inventoryAdjustmentSchema,
  inventoryHistoryQuerySchema,
  inventoryItemSchema,
} from '@/validations/inventoryValidation'

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
  formData.append('unit_of_measure', parsed.unit_of_measure)
  if (parsed.category_id) formData.append('category_id', String(parsed.category_id))
  formData.append('quantity', String(parsed.quantity))
  formData.append('min_alert_threshold', String(parsed.min_alert_threshold))
  formData.append('unit_cost', String(parsed.unit_cost))
  if (parsed.image) formData.append('image', parsed.image)

  return formData
}

const multipartConfig = {
  headers: {
    'Content-Type': 'multipart/form-data',
  },
}

export const getInventoryItems = async (
  filters: InventoryItemFilters = {}
): Promise<InventoryItem[]> => {
  const res = await http.get<InventoryItem[]>(INVENTORY_ENDPOINT, { params: filters })
  return res.data
}

export const getInventoryValuation = async (): Promise<InventoryValuation> => {
  const res = await http.get<InventoryValuation>(`${INVENTORY_ENDPOINT}/valuations`)
  return res.data
}

export const getInventoryHistory = async (
  id: number,
  params: InventoryHistoryQuery = {}
): Promise<InventoryHistoryResponse> => {
  const parsedParams = inventoryHistoryQuerySchema.parse(params)
  const res = await http.get<InventoryHistoryResponse>(`${INVENTORY_ENDPOINT}/${id}/history`, {
    params: parsedParams,
  })
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
