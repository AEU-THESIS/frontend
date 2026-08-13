<script setup lang="ts">
import { ref, computed, onMounted, watch, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useOrderStore } from '@/store/useOrderStore'
import { storeToRefs } from 'pinia'
import type { OrderDetail } from '@/types/order.types'
import { toast } from 'vue-sonner'
import { useShopSettingsStore } from '@/store/useShopSettingsStore'
import { roundRielUp } from '@/utils/money'
import AppSelect from '@/components/ui/select/AppSelect.vue'
import FilterPanel from '@/components/common/FilterPanel.vue'
import { AppInput } from '@/components/ui/input'

const { t } = useI18n()
const orderStore = useOrderStore()
const shopSettingsStore = useShopSettingsStore()
const { historyOrders, historyPagination, loading, selectedOrder } = storeToRefs(orderStore)

// Order total shown in the currency the customer actually paid in. A riel order
// shows the exact note-rounded riel figure (using the order's OWN snapshot rate),
// so Order History matches the receipt and reconciles even if the shop later
// changed its exchange rate. USD orders show dollars.
const formatOrderTotal = (order: OrderDetail) => {
  if (order.paymentCurrency === 'KHR') {
    const riel = roundRielUp(Number(order.totalAmount) * Number(order.exchangeRateSnapshot))
    return `${riel.toLocaleString()}៛`
  }
  return `$${Number(order.totalAmount).toFixed(2)}`
}

const confirmCancelActive = ref(false)
let confirmCancelTimeout: ReturnType<typeof setTimeout> | null = null

// ── 1. Search and Filtering States ────────────────────────────────
const search = ref('')
const fulfillmentStatus = ref('all')
const paymentStatus = ref('all')
const page = ref(1)
const limit = ref(10)

const fulfillmentStatusOptions = computed(() => [
  { value: 'preparing', label: t('orderDashboard.preparing') },
  { value: 'ready', label: t('orderDashboard.ready') },
  { value: 'completed', label: t('orderDashboard.completed') },
  { value: 'canceled', label: t('orderDashboard.canceled') },
])

const paymentStatusOptions = computed(() => [
  { value: 'paid', label: t('orderDashboard.paid') },
  { value: 'unpaid', label: t('orderDashboard.unpaid') },
])

// Date preset selection: today, yesterday, last7Days, customRange
const datePreset = ref<'today' | 'yesterday' | 'last7Days' | 'customRange'>('today')
const customStartDate = ref('')
const customEndDate = ref('')

const hasActiveFilters = computed(
  () =>
    search.value.trim() !== '' ||
    fulfillmentStatus.value !== 'all' ||
    paymentStatus.value !== 'all' ||
    datePreset.value !== 'today' ||
    customStartDate.value !== '' ||
    customEndDate.value !== ''
)

