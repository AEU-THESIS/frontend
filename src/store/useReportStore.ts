import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import {
  exportSalesSummary as fetchSalesSummaryWorkbook,
  getCategoryPerformance,
  getItemPerformance,
  getReportToday,
  getSalesOverview,
  getSalesTrend,
  salesSummaryFileName,
} from '@/api/report'
import type { DailySummary, OrderRow } from '@/types/order.types'
import type {
  CategoryPerformanceRow,
  ItemPerformance,
  ReportPeriod,
  SalesOverview,
  SalesTrendGranularity,
  SalesTrendPoint,
} from '@/types/report.types'
import { getTodayOrders } from '@/api/order'
import { downloadBlob } from '@/utils/download'

const localIsoDate = (d: Date) => new Intl.DateTimeFormat('en-CA').format(d)

/** 'exported' once the file downloads; 'empty' when the window sold nothing. */
export type SalesSummaryExportOutcome = 'exported' | 'empty'

export const useReportStore = defineStore('report', () => {
  const summary = ref<DailySummary>({
    total_revenue: 0,
    cash_total: 0,
    khqr_total: 0,
    exchange_rate: 4100,
  })
  const orders = ref<OrderRow[]>([])
  const pagination = ref<{ total: number; page: number; limit: number; totalPages: number } | null>(
    null
  )
  const isLoading = ref(false)
  const isExporting = ref(false)
  const error = ref<string | null>(null) // now holds an i18n KEY, not raw text

  const selectedDate = ref<string>(localIsoDate(new Date()))
  /** Inclusive end of the filter window; equal to `selectedDate` for a single day. */
  const selectedEndDate = ref<string>(localIsoDate(new Date()))
  // 'all' | 'cash' | 'khqr' | 'khqr:<bank>' — a bank-specific value narrows to one
  // bank on the client while the request still asks the server for 'khqr' orders.
  const selectedPaymentMethod = ref<string>('all')

  // A reversed window would return nothing at all, so clamp the end up to the
  // start rather than letting the request 400.
  const effectiveEndDate = computed(() =>
    selectedEndDate.value && selectedEndDate.value >= selectedDate.value
      ? selectedEndDate.value
      : selectedDate.value
  )

  const chronologicalOrders = computed(() =>
    [...orders.value].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    )
  )

  // True when the API's 200-row cap silently dropped records for this day
  const isTruncated = computed(() =>
    pagination.value ? pagination.value.total > pagination.value.limit : false
  )

  const fetchDailyOverview = async () => {
    isLoading.value = true
    error.value = null

    // The server filter only knows cash/khqr, so a bank-specific selection asks for
    // all khqr orders and the bank is narrowed client-side (see the view).
    const backendMethod: 'cash' | 'khqr' | undefined =
      selectedPaymentMethod.value === 'all'
        ? undefined
        : selectedPaymentMethod.value === 'cash'
          ? 'cash'
          : 'khqr'

    // Independent settlement: a summary failure shouldn't wipe out orders that DID load, and vice versa
    const results = await Promise.allSettled([
      getReportToday(selectedDate.value, effectiveEndDate.value),
      getTodayOrders({
        date: selectedDate.value,
        endDate: effectiveEndDate.value,
        paymentMethod: backendMethod,
      }),
    ])

    const [summaryResult, ordersResult] = results

    if (summaryResult.status === 'fulfilled') {
      const summaryRes = summaryResult.value
      summary.value = {
        total_revenue: Number(summaryRes.total_revenue) || 0,
        cash_total: Number(summaryRes.cash_total) || 0,
        khqr_total: Number(summaryRes.khqr_total) || 0,
        exchange_rate: Number(summaryRes.exchange_rate) || 4100,
      }
    } else {
      console.error('[useReportStore] getReportToday failed:', summaryResult.reason)
    }

    if (ordersResult.status === 'fulfilled') {
      orders.value = ordersResult.value.orders
      pagination.value = ordersResult.value.pagination
    } else {
      console.error('[useReportStore] getTodayOrders failed:', ordersResult.reason)
    }

    if (summaryResult.status === 'rejected' && ordersResult.status === 'rejected') {
      error.value = 'reports.errors.fetchDailyOverviewFailed' // i18n key, view translates with t()
    }

    isLoading.value = false
  }

  /**
   * Downloads the "Menu Performance" workbook for a date range. The server owns
   * the aggregation and the file itself (GET /api/reports/exports/sales-summary),
   * so this only saves what comes back.
   *
   * Resolves to 'empty' when the window has no sales — the endpoint answers 204,
   * which arrives as an empty body. API/validation failures reject for the caller
   * to surface.
   */
  const exportSalesSummary = async (
    startDate: string,
    endDate: string
  ): Promise<SalesSummaryExportOutcome> => {
    const range = { startDate, endDate }

    isExporting.value = true
    try {
      const workbook = await fetchSalesSummaryWorkbook(range)
      if (!workbook) return 'empty'

      downloadBlob(workbook, salesSummaryFileName(range))
      return 'exported'
    } finally {
      isExporting.value = false
    }
  }

  // --- Sales Report page (sales-overview + sales-trend + hourly breakdown) ---

  /** Preset window driving the overview cards and the trend chart. */
  const salesPeriod = ref<ReportPeriod>('daily')
  const salesTrendGranularity = ref<SalesTrendGranularity>('weekly')
  /** Day whose hour-by-hour breakdown the page charts; defaults to today. */
  const hourlyDate = ref<string>(localIsoDate(new Date()))

  const salesOverview = ref<SalesOverview | null>(null)
  const salesTrendPoints = ref<SalesTrendPoint[]>([])
  const hourlyPoints = ref<SalesTrendPoint[]>([])
  const isSalesReportLoading = ref(false)
  const salesReportError = ref<string | null>(null) // i18n KEY, not raw text

  /**
   * The instants bounding one local calendar day. A window this short makes the
   * trend endpoint bucket by hour, which is what the breakdown chart wants.
   */
  const dayWindow = (isoDay: string) => {
    const [year, month, day] = isoDay.split('-').map(Number)
    const start = new Date(year, (month || 1) - 1, day || 1, 0, 0, 0, 0)
    const end = new Date(year, (month || 1) - 1, day || 1, 23, 59, 59, 999)
    return { startDate: start.toISOString(), endDate: end.toISOString() }
  }

  /**
   * Each widget loads on its own so changing one control refetches only what it
   * affects — the period drives the cards, the granularity the trend chart, the
   * date the hourly chart.
   */
  const fetchSalesOverview = async () => {
    salesOverview.value = await getSalesOverview(salesPeriod.value)
  }

  const fetchSalesTrend = async () => {
    const trend = await getSalesTrend(salesTrendGranularity.value)
    salesTrendPoints.value = trend.points
  }

  const fetchHourlyBreakdown = async () => {
    const trend = await getSalesTrend(salesTrendGranularity.value, dayWindow(hourlyDate.value))
    hourlyPoints.value = trend.points
  }

  /**
   * Initial page load. Settled independently so one failing request leaves the
   * other two widgets rendered instead of blanking the page; the error surfaces
   * only when nothing at all came back.
   */
  const fetchSalesReport = async () => {
    isSalesReportLoading.value = true
    salesReportError.value = null

    const results = await Promise.allSettled([
      fetchSalesOverview(),
      fetchSalesTrend(),
      fetchHourlyBreakdown(),
    ])

    results
      .filter((result): result is PromiseRejectedResult => result.status === 'rejected')
      .forEach(result =>
        console.error('[useReportStore] sales report widget failed:', result.reason)
      )

    if (results.every(result => result.status === 'rejected')) {
      salesReportError.value = 'reports.errors.fetchSalesReportFailed'
    }

    isSalesReportLoading.value = false
  }

  // --- Product Performance page (item-performance + category-performance) ---

  const productPeriod = ref<ReportPeriod>('daily')
  const itemPerformance = ref<ItemPerformance>({ topSellers: [], bottomSellers: [] })
  const categoryPerformance = ref<CategoryPerformanceRow[]>([])
  const isProductReportLoading = ref(false)
  const productReportError = ref<string | null>(null) // i18n KEY, not raw text

  /** Categories ranked by revenue, so the table leads with the biggest earner. */
  const categoriesByRevenue = computed(() =>
    [...categoryPerformance.value].sort((a, b) => b.revenue - a.revenue)
  )

  const fetchProductPerformance = async () => {
    isProductReportLoading.value = true
    productReportError.value = null

    const results = await Promise.allSettled([
      getItemPerformance(productPeriod.value),
      getCategoryPerformance(productPeriod.value),
    ])

    const [itemsResult, categoriesResult] = results

    if (itemsResult.status === 'fulfilled') {
      itemPerformance.value = itemsResult.value
    } else {
      console.error('[useReportStore] getItemPerformance failed:', itemsResult.reason)
    }

    if (categoriesResult.status === 'fulfilled') {
      categoryPerformance.value = categoriesResult.value
    } else {
      console.error('[useReportStore] getCategoryPerformance failed:', categoriesResult.reason)
    }

    if (results.every(result => result.status === 'rejected')) {
      productReportError.value = 'reports.errors.fetchProductPerformanceFailed'
    }

    isProductReportLoading.value = false
  }

  return {
    summary,
    orders,
    pagination,
    isTruncated,
    chronologicalOrders,
    isLoading,
    isExporting,
    error,
    selectedDate,
    selectedEndDate,
    effectiveEndDate,
    selectedPaymentMethod,
    fetchDailyOverview,
    exportSalesSummary,
    salesPeriod,
    salesTrendGranularity,
    hourlyDate,
    salesOverview,
    salesTrendPoints,
    hourlyPoints,
    isSalesReportLoading,
    salesReportError,
    fetchSalesReport,
    fetchSalesOverview,
    fetchSalesTrend,
    fetchHourlyBreakdown,
    productPeriod,
    itemPerformance,
    categoryPerformance,
    categoriesByRevenue,
    isProductReportLoading,
    productReportError,
    fetchProductPerformance,
  }
})
