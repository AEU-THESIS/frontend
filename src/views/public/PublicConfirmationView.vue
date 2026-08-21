<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'
import { Button } from '@/components/ui/button'
import { usePublicShopStore } from '@/store/usePublicShopStore'
import { getMyPreOrders, type MyPreOrder } from '@/api/publicOrder'
import { useTelegram } from '@/composables/useTelegram'
import { usePublicOrderSse } from '@/composables/usePublicOrderSse'
import { usePublicOrderStatus } from '@/composables/usePublicOrderStatus'
import { APP_ROUTES } from '@/constants/appRoutes'
import LangFlagToggle from '@/components/public/LangFlagToggle.vue'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const shopStore = usePublicShopStore()
const tg = useTelegram()
const { statusConfig } = usePublicOrderStatus()

const orderNumber = computed(() => String(route.params.orderNumber ?? ''))
const cafeTelegram = import.meta.env.VITE_CAFE_TELEGRAM_URL as string | undefined
const orderDetail = ref<MyPreOrder | null>(null)
const loadingDetail = ref(true)
const copied = ref(false)
const currency = computed(() => shopStore.shop?.currencySymbol ?? '$')

const status = computed(() => orderDetail.value?.fulfillmentStatus ?? 'pending')
const currentStatus = computed(() => statusConfig(status.value))

const loadOrder = async () => {
  if (!orderNumber.value) return
  try {
    const res = await getMyPreOrders(shopStore.slug, 1, 20)
    const found = res.orders.find(o => o.orderNumber === orderNumber.value)
    if (found) {
      orderDetail.value = found
    }
  } catch {
    // silent catch
  } finally {
    loadingDetail.value = false
  }
}

// Real-time SSE push updates without polling!
usePublicOrderSse(
  computed(() => shopStore.slug),
  (_event, data) => {
    if (!data) return
    if (data.orderNumber === orderNumber.value || data.id === orderDetail.value?.id) {
      if (orderDetail.value) {
        orderDetail.value.fulfillmentStatus =
          data.fulfillmentStatus ?? orderDetail.value.fulfillmentStatus
        orderDetail.value.paymentStatus = data.paymentStatus ?? orderDetail.value.paymentStatus
      } else {
        loadOrder()
      }
    }
  }
)

const handleVisibility = () => {
  if (!document.hidden) {
    loadOrder()
  }
}

let copiedTimer: ReturnType<typeof setTimeout> | null = null
const copyNumber = async () => {
  if (!orderNumber.value) return
  try {
    await navigator.clipboard.writeText(orderNumber.value)
    copied.value = true
    tg.haptic('light')
    toast.success(t('publicOrder.copied'))
    if (copiedTimer) clearTimeout(copiedTimer)
    copiedTimer = setTimeout(() => {
      copied.value = false
    }, 2000)
  } catch {
    toast.error(t('publicOrder.copyFailed'))
  }
}

const goMenu = () =>
  router.push({ name: APP_ROUTES.PUBLIC_MENU.name, params: { slug: shopStore.slug } })
const goMyOrders = () =>
  router.push({ name: APP_ROUTES.PUBLIC_MY_ORDERS.name, params: { slug: shopStore.slug } })

onMounted(() => {
  tg.notify('success')
  loadOrder()
  document.addEventListener('visibilitychange', handleVisibility)
})

onUnmounted(() => {
  if (copiedTimer) clearTimeout(copiedTimer)
  document.removeEventListener('visibilitychange', handleVisibility)
})
</script>

