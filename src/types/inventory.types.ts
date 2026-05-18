export type InventoryStatus = 'in_stock' | 'low_stock' | 'out_of_stock'
export type AdjustmentType = 'add' | 'remove'

export interface InventoryItem {
  id: number
  shopId: number
  name: string
  sku: string | null
  unitOfMeasure: string
  quantity: number
  minAlertThreshold: number
  imageUrl: string | null
  status: InventoryStatus
  createdAt: string
  updatedAt: string
}

export interface InventoryItemPayload {
  name: string
  sku?: string | null
  unit_of_measure: string
  quantity: number
  min_alert_threshold: number
  image?: File | null
}

export interface InventoryAdjustmentPayload {
  adjustment_type: AdjustmentType
  change_amount: number
  notes?: string | null
}
