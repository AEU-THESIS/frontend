<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useOrderStore } from '@/store/useOrderStore'
import { storeToRefs } from 'pinia'
import type { OrderDetail, OrderItemDetail } from '@/types/order.types'
import { toast } from 'vue-sonner'
import { useShopSettingsStore } from '@/store/useShopSettingsStore'
import { roundRielUp } from '@/utils/money'
import { formatDateTime } from '@/utils/datetime'
import AppSelect from '@/components/ui/select/AppSelect.vue'
import FilterPanel from '@/components/common/FilterPanel.vue'
import { AppInput } from '@/components/ui/input'
import CancelActionDialog from '@/components/order/CancelActionDialog.vue'
import BlockCustomerDialog from '@/components/order/BlockCustomerDialog.vue'
import { useAuthStore } from '@/store/useAuthStore'
import { ROLES } from '@/constants/roles'
import { cashierName } from '@/utils/cashier'

const { t } = useI18n()
const orderStore = useOrderStore()
const shopSettingsStore = useShopSettingsStore()
const authStore = useAuthStore()
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

// Marks the signed-in user's own rows so a cashier can spot their sales at a glance
// in a list that mixes every cashier's orders.
const isOwnOrder = (order: OrderDetail) => {
  const currentUserId = authStore.user?.user_id ?? authStore.user?.id
  return currentUserId != null && order.user?.id === currentUserId
}

// ── Void / cancel-item action state ───────────────────────────────
const voidDialogOpen = ref(false)
const cancelItemDialogOpen = ref(false)
const pendingCancelItemId = ref<number | null>(null)
const actionBusy = ref(false)

// A fully-voided (refunded) order can no longer be voided or have items cancelled.
const orderFullyReversed = computed(() => selectedOrder.value?.paymentStatus === 'refunded')

// Money can only be reversed on an order that actually collected money.
const canReverseMoney = computed(() => {
  const status = selectedOrder.value?.paymentStatus
  return status === 'paid' || status === 'partially_refunded'
})

const isItemCancelled = (item: OrderItemDetail) => item.canceledAt != null

// Whether an order carries at least one complimentary (loyalty-stamp) line — drives
// the "Free" badge in the list and detail drawer.
const orderHasComp = (order: OrderDetail) => order.items.some(item => item.isComplimentary)

// Total refunded so far, summed from the reversing (negative-amount) transactions and
// shown in the order's own payment currency.
const refundedDisplay = computed(() => {
  const order = selectedOrder.value
  if (!order?.transactions?.length) return null
  const refunded = order.transactions.reduce(
    (sum, txn) =>
      Number(txn.amount) < 0 && txn.currency === order.paymentCurrency
        ? sum + -Number(txn.amount)
        : sum,
    0
  )
  if (refunded <= 0) return null
  return order.paymentCurrency === 'KHR'
    ? `${refunded.toLocaleString()}៛`
    : `$${refunded.toFixed(2)}`
})

const voidedByLabel = computed(() => {
  const order = selectedOrder.value
  if (!order?.voidedBy || !order.voidedAt) return null
  return t('orderActions.voidedBy', {
    name: order.voidedBy.name,
    time: formatDateTime(order.voidedAt),
  })
})

// ── 1. Search and Filtering States ────────────────────────────────
const search = ref('')
const fulfillmentStatus = ref('all')
// Payment-status filter. The special value 'comp' is a reconciliation filter that
// matches any order containing a complimentary line (incl. mixed paid+free orders),
// not the literal payment_status enum — see fetchHistory below.
const paymentStatus = ref('all')
const page = ref(1)
const limit = ref(10)

const fulfillmentStatusOptions = computed(() => [
  { value: 'preparing', label: t('orderDashboard.preparing') },
  { value: 'ready', label: t('orderDashboard.ready') },
  { value: 'completed', label: t('orderDashboard.completed') },
  { value: 'canceled', label: t('orderDashboard.canceled') },
  { value: 'rejected', label: t('orderDashboard.rejected') },
])

