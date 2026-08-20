<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { usePublicShopStore } from '@/store/usePublicShopStore'
import { getMyPreOrders, type MyPreOrder } from '@/api/publicOrder'
import { APP_ROUTES } from '@/constants/appRoutes'
import LangFlagToggle from '@/components/public/LangFlagToggle.vue'

const router = useRouter()
const { t } = useI18n()
const shopStore = usePublicShopStore()

const orders = ref<MyPreOrder[]>([])
const loading = ref(false)
const currency = computed(() => shopStore.shop?.currencySymbol ?? '$')

const statusClass = (status: string) => {
  switch (status) {
    case 'pending':
      return 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
    case 'preparing':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400'
    case 'ready':
      return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
    case 'completed':
      return 'bg-stone-200 text-stone-600 dark:bg-stone-700 dark:text-stone-300'
    case 'canceled':
      return 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400'
    default:
      return 'bg-stone-100 text-stone-600'
  }
}

const load = async () => {
  loading.value = true
  try {
    orders.value = await getMyPreOrders(shopStore.slug)
  } catch {
    orders.value = []
  } finally {
    loading.value = false
  }
}

const goMenu = () =>
  router.push({ name: APP_ROUTES.PUBLIC_MENU.name, params: { slug: shopStore.slug } })

onMounted(load)
</script>

<template>
  <div class="flex flex-1 flex-col pb-6">
    <header
      class="sticky top-0 z-10 flex items-center gap-3 bg-stone-50/90 px-4 py-3 backdrop-blur dark:bg-stone-900/90"
    >
      <button
        class="flex h-9 w-9 items-center justify-center rounded-full bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300"
        @click="goMenu"
      >
        <span class="material-symbols-outlined">arrow_back</span>
      </button>
      <h1 class="flex-1 text-lg font-extrabold text-stone-900 dark:text-stone-50">
        {{ t('publicOrder.myOrders') }}
      </h1>
      <LangFlagToggle />
      <button
        class="flex h-9 w-9 items-center justify-center rounded-full bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300"
        @click="load"
      >
        <span class="material-symbols-outlined" :class="{ 'animate-spin': loading }">refresh</span>
      </button>
    </header>

    <main class="flex-1 px-4 pt-2">
      <!-- Skeleton while first load is in flight -->
      <div v-if="loading && orders.length === 0" class="space-y-3">
        <div
          v-for="i in 3"
          :key="i"
          class="rounded-2xl border border-stone-100 bg-white p-4 dark:border-stone-800 dark:bg-stone-800"
        >
          <div class="mb-2 flex items-center justify-between">
            <div class="h-4 w-32 animate-pulse rounded bg-stone-200 dark:bg-stone-700"></div>
            <div class="h-4 w-16 animate-pulse rounded-full bg-stone-200 dark:bg-stone-700"></div>
          </div>
          <div class="h-3 w-40 animate-pulse rounded bg-stone-200 dark:bg-stone-700"></div>
        </div>
      </div>

      <p
        v-else-if="!loading && orders.length === 0"
        class="py-16 text-center text-sm text-stone-400"
      >
        {{ t('publicOrder.noOrders') }}
      </p>

      <div v-else class="space-y-3">
        <div
          v-for="o in orders"
          :key="o.id"
          class="rounded-2xl border border-stone-100 bg-white p-4 dark:border-stone-800 dark:bg-stone-800"
        >
          <div class="flex items-center justify-between">
            <span class="text-sm font-extrabold text-stone-900 dark:text-stone-50">
              {{ o.orderNumber }}
            </span>
            <span
              class="rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase"
              :class="statusClass(o.fulfillmentStatus)"
            >
              {{ t(`publicOrder.status.${o.fulfillmentStatus}`) }}
            </span>
          </div>
          <ul class="mt-2 space-y-0.5">
            <li
              v-for="it in o.items"
              :key="it.id"
              class="text-xs text-stone-500 dark:text-stone-400"
            >
              {{ it.quantity }}× {{ it.name }}
              <span v-if="it.options.length">· {{ it.options.join(', ') }}</span>
            </li>
          </ul>
          <p class="mt-2 text-right text-sm font-bold text-primary">
            {{ currency }}{{ Number(o.totalAmount).toFixed(2) }}
          </p>
        </div>
      </div>
    </main>
  </div>
</template>
