export type KpiRange = 'today' | 'yesterday' | 'last7' | 'monthly' | 'yearly' | 'custom'

/** Inclusive [startDate, endDate] ISO window from the dashboard's global filter. */
export interface DateRange {
  startDate: string
  endDate: string
}

export interface KpiSummary {
  netSales: number
  totalOrders: number
  activeStaff: number
  netSalesTrend: number | null
  totalOrdersTrend: number | null
}

export type SalesTrendGranularity = 'weekly' | 'monthly' | 'yearly'

export interface SalesTrendPoint {
  label: string
  value: number
}

export interface SalesTrend {
  granularity: SalesTrendGranularity
  points: SalesTrendPoint[]
}

export type ItemReportPeriod = 'thisWeek' | 'thisMonth' | 'thisYear' | 'specific'

export interface SellingItem {
  productId: number
  name: string
  category: string
  quantity: number
  revenue: number
}

export interface SellingItemsResponse {
  items: SellingItem[]
}

export interface OutOfStockItem {
  id: number
  name: string
  currentStock: number
  unitOfMeasure: string
}

export interface LowStockItem extends OutOfStockItem {
  lowStockThreshold: number
}

export interface InventoryInsights {
  outOfStockCount: number
  lowStockCount: number
  outOfStock: OutOfStockItem[]
  lowStock: LowStockItem[]
}

/** Preset window shared by the overview / performance / CSV-export endpoints. */
export type ReportPeriod = 'daily' | 'weekly' | 'monthly'

/** Aggregate totals for a preset period, split by settlement currency. */
export interface SalesOverview {
  /** Every order converted to the USD base, matching KPI net sales. */
  totalSales: number
  totalOrders: number
  averageOrderValue: number
  /** Orders settled in USD. */
  salesUSD: number
  /** Orders settled in KHR, at each order's own rate snapshot. */
  salesKHR: number
  averageOrderValueUSD: number
  averageOrderValueKHR: number
}

/** One product's contribution over the period. */
export interface ProductPerformanceRow {
  name: string
  quantity: number
  revenue: number
}

/** Top and bottom five products for the period. */
export interface ItemPerformance {
  topSellers: ProductPerformanceRow[]
  bottomSellers: ProductPerformanceRow[]
}

/** One category's contribution over the period. */
export interface CategoryPerformanceRow {
  category: string
  quantity: number
  revenue: number
}