// ── 2. Preset Date calculations helper (Timezone-proof Local Calendar Formatting) ──
const dateFilters = computed(() => {
  const today = new Date()
  const formatDate = (d: Date) => {
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  switch (datePreset.value) {
    case 'today':
      return {
        startDate: formatDate(today),
        endDate: formatDate(today),
      }
    case 'yesterday': {
      const yesterday = new Date()
      yesterday.setDate(today.getDate() - 1)
      return {
        startDate: formatDate(yesterday),
        endDate: formatDate(yesterday),
      }
    }
    case 'last7Days': {
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(today.getDate() - 7)
      return {
        startDate: formatDate(sevenDaysAgo),
        endDate: formatDate(today),
      }
    }
    case 'customRange':
      return {
        startDate: customStartDate.value || undefined,
        endDate: customEndDate.value || undefined,
      }
    default:
      return {
        startDate: undefined,
        endDate: undefined,
      }
  }
})

// ── 3. Fetch Trigger (Includes previously missing paymentStatus parameter) ──
const fetchHistory = async () => {
  const dates = dateFilters.value
  await orderStore.fetchHistoryOrders({
    search: search.value.trim() || undefined,
    status: fulfillmentStatus.value !== 'all' ? fulfillmentStatus.value : undefined,
    paymentStatus: paymentStatus.value !== 'all' ? paymentStatus.value : undefined,
    startDate: dates.startDate,
    endDate: dates.endDate,
    page: page.value,
    limit: limit.value,
  })
}

// Watch page to fetch automatically
watch(page, () => {
  fetchHistory()
})

// Filters are applied explicitly — resetting the page triggers the watcher above
const applyFilters = () => {
  if (page.value !== 1) {
    page.value = 1
  } else {
    fetchHistory()
  }
}

const clearFilters = () => {
  search.value = ''
  fulfillmentStatus.value = 'all'
  paymentStatus.value = 'all'
  datePreset.value = 'today'
  customStartDate.value = ''
  customEndDate.value = ''

  applyFilters()
}

onMounted(() => {
  fetchHistory()
})

// ── 4. Formatter Helpers ──────────────────────────────────────────
const formatDateTime = (dateStr: string) => {
  try {
    const date = new Date(dateStr)
    return date.toLocaleString([], {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return dateStr
  }
}

// ── 5. Detail Modal side sheet triggers ───────────────────────────
const openOrderDetails = async (order: OrderDetail) => {
  confirmCancelActive.value = false
  if (confirmCancelTimeout) {
    clearTimeout(confirmCancelTimeout)
    confirmCancelTimeout = null
  }
  await orderStore.fetchSingleOrderDetail(order.id)
}

const closeOrderDetails = () => {
  selectedOrder.value = null
  confirmCancelActive.value = false
  if (confirmCancelTimeout) {
    clearTimeout(confirmCancelTimeout)
    confirmCancelTimeout = null
  }
}

const getSelectedOrderTotalQty = computed(() => {
  if (!selectedOrder.value) return 0
  return selectedOrder.value.items.reduce((sum, item) => sum + item.quantity, 0)
})

const handlePrint = () => {
  window.print()
}

const handleToggleFulfillmentStatus = async () => {
  if (!selectedOrder.value) return

  const currentStatus = selectedOrder.value.fulfillmentStatus

  if (currentStatus === 'completed') {
    if (!confirmCancelActive.value) {
      confirmCancelActive.value = true
      if (confirmCancelTimeout) clearTimeout(confirmCancelTimeout)
      confirmCancelTimeout = setTimeout(() => {
        confirmCancelActive.value = false
      }, 3000)
      return
    }

    if (confirmCancelTimeout) {
      clearTimeout(confirmCancelTimeout)
      confirmCancelTimeout = null
    }
    confirmCancelActive.value = false

    await orderStore.changeStatus(selectedOrder.value.id, 'canceled')
    selectedOrder.value.fulfillmentStatus = 'canceled'
    toast.success(t('orderDashboard.statusUpdated'))
    fetchHistory()
  } else {
    confirmCancelActive.value = false
    if (confirmCancelTimeout) {
      clearTimeout(confirmCancelTimeout)
      confirmCancelTimeout = null
    }

    await orderStore.changeStatus(selectedOrder.value.id, 'completed')
    selectedOrder.value.fulfillmentStatus = 'completed'
    toast.success(t('orderDashboard.statusUpdated'))
    fetchHistory()
  }
}

onUnmounted(() => {
  if (confirmCancelTimeout) {
    clearTimeout(confirmCancelTimeout)
  }
})
</script>

<template>
  <div class="flex-1 overflow-hidden flex flex-col p-6 gap-6 h-full relative receipt-print-wrapper">
    <!-- ── ADVANCED FILTERS PANE (Timezone and width aligned grid) ── -->
    <FilterPanel
      :has-active-filters="hasActiveFilters"
      section-class="rounded-xl shadow-sm"
      @submit="applyFilters"
      @clear="clearFilters"
    >
      <AppInput
        id="order-history-search"
        v-model="search"
        search-icon
        type="text"
        :label="t('common.search')"
        label-class="text-xs font-semibold uppercase tracking-wide text-[#1A1C1C]/50 dark:text-stone-400"
        container-class="col-span-12 sm:col-span-4 lg:col-span-4"
        :placeholder="t('orderHistory.searchPlaceholder')"
        class="h-10 border-none bg-[#FAFAFA] pr-4 text-sm text-[#1A1C1C] shadow-none placeholder:text-stone-400 focus-visible:ring-2 focus-visible:ring-primary dark:bg-stone-800 dark:text-stone-100 dark:placeholder:text-stone-500"
      />

      <AppSelect
        v-model="fulfillmentStatus"
        :options="fulfillmentStatusOptions"
        :label="t('orderHistory.filterStatus')"
        :all-option-label="t('orderHistory.allStatuses')"
        class="w-full col-span-6 sm:col-span-4 lg:col-span-4"
      />

      <AppSelect
        v-model="paymentStatus"
        :options="paymentStatusOptions"
        :label="t('orderHistory.filterPayment')"
        :all-option-label="t('orderHistory.allPayments')"
        class="w-full col-span-6 sm:col-span-4 lg:col-span-4"
      />

      <!-- Date presets -->
      <div class="flex flex-col gap-1 col-span-12 sm:col-span-6 lg:col-span-4">
        <label
          class="text-xs font-semibold uppercase tracking-wide text-[#1A1C1C]/50 dark:text-stone-400"
        >
          {{ t('orderHistory.datePreset') }}
        </label>
        <div
          class="flex h-10 w-full shrink-0 divide-x divide-stone-200 overflow-hidden rounded-md bg-stone-50 text-xs font-bold dark:divide-stone-700 dark:bg-stone-800"
        >
          <button
            v-for="preset in ['today', 'yesterday', 'last7Days', 'customRange'] as const"
            :key="preset"
            type="button"
            class="flex h-full flex-1 items-center justify-center whitespace-nowrap px-1 transition-colors hover:bg-stone-100 dark:hover:bg-stone-700/50"
            :class="
              datePreset === preset
                ? 'bg-[#fcf3eb] font-extrabold text-[#b05a18] dark:bg-amber-900/10 dark:text-amber-500'
                : 'text-stone-500 dark:text-stone-400'
            "
            @click="datePreset = preset"
          >
            {{ t(`orderHistory.${preset}`) }}
          </button>
        </div>
      </div>

      <!-- Custom date range -->
      <div
        class="flex flex-col gap-1 col-span-12 sm:col-span-6 lg:col-span-5"
        :class="datePreset === 'customRange' ? 'opacity-100' : 'pointer-events-none opacity-30'"
      >
        <label
          class="text-xs font-semibold uppercase tracking-wide text-[#1A1C1C]/50 dark:text-stone-400"
        >
          {{ t('orderHistory.customRange') }}
        </label>
        <div class="flex h-10 w-full shrink-0 items-center gap-2">
          <input
            v-model="customStartDate"
            type="date"
            :aria-label="t('orderHistory.startDate')"
            class="h-10 min-w-0 flex-1 rounded-md border-none bg-stone-50 px-3 text-sm text-[#1A1C1C] transition-colors focus:outline-none focus:ring-2 focus:ring-primary dark:bg-stone-800 dark:text-stone-100"
          />
          <span class="shrink-0 text-xs font-extrabold text-stone-400">—</span>
          <input
            v-model="customEndDate"
            type="date"
            :aria-label="t('orderHistory.endDate')"
            class="h-10 min-w-0 flex-1 rounded-md border-none bg-stone-50 px-3 text-sm text-[#1A1C1C] transition-colors focus:outline-none focus:ring-2 focus:ring-primary dark:bg-stone-800 dark:text-stone-100"
          />
        </div>
      </div>
    </FilterPanel>

    <!-- ── TABLE SHEET LIST ── -->
    <div
      class="flex-1 overflow-hidden flex flex-col bg-white dark:bg-stone-900 border border-stone-200/60 dark:border-stone-800/60 shadow-sm rounded-3xl"
    >
      <div class="flex-1 overflow-y-auto scrollbar-thin">
        <table class="w-full text-left border-collapse font-semibold text-[13px]">
          <!-- Table Header -->
          <thead
            class="sticky top-0 bg-stone-50 dark:bg-stone-950/60 text-[10px] font-extrabold text-stone-400 uppercase tracking-wider border-b border-stone-200/60 dark:border-stone-800/60 z-10 shrink-0 select-none"
          >
            <tr>
              <th class="py-4 px-6">{{ t('orderHistory.table.dateTime') }}</th>
              <th class="py-4 px-6">{{ t('orderHistory.table.orderId') }}</th>
              <th class="py-4 px-6">{{ t('orderHistory.table.customer') }}</th>
              <th class="py-4 px-6 text-center">{{ t('orderHistory.table.payment') }}</th>
              <th class="py-4 px-6 text-center">{{ t('orderHistory.table.fulfillment') }}</th>
              <th class="py-4 px-6 text-right">{{ t('orderHistory.table.total') }}</th>
            </tr>
          </thead>

          <!-- Table Body -->
          <tbody
            class="divide-y divide-stone-100 dark:divide-stone-800/50 text-stone-700 dark:text-stone-300"
          >
            <tr
              v-for="order in historyOrders"
              :key="order.id"
              class="hover:bg-stone-50/50 dark:hover:bg-stone-800/20 cursor-pointer transition-colors"
              @click="openOrderDetails(order)"
            >
              <td class="py-3.5 px-6 whitespace-nowrap">{{ formatDateTime(order.createdAt) }}</td>
              <td class="py-3.5 px-6 font-bold text-stone-900 dark:text-stone-50 font-headline">
                #{{ order.orderNumber }}
              </td>
              <td class="py-3.5 px-6 capitalize">
                {{ order.customerName || t(`cart.${order.orderType}`) }}
              </td>

              <!-- Payment Status Badge -->
              <td class="py-3.5 px-6 text-center whitespace-nowrap">
                <span
                  class="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase shrink-0"
                  :class="
                    order.paymentStatus === 'paid'
                      ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200/30'
                      : 'bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 border border-amber-200/30'
                  "
                >
                  {{ t(`orderDashboard.${order.paymentStatus}`) }}
                </span>
              </td>

              <!-- Fulfillment Status Badge -->
              <td class="py-3.5 px-6 text-center whitespace-nowrap">
                <span
                  class="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase shrink-0"
                  :class="[
                    order.fulfillmentStatus === 'preparing'
                      ? 'bg-[#fcf3eb] text-[#b05a18] border border-orange-200/30'
                      : '',
                    order.fulfillmentStatus === 'ready'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200/30'
                      : '',
                    order.fulfillmentStatus === 'completed'
                      ? 'bg-teal-50 text-teal-800 border border-teal-200/30'
                      : '',
                    order.fulfillmentStatus === 'canceled'
                      ? 'bg-rose-50 text-rose-800 border border-rose-200/30'
                      : '',
                  ]"
                >
                  {{ t(`orderDashboard.${order.fulfillmentStatus}`) }}
                </span>
              </td>

              <!-- Total price -->
              <td
                class="py-3.5 px-6 text-right font-extrabold text-stone-900 dark:text-stone-50 font-headline"
              >
                {{ formatOrderTotal(order) }}
              </td>
            </tr>

            <!-- Table empty state -->
            <tr v-if="historyOrders.length === 0 && !loading">
              <td colspan="6" class="py-24">
                <div
                  class="flex flex-col items-center justify-center text-center text-stone-400 font-semibold gap-3"
                >
                  <span class="material-symbols-outlined text-4xl" data-icon="inbox">inbox</span>
                  <span>{{ t('orderHistory.noHistory') }}</span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- ── TABLE PAGINATION FOOTER ── -->
      <footer
        class="p-4 border-t border-stone-100 dark:border-stone-800 shrink-0 flex items-center justify-between text-xs font-bold text-stone-400 select-none bg-stone-50/40"
      >
        <div>
          {{
            t('orders.paginationShowing', {
              start: (page - 1) * limit + (historyOrders.length > 0 ? 1 : 0),
              end: (page - 1) * limit + historyOrders.length,
              total: historyPagination.total,
            })
          }}
        </div>

        <div class="flex items-center gap-2">
          <button
            class="p-2 border border-stone-200 dark:border-stone-800 rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors disabled:opacity-40 disabled:pointer-events-none active:scale-95 shrink-0 flex"
            :disabled="page <= 1 || loading"
            @click="page--"
          >
            <span class="material-symbols-outlined text-base">chevron_left</span>
          </button>
          <span class="px-2 text-stone-800 dark:text-stone-200">
            {{ t('orders.pageOf', { page, totalPages: historyPagination.totalPages }) }}
          </span>
          <button
            class="p-2 border border-stone-200 dark:border-stone-800 rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors disabled:opacity-40 disabled:pointer-events-none active:scale-95 shrink-0 flex"
            :disabled="page >= historyPagination.totalPages || loading"
            @click="page++"
          >
            <span class="material-symbols-outlined text-base">chevron_right</span>
          </button>
        </div>
      </footer>
    </div>

    <!-- ── DRAG SHEET DETAIL REVIEW (Selected Order Drawer) ── -->
    <transition name="slide">
      <section
        v-if="selectedOrder"
        class="print:block absolute inset-y-0 right-0 w-full md:w-[480px] bg-white dark:bg-stone-900 border-l border-stone-200 dark:border-stone-800 shadow-2xl z-40 flex flex-col transition-all duration-300 overflow-hidden print:static print:w-full print:h-auto print:border-0 print:shadow-none"
      >
        <!-- Drawer Header -->
        <header
          class="p-6 border-b border-stone-100 dark:border-stone-800 shrink-0 flex items-center justify-between print:hidden"
        >
          <button
            class="flex items-center gap-1.5 py-2 pr-4 text-stone-500 hover:text-[#b05a18] font-bold text-sm transition-colors cursor-pointer group active:scale-95"
            @click="closeOrderDetails"
          >
            <span
              class="material-symbols-outlined text-xl transition-transform group-hover:-translate-x-0.5"
              >arrow_back</span
            >
            {{ t('orderDashboard.backToOrders') }}
          </button>

          <button
            class="flex items-center gap-2 py-2 px-4 border border-stone-200 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-800/50 rounded-2xl font-bold text-sm tracking-wide transition-colors cursor-pointer active:scale-95"
            @click="handlePrint"
          >
            <span class="material-symbols-outlined text-lg leading-none">print</span>
            {{ t('orderHistory.reprintReceipt') }}
          </button>
        </header>

        <!-- Receipt Print and Review wrapper -->
        <div
          class="flex-1 overflow-y-auto p-6 flex flex-col gap-6 scrollbar-thin print:p-0 print:overflow-visible"
        >
          <div class="text-center print:border-b print:pb-6 shrink-0">
            <p class="hidden print:block font-bold text-lg text-stone-800">
              {{ t('settings.receiptPreview.fallbackShopName') }}
            </p>
            <p class="hidden print:block text-xs text-stone-500 mt-1">
              {{ t('sidebar.station') }} • {{ t('orderDashboard.station') }}
            </p>

            <h2
              class="font-extrabold text-2xl text-stone-800 dark:text-stone-50 font-headline mt-4 print:mt-6"
            >
              #{{ selectedOrder.orderNumber }}
            </h2>
            <p
              class="text-xs text-stone-400 dark:text-stone-500 font-bold uppercase tracking-wider mt-1"
            >
              {{
                selectedOrder.createdAt ? new Date(selectedOrder.createdAt).toLocaleString() : ''
              }}
            </p>
          </div>

          <!-- Order Metadata Cards -->
          <div
            class="grid grid-cols-2 gap-4 shrink-0 print:grid-cols-4 print:border-y print:py-4 print:my-2"
          >
            <div
              class="p-4 rounded-2xl bg-stone-50 dark:bg-stone-900/50 border border-stone-100 dark:border-stone-800/40 print:p-0 print:border-0 print:bg-transparent"
            >
              <p class="text-[10px] font-bold text-stone-400 uppercase tracking-wide">
                {{ t('orderDashboard.orderType') }}
              </p>
              <p class="font-extrabold text-sm text-stone-700 dark:text-stone-300 mt-1 capitalize">
                {{ t(`cart.${selectedOrder.orderType}`) }}
              </p>
            </div>

            <div
              class="p-4 rounded-2xl bg-stone-50 dark:bg-stone-900/50 border border-stone-100 dark:border-stone-800/40 print:p-0 print:border-0 print:bg-transparent"
            >
              <p class="text-[10px] font-bold text-stone-400 uppercase tracking-wide">
                {{ t('orderDashboard.stationLabel') }}
              </p>
              <p class="font-extrabold text-sm text-stone-700 dark:text-stone-300 mt-1 uppercase">
                {{ t('sidebar.station') }}
              </p>
            </div>

            <div
              class="p-4 rounded-2xl bg-stone-50 dark:bg-stone-900/50 border border-stone-100 dark:border-stone-800/40 print:p-0 print:border-0 print:bg-transparent"
            >
              <p class="text-[10px] font-bold text-stone-400 uppercase tracking-wide">
                {{ t('orderDashboard.totalItems') }}
              </p>
              <p class="font-extrabold text-sm text-stone-700 dark:text-stone-300 mt-1">
                {{ getSelectedOrderTotalQty }} {{ t('orderDashboard.items') }}
              </p>
            </div>

            <div
              class="p-4 rounded-2xl bg-[#fcf3eb] dark:bg-amber-950/10 border border-orange-100 dark:border-amber-950/20 print:p-0 print:border-0 print:bg-transparent"
            >
              <p
                class="text-[10px] font-bold text-[#b05a18] dark:text-amber-500 uppercase tracking-wide"
              >
                {{ t('orderDashboard.totalPrice') }}
              </p>
              <p
                class="font-extrabold text-sm text-[#b05a18] dark:text-amber-500 mt-1 font-headline"
              >
                {{ formatOrderTotal(selectedOrder) }}
              </p>
            </div>
          </div>

          <!-- Items list -->
          <div class="flex-1 flex flex-col gap-4">
            <h3
              class="font-extrabold text-sm text-stone-400 dark:text-stone-500 uppercase tracking-wider shrink-0 print:border-b print:pb-2"
            >
              {{ t('orderDashboard.items') }}
            </h3>

            <div class="flex flex-col gap-4 print:gap-3">
              <div
                v-for="item in selectedOrder.items"
                :key="item.id"
                class="flex items-start gap-4 border-b border-stone-100 dark:border-stone-800 pb-4 last:border-0 last:pb-0"
              >
                <!-- Thumbnail -->
                <div
                  v-if="item.product?.imageUrl"
                  class="w-12 h-12 rounded-xl bg-stone-100 dark:bg-stone-800 shrink-0 overflow-hidden print:hidden"
                >
                  <img
                    :src="item.product.imageUrl"
                    class="w-full h-full object-cover"
                    :alt="t('product.thumbnailAlt')"
                  />
                </div>
                <div
                  v-else
                  class="w-12 h-12 rounded-xl bg-stone-100 dark:bg-stone-800 shrink-0 flex items-center justify-center text-stone-300 dark:text-stone-600 print:hidden"
                >
                  <span class="material-symbols-outlined text-2xl">local_cafe</span>
                </div>

                <div class="flex-1 min-w-0">
                  <div class="flex justify-between items-start">
                    <p
                      class="font-bold text-stone-800 dark:text-stone-100 text-[15px] leading-tight"
                    >
                      {{ item.product?.name }}
                    </p>
                    <p class="font-bold text-stone-700 dark:text-stone-300 text-xs shrink-0 pl-2">
                      {{
                        shopSettingsStore.formatAmount(Number(item.price) + Number(item.extraPrice))
                      }}
                    </p>
                  </div>

                  <p class="text-xs text-stone-500 font-extrabold mt-1">
                    {{ t('cart.quantity') }} : {{ item.quantity }}
                  </p>

                  <ul
                    v-if="item.options && item.options.length > 0"
                    class="mt-2 flex flex-col gap-1 print:mt-1"
                  >
                    <li
                      v-for="option in item.options"
                      :key="option.id"
                      class="flex items-center justify-between text-xs text-stone-400 dark:text-stone-500 font-semibold"
                    >
                      <span class="flex items-center gap-1">
                        <span
                          class="inline-block w-1 h-1 rounded-full bg-stone-300 dark:bg-stone-600 shrink-0"
                        ></span>
                        {{ option.groupName }}: {{ option.optionName }}
                      </span>
                      <span
                        v-if="Number(option.extraPrice) > 0"
                        class="text-stone-400 font-medium shrink-0"
                      >
                        +{{ shopSettingsStore.formatAmount(Number(option.extraPrice)) }}
                      </span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <!-- Payment Summary -->
          <div
            class="border-t border-stone-100 dark:border-stone-800 pt-6 shrink-0 print:border-t-2 print:border-dashed print:mt-4 print:pt-4"
          >
            <h3
              class="font-extrabold text-sm text-stone-400 dark:text-stone-500 uppercase tracking-wider mb-4 print:mb-2"
            >
              {{ t('orderDashboard.paymentSummary') }}
            </h3>

            <div
              class="flex flex-col gap-2 font-semibold text-sm text-stone-600 dark:text-stone-400 print:gap-1.5 print:text-xs"
            >
              <div class="flex justify-between">
                <span>{{ t('orderDashboard.subtotal') }}</span>
                <span class="text-stone-800 dark:text-stone-200">{{
                  shopSettingsStore.formatAmount(
                    Number(selectedOrder.totalAmount) + Number(selectedOrder.discountAmount || 0)
                  )
                }}</span>
              </div>
              <div class="flex justify-between">
                <span>{{ t('orderDashboard.discount') }}</span>
                <span
                  :class="
                    Number(selectedOrder.discountAmount) > 0
                      ? 'text-emerald-600 dark:text-emerald-500'
                      : 'text-stone-800 dark:text-stone-200'
                  "
                >
                  {{ Number(selectedOrder.discountAmount) > 0 ? '−' : ''
                  }}{{ shopSettingsStore.formatAmount(Number(selectedOrder.discountAmount || 0)) }}
                </span>
              </div>
              <!-- Per-promotion breakdown (promotions stack across items) -->
              <div
                v-for="ap in selectedOrder.appliedPromotions"
                :key="ap.promotionId"
                class="flex justify-between pl-4 text-[11px] font-medium text-stone-400 dark:text-stone-500"
              >
                <span class="truncate max-w-[170px]">· {{ ap.promotion.name }}</span>
                <span>−{{ shopSettingsStore.formatAmount(Number(ap.discountAmount)) }}</span>
              </div>
              <!-- Fallback for older orders saved before the breakdown existed -->
              <div
                v-if="
                  (!selectedOrder.appliedPromotions ||
                    selectedOrder.appliedPromotions.length === 0) &&
                  selectedOrder.promotion?.name &&
                  Number(selectedOrder.discountAmount) > 0
                "
                class="flex justify-between pl-4 text-[11px] font-medium text-stone-400 dark:text-stone-500"
              >
                <span class="truncate max-w-[170px]">· {{ selectedOrder.promotion.name }}</span>
                <span
                  >−{{ shopSettingsStore.formatAmount(Number(selectedOrder.discountAmount)) }}</span
                >
              </div>
              <div class="flex justify-between">
                <span>{{ t('orderDashboard.serviceFee') }}</span>
                <span class="text-stone-800 dark:text-stone-200">{{
                  shopSettingsStore.formatAmount(0)
                }}</span>
              </div>
              <div
                class="flex justify-between font-extrabold text-lg text-[#b05a18] dark:text-amber-500 pt-3 border-t border-stone-100 dark:border-stone-800 print:text-sm print:pt-2"
              >
                <span>{{ t('orderDashboard.total') }}</span>
                <span class="font-headline">{{ formatOrderTotal(selectedOrder) }}</span>
              </div>
            </div>
          </div>

          <!-- Change Status Action (Only shown when Order Management page is disabled) -->
          <div
            v-if="!shopSettingsStore.is_order_management_enabled"
            class="border-t border-stone-100 dark:border-stone-800 pt-6 shrink-0 print:hidden flex flex-col gap-3"
          >
            <h4
              class="font-extrabold text-sm text-stone-400 dark:text-stone-500 uppercase tracking-wider"
            >
              {{ t('orderDashboard.changeStatus') }}
            </h4>
            <div class="flex gap-3">
              <button
                class="flex-1 py-3 px-5 rounded-2xl font-bold text-sm tracking-wide text-white transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                :class="
                  selectedOrder.fulfillmentStatus === 'completed'
                    ? confirmCancelActive
                      ? 'bg-amber-600 hover:bg-amber-700 shadow-sm animate-pulse'
                      : 'bg-rose-600 hover:bg-rose-700 shadow-sm'
                    : 'bg-emerald-600 hover:bg-emerald-700 shadow-sm'
                "
                @click="handleToggleFulfillmentStatus"
              >
                <span class="material-symbols-outlined text-[18px]">
                  {{
                    selectedOrder.fulfillmentStatus === 'completed'
                      ? confirmCancelActive
                        ? 'warning'
                        : 'cancel'
                      : 'done_all'
                  }}
                </span>
                {{
                  selectedOrder.fulfillmentStatus === 'completed'
                    ? confirmCancelActive
                      ? t('orderHistory.actions.confirmCancel')
                      : t('orderHistory.actions.cancelOrder')
                    : t('orderHistory.actions.completeOrder')
                }}
              </button>
            </div>
          </div>

          <div
            class="hidden print:block text-center mt-12 border-t pt-4 text-[10px] text-stone-400 font-medium"
          >
            <p>{{ t('auth.copyright') }}</p>
            <p class="mt-1">{{ t('checkout.thankYou') }}</p>
          </div>
        </div>
      </section>
    </transition>

    <!-- Drawer Backdrop Overlay -->
    <transition name="fade">
      <div
        v-if="selectedOrder"
        class="absolute inset-0 bg-stone-900/10 dark:bg-stone-950/30 backdrop-blur-[2px] z-35 transition-opacity print:hidden"
        @click="closeOrderDetails"
      ></div>
    </transition>
  </div>
</template>

<style scoped>
.slide-enter-active,
.slide-leave-active {
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.slide-enter-from,
.slide-leave-to {
  transform: translateX(100%);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Printing styles for thermal receipt */
@media print {
  .receipt-print-wrapper * {
    visibility: hidden;
  }

  .receipt-print-wrapper .print\:block,
  .receipt-print-wrapper .print\:block * {
    visibility: visible;
  }

  .receipt-print-wrapper {
    position: absolute;
    left: 0;
    top: 0;
    width: 80mm;
  }

  .print\:block {
    position: relative;
  }
}
</style>
