export type InventoryStatus = 'in_stock' | 'low_stock' | 'out_of_stock'
export type AdjustmentType = 'add' | 'remove'

export interface InventoryItem {
  id: number
  shopId: number
  name: string
  unitOfMeasure: string
  quantity: number
  minAlertThreshold: number
  unitCost: number
  lastUnitCost: number
  costCurrency: string
  totalValue: number
  imageUrl: string | null
  status: InventoryStatus
  updatedAt: string
  category: { id: number; name: string } | null
}

export interface InventoryItemPayload {
  name: string
  unit_of_measure: string
  category_id?: number | null
  quantity: number
  min_alert_threshold: number
  unit_cost: number
  image?: File | null
}

export interface InventoryAdjustmentPayload {
  adjustment_type: AdjustmentType
  change_amount: number
  unit_cost?: number | null
  notes?: string | null
}

export interface InventoryValuation {
  totalItems: number
  totalValue: number
}

export interface InventoryHistoryEntry {
  id: number
  type: AdjustmentType
  quantityChanged: number
  unitCost: number | null
  value: number | null
  notes: string | null
  user: string | null
  userRole: string | null
  createdAt: string
}

export interface InventoryHistoryQuery {
  from?: string
  to?: string
  page?: number
  limit?: number
}

export interface InventoryHistoryResponse {
  items: InventoryHistoryEntry[]
  pagination: { total: number; page: number; limit: number; totalPages: number }
  totals: { totalIn: number; totalOut: number }
}
