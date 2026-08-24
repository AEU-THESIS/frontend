import { watch, onUnmounted, unref, type MaybeRef } from 'vue'
import { useTelegram } from './useTelegram'

const DEV_TELEGRAM_USER_ID = '999999'
const MAX_RECONNECT_DELAY = 30_000

export function usePublicOrderSse(
  slug: MaybeRef<string>,
  onEvent: (eventType: 'order_created' | 'order_updated', order: Record<string, unknown>) => void
) {
  let eventSource: EventSource | null = null
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null
  let reconnectDelay = 1_000
  const tg = useTelegram()

  const cleanup = () => {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer)
      reconnectTimer = null
    }
    if (eventSource) {
      eventSource.close()
      eventSource = null
    }
  }

  const connect = () => {
    const shopSlug = unref(slug)
    if (!shopSlug) return

    cleanup()

    const params = new URLSearchParams()

    if (tg.webApp?.initData) {
      params.set('initData', tg.webApp.initData)
    } else if (import.meta.env.DEV) {
      params.set('telegramUserId', DEV_TELEGRAM_USER_ID)
    }

    const apiBase = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')
    const url = `${apiBase}/api/public/shops/${encodeURIComponent(shopSlug)}/orders/sse?${params.toString()}`

    try {
      eventSource = new EventSource(url)

      eventSource.addEventListener('order_updated', (e: MessageEvent) => {
        try {
          onEvent('order_updated', JSON.parse(e.data))
        } catch {
          // malformed payload
        }
      })

      eventSource.addEventListener('order_created', (e: MessageEvent) => {
        try {
          onEvent('order_created', JSON.parse(e.data))
        } catch {
          // malformed payload
        }
      })

      eventSource.onopen = () => {
        reconnectDelay = 1_000
      }

      eventSource.onerror = () => {
        if (eventSource?.readyState === EventSource.CLOSED) {
          cleanup()
          reconnectTimer = setTimeout(() => {
            reconnectDelay = Math.min(reconnectDelay * 2, MAX_RECONNECT_DELAY)
            connect()
          }, reconnectDelay)
        }
      }
    } catch {
      // EventSource init failed
    }
  }

  watch(
    () => unref(slug),
    newSlug => {
      if (newSlug) connect()
      else cleanup()
    },
    { immediate: true }
  )

  onUnmounted(cleanup)

  return { reconnect: connect }
}
