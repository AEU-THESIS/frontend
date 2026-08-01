import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { getReportToday } from '@/api/report'
import type { DailySummary, OrderRow, PaymentMethodFilter } from '@/types/order.types'
import { getTodayOrders } from '@/api/order'

const localIsoDate = (d: Date) => new Intl.DateTimeFormat('en-CA').format(d)

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
  const error = ref<string | null>(null) // now holds an i18n KEY, not raw text

  const selectedDate = ref<string>(localIsoDate(new Date()))
  const selectedPaymentMethod = ref<PaymentMethodFilter>('all')

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

    // Independent settlement: a summary failure shouldn't wipe out orders that DID load, and vice versa
    const results = await Promise.allSettled([
      getReportToday(selectedDate.value),
      getTodayOrders({
        date: selectedDate.value,
        paymentMethod:
          selectedPaymentMethod.value === 'all' ? undefined : selectedPaymentMethod.value,
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

  return {
    summary,
    orders,
    pagination,
    isTruncated,
    chronologicalOrders,
    isLoading,
    error,
    selectedDate,
    selectedPaymentMethod,
    fetchDailyOverview,
  }
})
