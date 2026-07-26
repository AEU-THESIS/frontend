import http from './api'
import type {
  KpiRange,
  DateRange,
  KpiSummary,
  SalesTrendGranularity,
  SalesTrend,
  ItemReportPeriod,
  SellingItemsResponse,
  InventoryInsights,
} from '@/types/report.types'

/**
 * Fetches headline KPIs (net sales, total orders, active staff) for a range.
 * Pass `dateRange` when `range` is 'custom' (or to pin an explicit window).
 */
export const getKpiSummary = async (
  range: KpiRange,
  dateRange?: DateRange
): Promise<KpiSummary> => {
  const res = await http.get<KpiSummary>('/api/reports/kpi-summary', {
    params: { range, ...dateRange },
  })
  return res.data
}

/**
 * Fetches the net-sales time series for the overview chart. Without `dateRange`
 * it buckets by the fixed granularity; with one, the backend adaptively buckets
 * the window (hourly → daily → weekly → monthly → yearly).
 */
export const getSalesTrend = async (
  granularity: SalesTrendGranularity,
  dateRange?: DateRange
): Promise<SalesTrend> => {
  const res = await http.get<SalesTrend>('/api/reports/sales-trend', {
    params: { granularity, ...dateRange },
  })
  return res.data
}

/**
 * Fetches only the requested list — top 5 best-selling (`type: 'top'`) or
 * bottom 5 lowest-selling (`type: 'bottom'`) items for a period.
 * `month` ("YYYY-MM") is required only when `period` is 'specific'.
 */
export const getSellingItems = async (params: {
  type: 'top' | 'bottom'
  period: ItemReportPeriod
  month?: string
  /** Explicit window (from the global filter); overrides `period`/`month`. */
  startDate?: string
  endDate?: string
}): Promise<SellingItemsResponse> => {
  const res = await http.get<SellingItemsResponse>('/api/reports/selling-items', { params })
  return res.data
}

/**
 * Fetches real-time stock alerts for the shop — ingredients that are out of
 * stock (`currentStock <= 0`) or running low (at/below their threshold).
 */
export const getInventoryInsights = async (): Promise<InventoryInsights> => {
  const res = await http.get<InventoryInsights>('/api/reports/inventory-insights')
  return res.data
}
