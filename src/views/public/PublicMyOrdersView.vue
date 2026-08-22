<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Button } from '@/components/ui/button'
import { usePublicShopStore } from '@/store/usePublicShopStore'
import { getMyPreOrders, type MyPreOrder } from '@/api/publicOrder'
import { usePublicOrderSse } from '@/composables/usePublicOrderSse'
import { usePublicOrderStatus } from '@/composables/usePublicOrderStatus'
import { APP_ROUTES } from '@/constants/appRoutes'
import LangFlagToggle from '@/components/public/LangFlagToggle.vue'

const router = useRouter()
const { t, locale } = useI18n()
const shopStore = usePublicShopStore()
const { statusConfig } = usePublicOrderStatus()

const orders = ref<MyPreOrder[]>([])
const loadingInitial = ref(true)
const loadingMore = ref(false)
const page = ref(1)
const hasMore = ref(true)
const sentinel = ref<HTMLElement | null>(null)
let observer: IntersectionObserver | null = null

const currency = computed(() => shopStore.shop?.currencySymbol ?? '$')

const formatTime = (isoString?: string) => {
  if (!isoString) return ''
  try {
    return new Date(isoString).toLocaleTimeString(locale.value, {
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return ''
  }
}

const loadFirstPage = async (silent = false) => {
  if (!silent) loadingInitial.value = true
  try {
    const res = await getMyPreOrders(shopStore.slug, 1, 10)
    if (silent) {
      const existingIds = new Set(orders.value.map(o => o.id))
      for (const order of res.orders) {
        if (!existingIds.has(order.id)) {
          orders.value.unshift(order)
        } else {
          const idx = orders.value.findIndex(o => o.id === order.id)
          if (idx !== -1) {
            orders.value[idx] = order
          }
        }
      }
    } else {
      orders.value = res.orders
      page.value = 1
      hasMore.value = res.hasMore
    }
  } catch {
    if (!silent) orders.value = []
  } finally {
    if (!silent) loadingInitial.value = false
  }
}

const loadNextPage = async () => {
  if (loadingMore.value || !hasMore.value || loadingInitial.value) return
  loadingMore.value = true
  const nextPage = page.value + 1
  try {
    const res = await getMyPreOrders(shopStore.slug, nextPage, 10)
    if (res.orders.length > 0) {
      const existingIds = new Set(orders.value.map(o => o.id))
      const newItems = res.orders.filter(o => !existingIds.has(o.id))
      orders.value.push(...newItems)
      page.value = nextPage
      hasMore.value = res.hasMore
    } else {
      hasMore.value = false
    }
  } catch {
    // Keep hasMore unchanged so the user can retry
  } finally {
    loadingMore.value = false
  }
}

usePublicOrderSse(
  computed(() => shopStore.slug),
  (event, data) => {
    if (!data) return
    const orderId = data.id as number | undefined
    const orderNumber = data.orderNumber as string | undefined

    if (event === 'order_updated') {
      const idx = orders.value.findIndex(o => o.id === orderId || o.orderNumber === orderNumber)
      if (idx !== -1) {
        orders.value[idx] = {
          ...orders.value[idx],
          fulfillmentStatus:
            (data.fulfillmentStatus as string) ?? orders.value[idx].fulfillmentStatus,
          paymentStatus: (data.paymentStatus as string) ?? orders.value[idx].paymentStatus,
        }
      }
    } else if (event === 'order_created') {
      const exists = orders.value.some(o => o.id === orderId || o.orderNumber === orderNumber)
      if (!exists && orderNumber) {
        const items = Array.isArray(data.items) ? data.items : []
        orders.value.unshift({
          id: orderId ?? 0,
          orderNumber,
          totalAmount: Number(data.totalAmount ?? 0),
          fulfillmentStatus: (data.fulfillmentStatus as string) ?? 'pending',
          paymentStatus: (data.paymentStatus as string) ?? 'unpaid',
          createdAt: (data.createdAt as string) ?? new Date().toISOString(),
          items: items.map((it: Record<string, unknown>) => ({
            id: it.id as number,
            quantity: it.quantity as number,
            name:
              ((it.product as Record<string, unknown>)?.name as string) ??
              (it.name as string) ??
              '',
            options: (Array.isArray(it.options) ? it.options : []).map(
              (op: Record<string, unknown> | string) =>
                typeof op === 'string' ? op : ((op.optionName as string) ?? '')
            ),
          })),
        })
      }
    }
  }
)

const handleVisibility = () => {
  if (!document.hidden) {
    loadFirstPage(true)
  }
}

const setupObserver = () => {
  if (observer) observer.disconnect()
  if (!sentinel.value) return
  observer = new IntersectionObserver(
    entries => {
      if (
        entries[0].isIntersecting &&
        hasMore.value &&
        !loadingMore.value &&
        !loadingInitial.value
      ) {
        loadNextPage()
      }
    },
    { rootMargin: '200px' }
  )
  observer.observe(sentinel.value)
}

const goMenu = () =>
  router.push({ name: APP_ROUTES.PUBLIC_MENU.name, params: { slug: shopStore.slug } })

const goToDetail = (orderNumber: string) => {
  router.push({
    name: APP_ROUTES.PUBLIC_CONFIRMATION.name,
    params: { slug: shopStore.slug, orderNumber },
  })
}

watch(sentinel, el => {
  if (el) setupObserver()
})

onMounted(() => {
  loadFirstPage()
  document.addEventListener('visibilitychange', handleVisibility)
})

onUnmounted(() => {
  if (observer) {
    observer.disconnect()
    observer = null
  }
  document.removeEventListener('visibilitychange', handleVisibility)
})
</script>

<template>
  <div class="flex flex-1 flex-col pb-12">
    <!-- Header -->
    <header
      class="sticky top-0 z-10 flex items-center justify-between gap-3 bg-stone-50/90 px-4 py-3 backdrop-blur dark:bg-stone-900/90"
    >
      <div class="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          class="h-9 w-9 rounded-full bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300"
          @click="goMenu"
        >
          <span class="material-symbols-outlined">arrow_back</span>
        </Button>
        <h1 class="text-lg font-extrabold text-stone-900 dark:text-stone-50">
          {{ t('publicOrder.myOrders') }}
        </h1>
      </div>
      <LangFlagToggle />
    </header>

    <main class="flex-1 px-4 pt-3">
      <!-- Initial Loading Skeleton -->
      <div v-if="loadingInitial && orders.length === 0" class="space-y-3">
        <div
          v-for="i in 3"
          :key="i"
          class="animate-pulse rounded-2xl border border-stone-100 bg-white p-4 shadow-sm dark:border-stone-800 dark:bg-stone-800"
        >
          <div
            class="mb-3 flex items-center justify-between border-b border-stone-100 pb-2.5 dark:border-stone-700/60"
          >
            <div class="h-4 w-36 rounded-md bg-stone-200 dark:bg-stone-700"></div>
            <div class="h-4 w-20 rounded-full bg-stone-200 dark:bg-stone-700"></div>
          </div>
          <div class="space-y-2 py-1">
            <div class="h-3 w-44 rounded bg-stone-200 dark:bg-stone-700"></div>
            <div class="h-3 w-28 rounded bg-stone-200 dark:bg-stone-700"></div>
          </div>
          <div
            class="mt-3 flex items-center justify-between border-t border-stone-100 pt-2.5 dark:border-stone-700/60"
          >
            <div class="h-3 w-12 rounded bg-stone-200 dark:bg-stone-700"></div>
            <div class="h-4 w-14 rounded bg-stone-200 dark:bg-stone-700"></div>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div
        v-else-if="!loadingInitial && orders.length === 0"
        class="flex flex-col items-center justify-center py-20 text-center"
      >
        <div
          class="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-stone-100 text-stone-400 dark:bg-stone-800"
        >
          <span class="material-symbols-outlined text-2xl">receipt_long</span>
        </div>
        <p class="text-sm font-bold text-stone-700 dark:text-stone-300">
          {{ t('publicOrder.noOrders') }}
        </p>
        <p class="mt-1 text-xs text-stone-400">
          {{ t('publicOrder.emptyMenu') }}
        </p>
        <Button class="mt-4 h-12 rounded-2xl px-6 font-bold" @click="goMenu">
          {{ t('publicOrder.orderNow') }}
        </Button>
      </div>

      <!-- Orders List with Infinite Scroll -->
      <div v-else class="space-y-3">
        <div
          v-for="o in orders"
          :key="o.id"
          role="button"
          tabindex="0"
          class="cursor-pointer rounded-2xl border border-stone-100 bg-white p-4 shadow-sm transition hover:border-stone-200 hover:shadow active:scale-[0.99] dark:border-stone-800 dark:bg-stone-800"
          @click="goToDetail(o.orderNumber)"
          @keydown.enter="goToDetail(o.orderNumber)"
          @keydown.space.prevent="goToDetail(o.orderNumber)"
        >
          <!-- Order Header: Number on Left, Clean Compact Status Badge on Right -->
          <div
            class="flex items-center justify-between gap-2 border-b border-stone-100 pb-2.5 dark:border-stone-700/60"
          >
            <div class="min-w-0 flex-1">
              <span
                class="block truncate font-mono text-xs font-bold text-stone-800 dark:text-stone-200"
              >
                {{ o.orderNumber }}
              </span>
              <p v-if="o.createdAt" class="text-[11px] text-stone-400">
                {{ formatTime(o.createdAt) }}
              </p>
            </div>

            <!-- Compact, elegant status badge -->
            <span
              class="inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
              :class="statusConfig(o.fulfillmentStatus).badgeClass"
            >
              <span
                class="h-1.5 w-1.5 rounded-full"
                :class="statusConfig(o.fulfillmentStatus).dotClass"
              ></span>
              <span>{{ statusConfig(o.fulfillmentStatus).title }}</span>
            </span>
          </div>

          <!-- Items preview -->
          <ul class="my-2.5 space-y-1">
            <li
              v-for="it in o.items"
              :key="it.id"
              class="text-xs text-stone-600 dark:text-stone-300"
            >
              <span class="font-bold text-stone-800 dark:text-stone-200">{{ it.quantity }}×</span>
              <span class="ml-1 font-medium">{{ it.name }}</span>
              <span v-if="it.options.length" class="ml-1 text-[11px] text-stone-400">
                · {{ it.options.join(', ') }}
              </span>
            </li>
          </ul>

          <!-- Card Footer: Total Amount + View Details Link -->
          <div
            class="flex items-center justify-between border-t border-stone-100 pt-2.5 text-xs dark:border-stone-700/60"
          >
            <span class="font-bold uppercase tracking-wider text-stone-400">
              {{ t('publicOrder.total') }}
            </span>
            <div class="flex items-center gap-1.5">
              <span class="font-extrabold text-primary">
                {{ currency }}{{ Number(o.totalAmount).toFixed(2) }}
              </span>
              <span class="material-symbols-outlined text-sm text-stone-300 dark:text-stone-600">
                chevron_right
              </span>
            </div>
          </div>
        </div>

        <!-- Infinite Scroll Sentinel & Load More Skeleton -->
        <div ref="sentinel" class="py-2">
          <div
            v-if="loadingMore"
            class="animate-pulse rounded-2xl border border-stone-100 bg-white p-4 shadow-sm dark:border-stone-800 dark:bg-stone-800"
          >
            <div class="mb-2 flex items-center justify-between">
              <div class="h-4 w-32 rounded bg-stone-200 dark:bg-stone-700"></div>
              <div class="h-4 w-16 rounded-full bg-stone-200 dark:bg-stone-700"></div>
            </div>
            <div class="h-3 w-40 rounded bg-stone-200 dark:bg-stone-700"></div>
          </div>
        </div>

        <!-- Order More Button -->
        <div class="pt-2">
          <Button
            variant="secondary"
            class="h-12 w-full rounded-2xl border border-stone-200/80 bg-white font-bold text-stone-700 shadow-sm transition active:scale-[0.98] dark:border-stone-700 dark:bg-stone-800 dark:text-stone-200"
            @click="goMenu"
          >
            <span class="material-symbols-outlined mr-2 text-lg">restaurant_menu</span>
            {{ t('publicOrder.orderMore') }}
          </Button>
        </div>
      </div>
    </main>
  </div>
</template>
