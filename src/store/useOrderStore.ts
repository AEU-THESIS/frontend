import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getOrders, getOrderDetails, updateOrderStatus } from '@/api/order'
import { useAuthStore } from './useAuthStore'
import type { OrderDetail } from '@/types/order.types'

export const useOrderStore = defineStore('orders', () => {
  const orders = ref<OrderDetail[]>([])
  const historyOrders = ref<OrderDetail[]>([])
  const historyPagination = ref({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 1,
  })

  const loading = ref(false)
  const selectedOrder = ref<OrderDetail | null>(null)

  // Real-time EventSource reference
  const sseSource = ref<EventSource | null>(null)
  const isConnected = ref(false)

  // Play synthesized notification chime for new incoming orders (resolves mp3 file requirements)
  const playNewOrderAlert = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
      if (!AudioContextClass) return

      const ctx = new AudioContextClass()

      const playTone = (freq: number, start: number, duration: number) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()

        osc.type = 'sine'
        osc.frequency.value = freq

        gain.gain.setValueAtTime(0, start)
        gain.gain.linearRampToValueAtTime(0.15, start + 0.05)
        gain.gain.exponentialRampToValueAtTime(0.0001, start + duration)

        osc.connect(gain)
        gain.connect(ctx.destination)

        osc.start(start)
        osc.stop(start + duration)
      }

      // Beautiful double-chime ding-dong (C5 then E5)
      playTone(523.25, ctx.currentTime, 0.3)
      playTone(659.25, ctx.currentTime + 0.12, 0.4)
    } catch (e) {
      console.warn('⚠️ Web Audio alert blocked or failed', e)
    }
  }

  // ── 1. Fetch Today's Orders (Live operational dashboard data) ──────
  const fetchTodayOrders = async () => {
    loading.value = true
    try {
      const result = await getOrders({ date: 'today', limit: 200 })
      orders.value = result.orders
    } catch (error) {
      console.error('Failed to fetch today orders:', error)
    } finally {
      loading.value = false
    }
  }

  // ── 2. Fetch Historical Orders (Order history log data) ───────────
  const fetchHistoryOrders = async (filters: {
    search?: string
    status?: string
    paymentStatus?: string
    startDate?: string
    endDate?: string
    page?: number
    limit?: number
  }) => {
    loading.value = true
    try {
      const result = await getOrders({
        search: filters.search || undefined,
        status: filters.status || undefined,
        paymentStatus: filters.paymentStatus || undefined,
        startDate: filters.startDate || undefined,
        endDate: filters.endDate || undefined,
        page: filters.page || 1,
        limit: filters.limit || 10,
      })
      historyOrders.value = result.orders
      historyPagination.value = result.pagination
    } catch (error) {
      console.error('Failed to fetch historical orders:', error)
    } finally {
      loading.value = false
    }
  }

  // ── 3. Fetch Single Order Details (Drill-down view) ────────────────
  const fetchSingleOrderDetail = async (id: number) => {
    try {
      const detail = await getOrderDetails(id)
      selectedOrder.value = detail

      // Update in local lists if present
      const liveIdx = orders.value.findIndex(o => o.id === id)
      if (liveIdx !== -1) orders.value[liveIdx] = detail

      const histIdx = historyOrders.value.findIndex(o => o.id === id)
      if (histIdx !== -1) historyOrders.value[histIdx] = detail
    } catch (error) {
      console.error(`Failed to fetch order details for #${id}:`, error)
    }
  }

  // ── 4. Trigger Quick Status Updates ───────────────────────────────
  const changeStatus = async (id: number, status: string) => {
    try {
      // Optimistic Update for zero-latency lag UI
      const liveIdx = orders.value.findIndex(o => o.id === id)
      if (liveIdx !== -1) {
        orders.value[liveIdx].fulfillmentStatus = status
      }
      const histIdx = historyOrders.value.findIndex(o => o.id === id)
      if (histIdx !== -1) {
        historyOrders.value[histIdx].fulfillmentStatus = status
      }
      if (selectedOrder.value && selectedOrder.value.id === id) {
        selectedOrder.value.fulfillmentStatus = status
      }

      await updateOrderStatus(id, status)
    } catch (error) {
      console.error('Failed to update status on server, reverting state:', error)
      // Force reload to sync state on failure
      fetchTodayOrders()
    }
  }

  // ── 5. Server-Sent Events SSE Subscriber ─────────────────────────
  const subscribeToOrderStream = () => {
    if (sseSource.value) {
      return // Already subscribed
    }

    const authStore = useAuthStore()
    const token = authStore.getAccessToken()

    if (!token) {
      console.warn('❌ SSE: Token missing. Unable to stream orders.')
      return
    }

    const sseUrl = `${import.meta.env.VITE_API_URL}/api/orders/stream?token=${token}`
    const source = new EventSource(sseUrl)
    sseSource.value = source

    source.onopen = () => {
      isConnected.value = true
      console.log('📡 SSE: Stream connection established.')
    }

    source.onerror = e => {
      isConnected.value = false
      console.error('❌ SSE: Connection encountered an error. Attempting auto-retry...', e)
    }

    // New order placed
    source.addEventListener('order_created', (event: any) => {
      try {
        const newOrder = JSON.parse(event.data) as OrderDetail

        // Prevent duplicate append
        const exists = orders.value.some(o => o.id === newOrder.id)
        if (!exists) {
          orders.value.unshift(newOrder)
          playNewOrderAlert()
          console.log(`🛎️ SSE: New Order Incoming! #${newOrder.orderNumber}`)
        }
      } catch (err) {
        console.error('Error parsing SSE order_created event:', err)
      }
    })

    // Order status modified on another terminal/POS
    source.addEventListener('order_updated', (event: any) => {
      try {
        const updatedOrder = JSON.parse(event.data) as OrderDetail

        // Update operational list
        const idx = orders.value.findIndex(o => o.id === updatedOrder.id)
        if (idx !== -1) {
          orders.value[idx] = updatedOrder
        } else {
          // If status updated and belongs to today, add it (just in case)
          orders.value.unshift(updatedOrder)
        }

        // Update selected detail modal if open
        if (selectedOrder.value && selectedOrder.value.id === updatedOrder.id) {
          selectedOrder.value = updatedOrder
        }

        console.log(
          `🔄 SSE: Order Updated! #${updatedOrder.orderNumber} -> ${updatedOrder.fulfillmentStatus}`
        )
      } catch (err) {
        console.error('Error parsing SSE order_updated event:', err)
      }
    })
  }

  // ── 6. SSE Stream Cleanup ─────────────────────────────────────────
  const unsubscribeFromOrderStream = () => {
    if (sseSource.value) {
      sseSource.value.close()
      sseSource.value = null
      isConnected.value = false
      console.log('🔌 SSE: Stream connection closed gracefully.')
    }
  }

  return {
    orders,
    historyOrders,
    historyPagination,
    loading,
    selectedOrder,
    isConnected,
    fetchTodayOrders,
    fetchHistoryOrders,
    fetchSingleOrderDetail,
    changeStatus,
    subscribeToOrderStream,
    unsubscribeFromOrderStream,
  }
})
