import { onMounted, onUnmounted, unref, type MaybeRef } from 'vue'
import { useTelegram } from './useTelegram'

const DEV_TELEGRAM_USER_ID = '999999'

export function usePublicOrderSse(
  slug: MaybeRef<string>,
  onEvent: (eventType: 'order_created' | 'order_updated', order: any) => void
) {
  let eventSource: EventSource | null = null
  const tg = useTelegram()

  const connect = () => {
    const shopSlug = unref(slug)
    if (!shopSlug) return

    if (eventSource) {
      eventSource.close()
      eventSource = null
    }

    const params = new URLSearchParams()
    const userId = tg.user?.id
      ? String(tg.user.id)
      : import.meta.env.DEV
        ? DEV_TELEGRAM_USER_ID
        : ''
    if (userId) {
      params.set('telegramUserId', userId)
    }

    const apiBase = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')
    const url = `${apiBase}/api/public/shops/${encodeURIComponent(shopSlug)}/orders/sse?${params.toString()}`

    try {
      eventSource = new EventSource(url)

      eventSource.addEventListener('order_updated', (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data)
          onEvent('order_updated', data)
        } catch (err) {
          console.error('⚠️ [SSE] failed to parse order_updated payload', err)
        }
      })

      eventSource.addEventListener('order_created', (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data)
          onEvent('order_created', data)
        } catch (err) {
          console.error('⚠️ [SSE] failed to parse order_created payload', err)
        }
      })

      eventSource.onerror = () => {
        // EventSource automatically handles reconnection internally
      }
    } catch (err) {
      console.warn('⚠️ [SSE] EventSource init failed:', err)
    }
  }

  onMounted(() => {
    connect()
  })

  onUnmounted(() => {
    if (eventSource) {
      eventSource.close()
      eventSource = null
    }
  })

  return {
    reconnect: connect,
  }
}
