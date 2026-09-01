import http from './api'
import type { DailySummary } from '@/types/order.types'
import type {
  KpiRange,
  DateRange,
  KpiSummary,
  SalesTrendGranularity,
  SalesTrend,
  ItemReportPeriod,
  SellingItemsResponse,
  InventoryInsights,
  ReportPeriod,
  SalesOverview,
  ItemPerformance,
  CategoryPerformanceRow,
} from '@/types/report.types'
import { z } from 'zod'
import {
  salesSummaryExportRangeSchema,
  reportPeriodSchema,
  type SalesSummaryExportRange,
} from '@/validations/reportValidation'

/**
 * GET /api/reports/daily-summary?date=YYYY-MM-DD[&endDate=YYYY-MM-DD]
 * Aggregate cards for a calendar date, or for the inclusive window
 * [date, endDate]. Defaults to today when both are omitted; `endDate` is only
 * sent alongside `date`, which is what the endpoint accepts.
 */
const reportDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD')
  .optional()

export const getReportToday = async (date?: string, endDate?: string): Promise<DailySummary> => {
  const parsedDate = reportDateSchema.parse(date)
  const parsedEndDate = reportDateSchema.parse(endDate)

  const res = await http.get<DailySummary>('api/reports/daily-summary', {
    params: parsedDate
      ? { date: parsedDate, ...(parsedEndDate ? { endDate: parsedEndDate } : {}) }
      : {},
  })
  return res.data
}
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

/**
 * GET /api/reports/exports/sales-summary?startDate=&endDate=
 * Downloads the "Menu Performance" sales-summary workbook for an inclusive range
 * of shop-local days. The server builds the .xlsx, so the response is binary.
 *
 * Resolves to `null` when the window has no sales: the endpoint answers 204, and
 * an empty body surfaces as a 0-byte blob (browser) or an empty string (Node).
 */
export const exportSalesSummary = async (range: SalesSummaryExportRange): Promise<Blob | null> => {
  const parsedRange = salesSummaryExportRangeSchema.parse(range)

  const workbook = await http.get<Blob, Blob | string | null>(
    '/api/reports/exports/sales-summary',
    {
      params: parsedRange,
      responseType: 'blob',
      // The workbook is generated on demand, so a wide window can outrun the
      // instance's 10s default.
      timeout: 60_000,
    }
  )

  if (!workbook || typeof workbook === 'string' || workbook.size === 0) return null
  return workbook
}

/** Mirrors the filename the endpoint sets in Content-Disposition. */
export const salesSummaryFileName = (range: SalesSummaryExportRange) =>
  `SalesSummary_${range.startDate}_to_${range.endDate}.xlsx`

/**
 * GET /api/reports/sales-overview?period=
 * Period totals (orders, revenue, average ticket) with the USD/KHR split, for
 * one of the fixed windows the endpoint understands.
 */
export const getSalesOverview = async (period: ReportPeriod): Promise<SalesOverview> => {
  const res = await http.get<SalesOverview>('/api/reports/sales-overview', {
    params: { period: reportPeriodSchema.parse(period) },
  })
  return res.data
}

/**
 * GET /api/reports/item-performance?period=
 * Top and bottom five products by units sold, returned together — unlike
 * `getSellingItems`, which fetches one list at a time.
 */
export const getItemPerformance = async (period: ReportPeriod): Promise<ItemPerformance> => {
  const res = await http.get<ItemPerformance>('/api/reports/item-performance', {
    params: { period: reportPeriodSchema.parse(period) },
  })
  return res.data
}

/**
 * GET /api/reports/category-performance?period=
 * Units and revenue rolled up per category. Products with no category land in
 * an "Uncategorized" row built by the server.
 */
export const getCategoryPerformance = async (
  period: ReportPeriod
): Promise<CategoryPerformanceRow[]> => {
  const res = await http.get<CategoryPerformanceRow[]>('/api/reports/category-performance', {
    params: { period: reportPeriodSchema.parse(period) },
  })
  return res.data
}
