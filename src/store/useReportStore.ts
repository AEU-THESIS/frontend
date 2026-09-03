import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import {
  exportSalesSummary as fetchSalesSummaryWorkbook,
  getReportToday,
  salesSummaryFileName,
} from '@/api/report'
import type { DailySummary, OrderRow } from '@/types/order.types'
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

  /** 1-based page of the orders list. The server owns the slicing. */
  const ordersPage = ref(1)
  const ordersPageSize = ref(5)

  // A reversed window would return nothing at all, so clamp the end up to the
  // start rather than letting the request 400.
  const effectiveEndDate = computed(() =>
    selectedEndDate.value && selectedEndDate.value >= selectedDate.value
      ? selectedEndDate.value
      : selectedDate.value
  )

  // The server filter only knows cash/khqr, so a bank-specific selection asks for
  // all khqr orders and the bank is narrowed client-side (see the view).
  const backendMethod = computed<'cash' | 'khqr' | undefined>(() =>
    selectedPaymentMethod.value === 'all'
      ? undefined
      : selectedPaymentMethod.value === 'cash'
        ? 'cash'
        : 'khqr'
  )

  const ordersQuery = () => ({
    date: selectedDate.value,
    endDate: effectiveEndDate.value,
    paymentMethod: backendMethod.value,
    page: ordersPage.value,
    limit: ordersPageSize.value,
  })

  /**
   * Loads one page of the orders list. The summary cards cover the whole window
   * regardless of page, so paging does not refetch them.
   */
  const fetchOrdersPage = async (page: number) => {
    ordersPage.value = page
    isLoading.value = true
    // A page that loads clears a previous page's failure, so the view stops
    // showing an error over rows that arrived fine.
    error.value = null
    try {
      const result = await getTodayOrders(ordersQuery())
      orders.value = result.orders
      pagination.value = result.pagination
    } catch (err) {
      console.error('[useReportStore] getTodayOrders failed:', err)
      error.value = 'reports.errors.fetchDailyOverviewFailed'
    } finally {
      isLoading.value = false
    }
  }

  const fetchDailyOverview = async () => {
    isLoading.value = true
    error.value = null
    // A new window or filter always starts at the first page.
    ordersPage.value = 1

    // Independent settlement: a summary failure shouldn't wipe out orders that DID load, and vice versa
    const results = await Promise.allSettled([
      getReportToday(selectedDate.value, effectiveEndDate.value),
      getTodayOrders(ordersQuery()),
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

  return {
    summary,
    orders,
    pagination,
    ordersPage,
    ordersPageSize,
    isLoading,
    isExporting,
    error,
    selectedDate,
    selectedEndDate,
    effectiveEndDate,
    selectedPaymentMethod,
    fetchDailyOverview,
    fetchOrdersPage,
    exportSalesSummary,
  }
})
