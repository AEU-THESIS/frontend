import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  getOrders,
  getOrderDetails,
  updateOrderStatus,
  voidOrder as voidOrderApi,
  cancelOrderItem as cancelOrderItemApi,
  rejectPreOrder as rejectPreOrderApi,
} from '@/api/order'
import { useAuthStore } from './useAuthStore'
import { useNotificationStore } from './useNotificationStore'
import type { OrderDetail } from '@/types/order.types'

let audioCtx: AudioContext | null = null

const isToday = (dateString: string) => {
  const date = new Date(dateString)
  const today = new Date()
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  )
}

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

  // Real-time stream controller reference
  const sseController = ref<AbortController | null>(null)
  const isConnected = ref(false)
  let retryTimeout: ReturnType<typeof setTimeout> | null = null

  // Play synthesized notification chime for new incoming orders (resolves mp3 file requirements)
  const playNewOrderAlert = () => {
    try {
      if (!audioCtx) {
        const AudioContextClass =
          window.AudioContext ||
          (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
        if (!AudioContextClass) return
        audioCtx = new AudioContextClass()
      }

      if (audioCtx.state === 'suspended') {
        audioCtx.resume()
      }

      const ctx = audioCtx

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
    hasComp?: boolean
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
        hasComp: filters.hasComp || undefined,
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
    const liveIdx = orders.value.findIndex(o => o.id === id)
    const histIdx = historyOrders.value.findIndex(o => o.id === id)
    const isSelected = selectedOrder.value && selectedOrder.value.id === id

    // Capture previous status
    const prevLiveStatus = liveIdx !== -1 ? orders.value[liveIdx].fulfillmentStatus : null
    const prevHistStatus = histIdx !== -1 ? historyOrders.value[histIdx].fulfillmentStatus : null
    const prevSelectedStatus =
      isSelected && selectedOrder.value ? selectedOrder.value.fulfillmentStatus : null

    try {
      // Optimistic Update for zero-latency lag UI
      if (liveIdx !== -1) {
        orders.value[liveIdx].fulfillmentStatus = status
      }
      if (histIdx !== -1) {
        historyOrders.value[histIdx].fulfillmentStatus = status
      }
      if (isSelected && selectedOrder.value) {
        selectedOrder.value.fulfillmentStatus = status
      }

      await updateOrderStatus(id, status)
    } catch (error) {
      console.error('Failed to update status on server, reverting state:', error)

      // Revert optimistic updates
      if (liveIdx !== -1 && prevLiveStatus !== null) {
        orders.value[liveIdx].fulfillmentStatus = prevLiveStatus
      }
      if (histIdx !== -1 && prevHistStatus !== null) {
        historyOrders.value[histIdx].fulfillmentStatus = prevHistStatus
      }
      if (isSelected && selectedOrder.value && prevSelectedStatus !== null) {
        selectedOrder.value.fulfillmentStatus = prevSelectedStatus
      }

      // Force reload to sync state on failure
      fetchTodayOrders()
    }
  }

  // Replace an order everywhere it is held (live board, history list, open drawer)
  // with the server's recalculated version after a void/cancel.
  const applyUpdatedOrder = (updated: OrderDetail) => {
    const liveIdx = orders.value.findIndex(o => o.id === updated.id)
    if (liveIdx !== -1) orders.value[liveIdx] = updated

    const histIdx = historyOrders.value.findIndex(o => o.id === updated.id)
    if (histIdx !== -1) historyOrders.value[histIdx] = updated

    if (selectedOrder.value && selectedOrder.value.id === updated.id) {
      selectedOrder.value = updated
    }
  }

  // ── 4b. Void a whole order (reverses the money) ───────────────────
  const voidOrder = async (id: number, reason?: string) => {
    const updated = await voidOrderApi(id, reason)
    applyUpdatedOrder(updated)
    return updated
  }

  // ── 4c. Cancel a single line item (partial refund) ────────────────
  const cancelItem = async (orderId: number, itemId: number) => {
    const updated = await cancelOrderItemApi(orderId, itemId)
    applyUpdatedOrder(updated)
    return updated
  }

  // ── 4d. Reject a pending customer pre-order (unpaid → canceled) ────
  const rejectPreOrder = async (id: number) => {
    const updated = await rejectPreOrderApi(id)
    applyUpdatedOrder(updated)
    return updated
  }

  // ── 5. Server-Sent Events SSE Subscriber ─────────────────────────
  const subscribeToOrderStream = () => {
    if (sseController.value) {
      return // Already subscribed
    }

    const authStore = useAuthStore()
    const token = authStore.getAccessToken()

    if (!token) {
      console.warn('❌ SSE: Token missing. Unable to stream orders.')
      return
    }

    const controller = new AbortController()
    sseController.value = controller

    const baseUrl = import.meta.env.VITE_API_URL || ''
    const sseUrl = `${baseUrl.replace(/\/$/, '')}/api/orders/stream`

    const handleOrderCreated = (data: string) => {
      try {
        const newOrder = JSON.parse(data) as OrderDetail
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
    }

    const handleOrderUpdated = (data: string) => {
      try {
        const updatedOrder = JSON.parse(data) as OrderDetail
        // Update operational list
        const idx = orders.value.findIndex(o => o.id === updatedOrder.id)
        if (idx !== -1) {
          orders.value[idx] = updatedOrder
        } else {
          // If status updated and belongs to today, add it (just in case)
          if (updatedOrder.createdAt && isToday(updatedOrder.createdAt)) {
            orders.value.unshift(updatedOrder)
          }
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
    }

    const handleNotificationCreated = (data: string) => {
      try {
        const newNotification = JSON.parse(data)
        const notificationStore = useNotificationStore()
        notificationStore.handleSseNotification(newNotification)
        console.log(`🔔 SSE: New Notification! ${newNotification.type}`)
      } catch (err) {
        console.error('Error parsing SSE notification_created event:', err)
      }
    }

    const startStream = async () => {
      try {
        const response = await fetch(sseUrl, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          signal: controller.signal,
        })

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        isConnected.value = true
        console.log('📡 SSE: Stream connection established.')

        const reader = response.body?.getReader()
        if (!reader) {
          throw new Error('ReadableStream reader is not available')
        }

        const decoder = new TextDecoder()
        let buffer = ''

        while (true) {
          const { value, done } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const parts = buffer.split('\n\n')
          buffer = parts.pop() || ''

          for (const part of parts) {
            if (!part.trim()) continue

            let eventName = 'message'
            let dataStr = ''

            const lines = part.split('\n')
            for (const line of lines) {
              if (line.startsWith('event:')) {
                eventName = line.slice(6).trim()
              } else if (line.startsWith('data:')) {
                dataStr = line.slice(5).trim()
              }
            }

            if (dataStr) {
              if (eventName === 'order_created') {
                handleOrderCreated(dataStr)
              } else if (eventName === 'order_updated') {
                handleOrderUpdated(dataStr)
              } else if (eventName === 'notification_created') {
                handleNotificationCreated(dataStr)
              }
            }
          }
        }
      } catch (err: any) {
        if (err.name === 'AbortError') {
          console.log('📡 SSE: Stream connection aborted.')
          return
        }

        isConnected.value = false
        console.error(
          '❌ SSE: Connection encountered an error. Attempting auto-retry in 5s...',
          err
        )

        if (!controller.signal.aborted) {
          retryTimeout = setTimeout(() => {
            if (!controller.signal.aborted) {
              startStream()
            }
          }, 5000)
        }
      }
    }

    startStream()
  }

  // ── 6. SSE Stream Cleanup ─────────────────────────────────────────
  const unsubscribeFromOrderStream = () => {
    if (retryTimeout) {
      clearTimeout(retryTimeout)
      retryTimeout = null
    }
    if (sseController.value) {
      sseController.value.abort()
      sseController.value = null
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
    voidOrder,
    cancelItem,
    rejectPreOrder,
    subscribeToOrderStream,
    unsubscribeFromOrderStream,
  }
})