const paymentStatusOptions = computed(() => [
  { value: 'paid', label: t('orderDashboard.paid') },
  { value: 'unpaid', label: t('orderDashboard.unpaid') },
  // Reconciliation filter: any order with a free/loyalty-stamp line (see fetchHistory).
  { value: 'comp', label: t('orderHistory.compFree') },
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
  // 'comp' is a reconciliation pseudo-status: filter by presence of a free line
  // (hasComp) rather than the literal payment_status, so mixed paid+free orders match too.
  const isCompFilter = paymentStatus.value === 'comp'
  await orderStore.fetchHistoryOrders({
    search: search.value.trim() || undefined,
    status: fulfillmentStatus.value !== 'all' ? fulfillmentStatus.value : undefined,
    paymentStatus: paymentStatus.value !== 'all' && !isCompFilter ? paymentStatus.value : undefined,
    hasComp: isCompFilter ? true : undefined,
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

// ── 5. Detail Modal side sheet triggers ───────────────────────────
const openOrderDetails = async (order: OrderDetail) => {
  await orderStore.fetchSingleOrderDetail(order.id)
}

const closeOrderDetails = () => {
  selectedOrder.value = null
}

const getSelectedOrderTotalQty = computed(() => {
  if (!selectedOrder.value) return 0
  return selectedOrder.value.items.reduce((sum, item) => sum + item.quantity, 0)
})

const handlePrint = () => {
  window.print()
}

// ── Void & cancel-item actions (both reverse money server-side) ────
const openVoidDialog = () => {
  voidDialogOpen.value = true
}

const confirmVoid = async (reason?: string) => {
  if (!selectedOrder.value) return
  actionBusy.value = true
  try {
    await orderStore.voidOrder(selectedOrder.value.id, reason)
    toast.success(t('orderActions.orderVoided'))
    voidDialogOpen.value = false
    fetchHistory()
  } catch {
    toast.error(t('orderActions.actionFailed'))
  } finally {
    actionBusy.value = false
  }
}

const openCancelItemDialog = (itemId: number) => {
  pendingCancelItemId.value = itemId
  cancelItemDialogOpen.value = true
}

const confirmCancelItem = async () => {
  if (!selectedOrder.value || pendingCancelItemId.value == null) return
  actionBusy.value = true
  try {
    await orderStore.cancelItem(selectedOrder.value.id, pendingCancelItemId.value)
    toast.success(t('orderActions.itemCanceled'))
    cancelItemDialogOpen.value = false
    pendingCancelItemId.value = null
    fetchHistory()
  } catch {
    toast.error(t('orderActions.actionFailed'))
  } finally {
    actionBusy.value = false
  }
}

// ── Pre-order actions in the detail panel ─────────────────────────
// Shown ONLY when Order Management is OFF — otherwise pre-orders are handled on
// the Order Management board. Accept moves pending → preparing; then staff advance
// the status step by step; Reject declines the (unpaid) pre-order.
const isPreOrderActionable = computed(
  () =>
    !shopSettingsStore.is_order_management_enabled && selectedOrder.value?.orderType === 'pre_order'
)

const preOrderMapsLink = computed<string | null>(() => {
  const o = selectedOrder.value
  return o && o.deliveryLat != null && o.deliveryLng != null
    ? `https://maps.google.com/?q=${o.deliveryLat},${o.deliveryLng}`
    : null
})

// The next fulfillment step for an accepted pre-order, or null if none/terminal.
const preOrderNextStatus = computed<{ value: string; label: string } | null>(() => {
  switch (selectedOrder.value?.fulfillmentStatus) {
    case 'preparing':
      return { value: 'ready', label: t('orderDashboard.ready') }
    case 'ready':
      return { value: 'completed', label: t('orderDashboard.completed') }
    default:
      return null
  }
})

const rejectDialogOpen = ref(false)

// Block customer (Admin/Manager only) — anti-spam. Available for any pre-order
// carrying a Telegram identity, regardless of its status.
const blockDialogOpen = ref(false)
const canBlockCustomer = computed(() => {
  const role = authStore.user?.role
  const o = selectedOrder.value
  return (
    (role === ROLES.ADMIN || role === ROLES.MANAGER) &&
    o?.orderType === 'pre_order' &&
    !!o?.telegramUserId
  )
})

const acceptPreOrder = async () => {
  if (!selectedOrder.value) return
  actionBusy.value = true
  try {
    await orderStore.changeStatus(selectedOrder.value.id, 'preparing')
    toast.success(t('preOrders.accepted'))
    fetchHistory()
  } catch {
    toast.error(t('orderActions.actionFailed'))
  } finally {
    actionBusy.value = false
  }
}

const advancePreOrder = async () => {
  if (!selectedOrder.value || !preOrderNextStatus.value) return
  actionBusy.value = true
  try {
    await orderStore.changeStatus(selectedOrder.value.id, preOrderNextStatus.value.value)
    toast.success(t('orderDashboard.statusUpdated'))
    fetchHistory()
  } catch {
    toast.error(t('orderActions.actionFailed'))
  } finally {
    actionBusy.value = false
  }
}

const confirmRejectPreOrder = async () => {
  if (!selectedOrder.value) return
  actionBusy.value = true
  try {
    await orderStore.rejectPreOrder(selectedOrder.value.id)
    toast.success(t('preOrders.rejected'))
    rejectDialogOpen.value = false
    fetchHistory()
  } catch {
    toast.error(t('orderActions.actionFailed'))
  } finally {
    actionBusy.value = false
  }
}
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
              <th class="py-4 px-6">{{ t('orderHistory.table.cashier') }}</th>
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
                <span class="inline-flex items-center gap-1.5">
                  #{{ order.orderNumber }}
                  <span
                    v-if="orderHasComp(order)"
                    class="inline-flex items-center rounded-md bg-emerald-50 px-1.5 py-px text-[9px] font-bold uppercase tracking-wide text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400"
                  >
                    {{ t('orderHistory.freeBadge') }}
                  </span>
                </span>
              </td>
              <td class="py-3.5 px-6 capitalize">
                {{ order.customerName || t(`cart.${order.orderType}`) }}
              </td>

              <!-- Cashier who took the order ("System" when none was recorded) -->
              <td class="py-3.5 px-6 whitespace-nowrap">
                <span class="inline-flex items-center gap-1.5">
                  {{ cashierName(order.user, t('common.systemCashier')) }}
                  <span
                    v-if="isOwnOrder(order)"
                    class="rounded-full bg-[#fcf3eb] px-1.5 py-px text-[9px] font-extrabold uppercase tracking-wide text-[#b05a18] dark:bg-amber-950/20 dark:text-amber-500"
                  >
                    {{ t('orderHistory.table.you') }}
                  </span>
                </span>
              </td>

              <!-- Payment Status Badge -->
              <td class="py-3.5 px-6 text-center whitespace-nowrap">
                <span
                  class="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase shrink-0 border"
                  :class="{
                    'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border-emerald-200/30':
                      order.paymentStatus === 'paid',
                    'bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400 border-rose-200/30':
                      order.paymentStatus === 'refunded',
                    'bg-indigo-50 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-400 border-indigo-200/30':
                      order.paymentStatus === 'comp',
                    'bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 border-amber-200/30':
                      order.paymentStatus !== 'paid' &&
                      order.paymentStatus !== 'refunded' &&
                      order.paymentStatus !== 'comp',
                  }"
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
                    order.fulfillmentStatus === 'rejected'
                      ? 'bg-stone-100 text-stone-600 border border-stone-200/60 dark:bg-stone-800 dark:text-stone-300'
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
              <td colspan="7" class="py-24">
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
                {{ t('orderHistory.cashier') }}
              </p>
              <p
                class="font-extrabold text-sm text-stone-700 dark:text-stone-300 mt-1 truncate"
                :title="cashierName(selectedOrder.user, t('common.systemCashier'))"
              >
                {{ cashierName(selectedOrder.user, t('common.systemCashier')) }}
              </p>
            </div>

            <div
              class="p-4 rounded-2xl bg-stone-50 dark:bg-stone-900/50 border border-stone-100 dark:border-stone-800/40 print:p-0 print:border-0 print:bg-transparent"
            >
              <p class="text-[10px] font-bold text-stone-400 uppercase tracking-wide">
                {{ t('orderHistory.paymentMethod') }}
              </p>
              <p
                class="font-extrabold text-sm text-stone-700 dark:text-stone-300 mt-1 uppercase truncate"
              >
                {{ selectedOrder.paymentMethod
                }}<template v-if="selectedOrder.paymentMethod === 'khqr' && selectedOrder.bankName">
                  — {{ selectedOrder.bankName }}</template
                >
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
                :class="{ 'opacity-70': isItemCancelled(item) }"
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
                  <div class="flex justify-between items-start gap-2">
                    <p
                      class="font-bold text-stone-800 dark:text-stone-100 text-[15px] leading-tight"
                      :class="{
                        'line-through text-stone-400 dark:text-stone-600': isItemCancelled(item),
                      }"
                    >
                      {{ item.product?.name }}
                      <span
                        v-if="isItemCancelled(item)"
                        class="ml-1 inline-block align-middle rounded-full bg-rose-50 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-rose-600 no-underline dark:bg-rose-950/30 dark:text-rose-400"
                      >
                        {{ t('orderActions.cancelledBadge') }}
                      </span>
                      <span
                        v-if="item.isComplimentary"
                        class="ml-1 inline-flex items-center gap-0.5 align-middle rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-emerald-700 no-underline dark:bg-emerald-950/30 dark:text-emerald-400"
                      >
                        <span class="material-symbols-outlined text-[11px] leading-none"
                          >loyalty</span
                        >
                        {{ t('cart.free') }}
                      </span>
                    </p>
                    <p
                      class="font-bold text-stone-700 dark:text-stone-300 text-xs shrink-0 pl-2"
                      :class="{
                        'line-through text-stone-400 dark:text-stone-600':
                          isItemCancelled(item) || item.isComplimentary,
                      }"
                    >
                      {{
                        shopSettingsStore.formatAmount(Number(item.price) + Number(item.extraPrice))
                      }}
                    </p>
                  </div>

                  <p class="text-xs text-stone-500 font-extrabold mt-1">
                    {{ t('cart.quantity') }} : {{ item.quantity }}
                  </p>

                  <!-- Complimentary line note (audit trail: why it was free) -->
                  <p
                    v-if="item.isComplimentary"
                    class="mt-1 flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-500"
                  >
                    <span class="material-symbols-outlined text-[13px] leading-none">redeem</span>
                    {{ t('cart.freeLoyaltyStamp') }}
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

                  <!-- Per-line cancel control (reverses money for just this line) -->
                  <button
                    v-if="!isItemCancelled(item) && canReverseMoney"
                    type="button"
                    class="mt-2 inline-flex items-center gap-1 rounded-lg border border-rose-200 px-2.5 py-1 text-[11px] font-bold text-rose-600 transition-colors hover:bg-rose-50 active:scale-95 dark:border-rose-900/40 dark:text-rose-400 dark:hover:bg-rose-950/30 print:hidden"
                    @click="openCancelItemDialog(item.id)"
                  >
                    <span class="material-symbols-outlined text-[14px] leading-none"
                      >remove_shopping_cart</span
                    >
                    {{ t('orderActions.cancelItem') }}
                  </button>
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

              <!-- Reversed (refunded) amount when the order was voided / had items cancelled -->
              <div
                v-if="refundedDisplay"
                class="flex justify-between font-bold text-rose-600 dark:text-rose-500"
              >
                <span>{{ t('orderActions.refundedLine') }}</span>
                <span>−{{ refundedDisplay }}</span>
              </div>
              <!-- Who voided the order, and when -->
              <p
                v-if="voidedByLabel"
                class="pt-1 text-[11px] font-semibold text-stone-400 dark:text-stone-500"
              >
                {{ voidedByLabel }}
              </p>
            </div>
          </div>

          <!-- Pre-order actions — shown only when Order Management is OFF (otherwise
               pre-orders are handled on the Order Management board). Accept/Reject
               while pending; advance the status once accepted. -->
          <div
            v-if="
              isPreOrderActionable &&
              ['pending', 'preparing', 'ready'].includes(selectedOrder.fulfillmentStatus)
            "
            class="border-t border-stone-100 dark:border-stone-800 pt-6 shrink-0 print:hidden flex flex-col gap-3"
          >
            <!-- Contact shortcuts -->
            <div
              v-if="
                selectedOrder.customerPhone || selectedOrder.telegramUsername || preOrderMapsLink
              "
              class="flex flex-wrap items-center gap-2 text-xs font-bold"
            >
              <a
                v-if="selectedOrder.customerPhone"
                :href="`tel:${selectedOrder.customerPhone}`"
                class="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2.5 py-1 text-stone-600 dark:bg-stone-800 dark:text-stone-300"
              >
                <span class="material-symbols-outlined text-[14px] leading-none">call</span
                >{{ selectedOrder.customerPhone }}
              </a>
              <a
                v-if="selectedOrder.telegramUsername"
                :href="`https://t.me/${selectedOrder.telegramUsername}`"
                target="_blank"
                rel="noopener"
                class="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2.5 py-1 text-sky-700 dark:bg-sky-950/30 dark:text-sky-400"
              >
                <span class="material-symbols-outlined text-[14px] leading-none">send</span>@{{
                  selectedOrder.telegramUsername
                }}
              </a>
              <a
                v-if="preOrderMapsLink"
                :href="preOrderMapsLink"
                target="_blank"
                rel="noopener"
                class="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400"
              >
                <span class="material-symbols-outlined text-[14px] leading-none">location_on</span
                >{{ t('preOrders.map') }}
              </a>
            </div>

            <!-- Pending → Accept / Reject -->
            <div v-if="selectedOrder.fulfillmentStatus === 'pending'" class="flex gap-2">
              <button
                type="button"
                :disabled="actionBusy"
                class="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl bg-amber-600 py-3 px-5 text-sm font-bold text-white shadow-sm transition-all hover:bg-amber-700 active:scale-[0.98] disabled:opacity-60"
                @click="acceptPreOrder"
              >
                <span class="material-symbols-outlined text-[18px]">check_circle</span>
                {{ t('preOrders.accept') }}
              </button>
              <button
                type="button"
                :disabled="actionBusy"
                class="inline-flex items-center justify-center rounded-2xl border border-stone-200 px-5 py-3 text-sm font-bold text-stone-600 transition-all hover:bg-stone-50 active:scale-95 disabled:opacity-60 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800"
                @click="rejectDialogOpen = true"
              >
                {{ t('preOrders.reject') }}
              </button>
            </div>

            <!-- Accepted → advance to the next status -->
            <button
              v-else-if="preOrderNextStatus"
              type="button"
              :disabled="actionBusy"
              class="flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 py-3 px-5 text-sm font-bold text-white shadow-sm transition-all hover:bg-emerald-700 active:scale-[0.98] disabled:opacity-60"
              @click="advancePreOrder"
            >
              <span class="material-symbols-outlined text-[18px]">arrow_forward</span>
              {{ t('orderActions.markAs', { status: preOrderNextStatus.label }) }}
            </button>
          </div>

          <!-- Void action — always available. Voiding reverses the money (refund +
               un-redeem promotions) so reports match the real cash drawer. -->
          <div
            class="border-t border-stone-100 dark:border-stone-800 pt-6 shrink-0 print:hidden flex flex-col gap-3"
          >
            <button
              v-if="canReverseMoney"
              type="button"
              :disabled="actionBusy"
              class="flex items-center justify-center gap-2 rounded-2xl bg-rose-600 py-3 px-5 text-sm font-bold tracking-wide text-white shadow-sm transition-all hover:bg-rose-700 active:scale-[0.98] disabled:opacity-60"
              @click="openVoidDialog"
            >
              <span class="material-symbols-outlined text-[18px]">cancel</span>
              {{ t('orderActions.voidOrder') }}
            </button>
            <div
              v-else-if="orderFullyReversed"
              class="flex items-center gap-2 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-bold text-rose-600 dark:bg-rose-950/20 dark:text-rose-400"
            >
              <span class="material-symbols-outlined text-[18px]">block</span>
              {{ t('orderActions.voidedNotice') }}
            </div>
          </div>

          <!-- Block customer (Admin/Manager) — anti-spam for pre-orders. -->
          <div
            v-if="canBlockCustomer"
            class="border-t border-stone-100 dark:border-stone-800 pt-4 shrink-0 print:hidden"
          >
            <button
              type="button"
              class="flex w-full items-center justify-center gap-2 rounded-2xl border border-rose-200 py-2.5 text-sm font-bold text-rose-600 transition-all hover:bg-rose-50 active:scale-[0.98] dark:border-rose-900/40 dark:text-rose-400 dark:hover:bg-rose-950/30"
              @click="blockDialogOpen = true"
            >
              <span class="material-symbols-outlined text-[18px]">block</span>
              {{ t('blockedCustomers.blockCustomer') }}
            </button>
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

    <!-- Void confirmation (with optional reason) -->
    <CancelActionDialog
      v-model:open="voidDialogOpen"
      :title="t('orderActions.voidTitle')"
      :message="t('orderActions.voidMessage')"
      :confirm-label="t('orderActions.voidConfirm')"
      :cancel-label="t('orderActions.keep')"
      :reason-placeholder="t('orderActions.voidReasonPlaceholder')"
      with-reason
      :busy="actionBusy"
      @confirm="confirmVoid"
    />

    <!-- Cancel-item confirmation -->
    <CancelActionDialog
      v-model:open="cancelItemDialogOpen"
      :title="t('orderActions.cancelItemTitle')"
      :message="t('orderActions.cancelItemMessage')"
      :confirm-label="t('orderActions.cancelItemConfirm')"
      :cancel-label="t('orderActions.keep')"
      :busy="actionBusy"
      @confirm="confirmCancelItem"
    />

    <!-- Reject pre-order confirmation (unpaid — no refund needed) -->
    <CancelActionDialog
      v-model:open="rejectDialogOpen"
      :title="t('preOrders.reject')"
      :message="t('preOrders.confirmReject')"
      :confirm-label="t('preOrders.reject')"
      :cancel-label="t('orderActions.keep')"
      :busy="actionBusy"
      @confirm="confirmRejectPreOrder"
    />

    <!-- Block customer dialog (forever / until date-time) -->
    <BlockCustomerDialog
      v-model:open="blockDialogOpen"
      :telegram-user-id="selectedOrder?.telegramUserId ?? null"
      :telegram-username="selectedOrder?.telegramUsername ?? null"
    />
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