<template>
  <div class="flex flex-1 flex-col pb-10">
    <!-- Top Bar -->
    <header class="flex items-center justify-between px-4 py-3">
      <button
        type="button"
        class="flex h-9 w-9 items-center justify-center rounded-full bg-stone-100 text-stone-600 transition active:scale-90 dark:bg-stone-800 dark:text-stone-300"
        @click="goMyOrders"
      >
        <span class="material-symbols-outlined text-lg">arrow_back</span>
      </button>
      <span class="text-xs font-bold uppercase tracking-wider text-stone-400">
        {{ shopStore.shop?.name ?? '' }}
      </span>
      <LangFlagToggle />
    </header>

    <main class="flex flex-1 flex-col items-center px-4 pt-2 text-center">
      <!-- Icon Hero -->
      <div class="relative mb-3 mt-1 flex h-20 w-20 items-center justify-center">
        <div
          v-if="status === 'pending'"
          class="flex h-16 w-16 items-center justify-center rounded-full bg-amber-500 text-white shadow-lg shadow-amber-500/20"
        >
          <span class="material-symbols-outlined text-3xl font-bold">schedule</span>
        </div>
        <div
          v-else-if="status === 'completed' || status === 'ready'"
          class="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-500/20"
        >
          <span class="material-symbols-outlined text-3xl font-bold">check</span>
        </div>
        <div
          v-else-if="status === 'preparing'"
          class="flex h-16 w-16 items-center justify-center rounded-full bg-blue-500 text-white shadow-lg shadow-blue-500/20"
        >
          <span class="material-symbols-outlined text-3xl font-bold">coffee</span>
        </div>
        <div
          v-else
          class="flex h-16 w-16 items-center justify-center rounded-full bg-stone-500 text-white shadow-lg shadow-stone-500/20"
        >
          <span class="material-symbols-outlined text-3xl font-bold">receipt</span>
        </div>
      </div>

      <!-- Title & Subtitle -->
      <div class="max-w-xs space-y-1">
        <h1 class="text-xl font-bold text-stone-900 dark:text-stone-50">
          {{
            status === 'completed'
              ? t('publicOrder.status.completed')
              : status === 'ready'
                ? t('publicOrder.status.ready')
                : status === 'preparing'
                  ? t('publicOrder.status.preparing')
                  : t('publicOrder.orderPlacedSuccess')
          }}
        </h1>
        <p class="text-xs text-stone-500 dark:text-stone-400">
          {{ t('publicOrder.orderPlacedDesc') }}
        </p>
      </div>

      <!-- Order Detail Skeleton (while initial load) -->
      <div
        v-if="loadingDetail && !orderDetail"
        class="mt-5 w-full max-w-sm animate-pulse rounded-2xl border border-stone-100 bg-white p-4 shadow-sm dark:border-stone-800 dark:bg-stone-800"
      >
        <div
          class="flex items-center justify-between border-b border-stone-100 pb-3 dark:border-stone-700/60"
        >
          <div class="space-y-1.5">
            <div class="h-2.5 w-16 rounded bg-stone-200 dark:bg-stone-700"></div>
            <div class="h-4 w-36 rounded bg-stone-200 dark:bg-stone-700"></div>
          </div>
          <div class="h-5 w-24 rounded-full bg-stone-200 dark:bg-stone-700"></div>
        </div>
        <div class="my-3.5 h-16 rounded-xl bg-stone-100 dark:bg-stone-900/60"></div>
        <div class="space-y-2 py-2">
          <div class="h-3 w-40 rounded bg-stone-200 dark:bg-stone-700"></div>
          <div class="h-3 w-28 rounded bg-stone-200 dark:bg-stone-700"></div>
        </div>
      </div>

      <!-- Order Detail Card -->
      <div
        v-else
        class="mt-5 w-full max-w-sm overflow-hidden rounded-2xl border border-stone-100 bg-white p-4 text-left shadow-sm dark:border-stone-800 dark:bg-stone-800"
      >
        <!-- Card Header: Number on Left, Status on Right -->
        <div
          class="flex items-center justify-between gap-2 border-b border-stone-100 pb-3 dark:border-stone-700/60"
        >
          <div class="min-w-0 flex-1">
            <span class="text-[10px] font-bold uppercase tracking-wider text-stone-400">
              {{ t('publicOrder.orderNumber') }}
            </span>
            <div class="flex items-center gap-1.5">
              <span class="truncate font-mono text-xs font-bold text-stone-900 dark:text-stone-50">
                {{ orderNumber }}
              </span>
              <button
                type="button"
                class="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-stone-100 text-stone-500 transition active:scale-90 dark:bg-stone-700 dark:text-stone-300"
                :title="t('publicOrder.copyOrderNumber')"
                @click="copyNumber"
              >
                <span class="material-symbols-outlined text-xs">
                  {{ copied ? 'check' : 'content_copy' }}
                </span>
              </button>
            </div>
          </div>

          <!-- Status pill -->
          <span
            class="inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold"
            :class="currentStatus.badgeClass"
          >
            <span class="h-1.5 w-1.5 rounded-full" :class="currentStatus.dotClass"></span>
            <span>{{ currentStatus.title }}</span>
          </span>
        </div>

        <!-- 3-Step Progress Tracker: Horizontal 3-Column Timeline -->
        <div
          v-if="status !== 'rejected' && status !== 'canceled'"
          class="my-3.5 rounded-xl bg-stone-50 p-3.5 dark:bg-stone-900/60"
        >
          <div class="relative grid grid-cols-3 gap-2 text-center">
            <!-- Background connecting line -->
            <div
              class="absolute left-[16%] right-[16%] top-3.5 -z-0 h-0.5 bg-stone-200 dark:bg-stone-700"
            ></div>

            <!-- Step 1: Received -->
            <div class="relative z-10 flex flex-col items-center gap-1">
              <div
                class="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-colors"
                :class="
                  currentStatus.step >= 1
                    ? 'bg-emerald-500 text-white'
                    : 'bg-stone-200 text-stone-500 dark:bg-stone-700'
                "
              >
                <span class="material-symbols-outlined text-sm font-bold">check</span>
              </div>
              <span
                class="text-[11px] font-semibold"
                :class="
                  currentStatus.step >= 1
                    ? 'text-stone-800 dark:text-stone-200'
                    : 'text-stone-400 dark:text-stone-500'
                "
              >
                {{ t('publicOrder.stepReceived') }}
              </span>
            </div>

            <!-- Step 2: Preparing -->
            <div class="relative z-10 flex flex-col items-center gap-1">
              <div
                class="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-colors"
                :class="
                  currentStatus.step >= 2
                    ? 'bg-blue-500 text-white'
                    : 'bg-stone-200 text-stone-500 dark:bg-stone-700 dark:text-stone-400'
                "
              >
                <span
                  v-if="currentStatus.step >= 3"
                  class="material-symbols-outlined text-sm font-bold"
                  >check</span
                >
                <span v-else>2</span>
              </div>
              <span
                class="text-[11px] font-semibold"
                :class="
                  currentStatus.step >= 2
                    ? 'text-stone-800 dark:text-stone-200'
                    : 'text-stone-400 dark:text-stone-500'
                "
              >
                {{ t('publicOrder.stepPreparing') }}
              </span>
            </div>

            <!-- Step 3: Ready -->
            <div class="relative z-10 flex flex-col items-center gap-1">
              <div
                class="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-colors"
                :class="
                  currentStatus.step >= 3
                    ? 'bg-emerald-500 text-white'
                    : 'bg-stone-200 text-stone-500 dark:bg-stone-700 dark:text-stone-400'
                "
              >
                <span
                  v-if="currentStatus.step >= 4"
                  class="material-symbols-outlined text-sm font-bold"
                  >check</span
                >
                <span v-else>3</span>
              </div>
              <span
                class="text-[11px] font-semibold"
                :class="
                  currentStatus.step >= 3
                    ? 'text-stone-800 dark:text-stone-200'
                    : 'text-stone-400 dark:text-stone-500'
                "
              >
                {{ t('publicOrder.stepReady') }}
              </span>
            </div>
          </div>
        </div>

        <!-- Ordered Items Breakdown (if loaded) -->
        <div
          v-if="orderDetail && orderDetail.items.length"
          class="mt-3 border-t border-stone-100 pt-3 dark:border-stone-700/60"
        >
          <p class="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-stone-400">
            {{ t('publicOrder.yourOrder') }}
          </p>
          <ul class="space-y-1.5">
            <li
              v-for="it in orderDetail.items"
              :key="it.id"
              class="flex items-start justify-between text-xs"
            >
              <div>
                <span class="font-bold text-stone-800 dark:text-stone-200">{{ it.quantity }}×</span>
                <span class="ml-1 font-medium text-stone-700 dark:text-stone-300">{{
                  it.name
                }}</span>
                <p v-if="it.options.length" class="text-[11px] text-stone-400">
                  {{ it.options.join(', ') }}
                </p>
              </div>
            </li>
          </ul>

          <div
            class="mt-3 flex items-center justify-between border-t border-stone-100 pt-2.5 dark:border-stone-700/60"
          >
            <span class="text-xs font-bold uppercase tracking-wider text-stone-400">
              {{ t('publicOrder.total') }}
            </span>
            <span class="text-base font-extrabold text-primary">
              {{ currency }}{{ Number(orderDetail.totalAmount).toFixed(2) }}
            </span>
          </div>
        </div>

        <!-- Note without emoji -->
        <p class="mt-3 text-[11px] leading-relaxed text-stone-400 dark:text-stone-500">
          {{ t('publicOrder.orderPlacedMessage') }}
        </p>
      </div>

      <!-- Action Buttons (Consistent style & active feel) -->
      <div class="mt-5 flex w-full max-w-sm flex-col gap-2.5">
        <Button
          class="h-12 w-full rounded-2xl font-bold shadow-sm transition active:scale-[0.98]"
          @click="goMyOrders"
        >
          <span class="material-symbols-outlined mr-2 text-lg">receipt_long</span>
          {{ t('publicOrder.viewMyOrders') }}
        </Button>

        <Button
          variant="secondary"
          class="h-12 w-full rounded-2xl border border-stone-200/80 bg-white font-bold text-stone-700 shadow-sm transition active:scale-[0.98] dark:border-stone-700 dark:bg-stone-800 dark:text-stone-200"
          @click="goMenu"
        >
          <span class="material-symbols-outlined mr-2 text-lg">restaurant_menu</span>
          {{ t('publicOrder.orderMore') }}
        </Button>

        <a
          v-if="cafeTelegram"
          :href="cafeTelegram"
          target="_blank"
          rel="noopener"
          class="flex w-full items-center justify-center gap-1.5 pt-1 text-xs font-bold text-sky-600 transition hover:underline dark:text-sky-400"
        >
          <span class="material-symbols-outlined text-sm">send</span>
          {{ t('publicOrder.messageUs') }}
        </a>
      </div>
    </main>
  </div>
</template>
