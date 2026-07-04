import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { getReportToday } from '@/api/report'
import type { DailySummary, OrderRow } from '@/types/order.types'
import { getTodayOrders } from '@/api/order'

export type PaymentMethodFilter = 'all' | 'cash' | 'khqr'

export const useReportStore = defineStore('report', () => {
  const summary = ref<DailySummary>({
    total_revenue: 0,
    cash_total: 0,
    khqr_total: 0,
    exchange_rate: 4100,
  })
  const orders = ref<OrderRow[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // The two filter fields the view controls.
  const selectedDate = ref<string>(new Date().toISOString().slice(0, 10))
  const selectedPaymentMethod = ref<PaymentMethodFilter>('all')

  // Chronological (oldest → newest), matching a physical drawer ledger.
  const chronologicalOrders = computed(() =>
    [...orders.value].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    )
  )

  const fetchDailyOverview = async () => {
    isLoading.value = true
    error.value = null
    try {
      const [summaryRes, ordersRes] = await Promise.all([
        getReportToday(selectedDate.value),
        getTodayOrders({
          date: selectedDate.value,
          paymentMethod:
            selectedPaymentMethod.value === 'all' ? undefined : selectedPaymentMethod.value,
        }),
      ])

      // Normalize in case the API ever sends null/strings for these — protects
      // the arithmetic in the view's KHR conversion from silently breaking.
      summary.value = {
        total_revenue: Number(summaryRes.total_revenue) || 0,
        cash_total: Number(summaryRes.cash_total) || 0,
        khqr_total: Number(summaryRes.khqr_total) || 0,
        exchange_rate: Number(summaryRes.exchange_rate) || 4100,
      }
      orders.value = ordersRes
    } catch (err) {
      error.value = "Failed to load today's sales report."
      console.error('[useReportStore] fetchDailyOverview failed:', err)
    } finally {
      isLoading.value = false
    }
  }

  return {
    summary,
    orders,
    chronologicalOrders,
    isLoading,
    error,
    selectedDate,
    selectedPaymentMethod,
    fetchDailyOverview,
  }
})
