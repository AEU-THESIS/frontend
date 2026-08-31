<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useOrderStore } from '@/store/useOrderStore'
import { storeToRefs } from 'pinia'
import type { OrderDetail, OrderItemDetail } from '@/types/order.types'
import { toast } from 'vue-sonner'
import { useShopSettingsStore } from '@/store/useShopSettingsStore'
import { formatDateTime } from '@/utils/datetime'
import CancelActionDialog from '@/components/order/CancelActionDialog.vue'
import BlockCustomerDialog from '@/components/order/BlockCustomerDialog.vue'
import { useAuthStore } from '@/store/useAuthStore'
import { ROLES } from '@/constants/roles'
import { cashierName } from '@/utils/cashier'

const { t } = useI18n()
const orderStore = useOrderStore()
const shopSettingsStore = useShopSettingsStore()
const authStore = useAuthStore()
const { orders, loading, selectedOrder, isConnected } = storeToRefs(orderStore)

// Active filter tab. 'pending' surfaces incoming customer pre-orders awaiting
// acceptance; the rest are the normal kitchen lifecycle.
const activeTab = ref<'pending' | 'preparing' | 'ready' | 'completed' | 'canceled'>('preparing')

// Dropdown active popover id tracker (inline select status change)
const activeDropdownId = ref<number | null>(null)

// ── 1. Lifecycle: Sync and Real-Time Event Subscription ───────────
onMounted(async () => {
  await orderStore.fetchTodayOrders()
  orderStore.subscribeToOrderStream()
})

// ── 2. Metrics & Live Filtering Computations ───────────────────────
const counts = computed(() => {
  return {
    // Pending = customer pre-orders awaiting staff acceptance.
    pending: orders.value.filter(o => o.fulfillmentStatus === 'pending').length,
    preparing: orders.value.filter(o => o.fulfillmentStatus === 'preparing').length,
    ready: orders.value.filter(o => o.fulfillmentStatus === 'ready').length,
    completed: orders.value.filter(o => o.fulfillmentStatus === 'completed').length,
    canceled: orders.value.filter(o => o.fulfillmentStatus === 'canceled').length,
  }
})

// Google Maps link from a pre-order's shared coordinates (delivery), or null.
const mapsLink = (order: OrderDetail): string | null =>
  order.deliveryLat != null && order.deliveryLng != null
    ? `https://maps.google.com/?q=${order.deliveryLat},${order.deliveryLng}`
    : null

const filteredOrders = computed(() => {
  return orders.value.filter(o => o.fulfillmentStatus === activeTab.value)
})

// ── 3. Time formatting helper ─────────────────────────────────────
const formatTime = (dateStr: string) => {
  try {
    const date = new Date(dateStr)
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  } catch {
    return dateStr
  }
}

// ── 4. Dropdown Toggle helper ─────────────────────────────────────
const toggleDropdown = (e: Event, orderId: number) => {
  e.stopPropagation()
  if (activeDropdownId.value === orderId) {
    activeDropdownId.value = null
  } else {
    activeDropdownId.value = orderId
  }
}

// Close dropdowns on document click
const closeDropdowns = () => {
  activeDropdownId.value = null
}
onMounted(() => {
  window.addEventListener('click', closeDropdowns)
})
onUnmounted(() => {
  window.removeEventListener('click', closeDropdowns)
})

// ── 5. Status Transition Execution ────────────────────────────────
const handleStatusChange = async (orderId: number, newStatus: string) => {
  closeDropdowns()
  // Cancelling is not a plain status flip — it must reverse the money, so route it
  // through the void confirmation flow instead of a direct status update.
  if (newStatus === 'canceled') {
    openVoidDialog(orderId)
    return
  }
  await orderStore.changeStatus(orderId, newStatus)
  toast.success(t('orderDashboard.statusUpdated'))
}

// ── 5b. Void / cancel-item actions (reverse money server-side) ─────
const voidDialogOpen = ref(false)
const voidTargetId = ref<number | null>(null)
const cancelItemDialogOpen = ref(false)
const pendingCancelItemId = ref<number | null>(null)
const actionBusy = ref(false)

const orderFullyReversed = computed(() => selectedOrder.value?.paymentStatus === 'refunded')
const isItemCancelled = (item: OrderItemDetail) => item.canceledAt != null

// Money can only be reversed on an order that actually collected money.
const canReverseMoney = computed(() => {
  const status = selectedOrder.value?.paymentStatus
  return status === 'paid' || status === 'partially_refunded'
})

// Total refunded so far, from the reversing (negative-amount) transactions in the
// order's own payment currency.
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

const openVoidDialog = (orderId: number) => {
  voidTargetId.value = orderId
  voidDialogOpen.value = true
}

const confirmVoid = async (reason?: string) => {
  if (voidTargetId.value == null) return
  actionBusy.value = true
  try {
    await orderStore.voidOrder(voidTargetId.value, reason)
    toast.success(t('orderActions.orderVoided'))
    voidDialogOpen.value = false
    voidTargetId.value = null
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
  } catch {
    toast.error(t('orderActions.actionFailed'))
  } finally {
    actionBusy.value = false
  }
}

// ── 5c. Pre-order accept / reject (customer Telegram pre-orders) ──
// Accept moves the pre-order straight into the kitchen flow (pending → preparing)
// — one tap doubles as "start preparing". Reject declines the unpaid pre-order.
const rejectDialogOpen = ref(false)

// Block customer (Admin/Manager only) — anti-spam. Any pre-order with a Telegram
// identity, regardless of status.
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
const rejectTargetId = ref<number | null>(null)

const handleAccept = async (orderId: number) => {
  actionBusy.value = true
  try {
    await orderStore.changeStatus(orderId, 'preparing')
    toast.success(t('preOrders.accepted'))
  } catch {
    toast.error(t('orderActions.actionFailed'))
  } finally {
    actionBusy.value = false
  }
}

const openRejectDialog = (orderId: number) => {
  rejectTargetId.value = orderId
  rejectDialogOpen.value = true
}

const confirmReject = async () => {
  if (rejectTargetId.value == null) return
  actionBusy.value = true
  try {
    await orderStore.rejectPreOrder(rejectTargetId.value)
    toast.success(t('preOrders.rejected'))
    rejectDialogOpen.value = false
    rejectTargetId.value = null
  } catch {
    toast.error(t('orderActions.actionFailed'))
  } finally {
    actionBusy.value = false
  }
}

// ── 6. Detail panel slide-in triggers ──────────────────────────────
const openOrderDetails = async (order: OrderDetail) => {
  await orderStore.fetchSingleOrderDetail(order.id)
}

const closeOrderDetails = () => {
  selectedOrder.value = null
}

// Calculate metadata count for selected order
const getSelectedOrderTotalQty = computed(() => {
  if (!selectedOrder.value) return 0
  return selectedOrder.value.items.reduce((sum, item) => sum + item.quantity, 0)
})

// ── 7. Thermal Print Utility ──────────────────────────────────────
const handlePrint = () => {
  window.print()
}
</script>

<template>
  <div class="flex-1 overflow-hidden flex flex-col p-6 gap-6 h-full relative receipt-print-wrapper">
    <!-- ── TOP COUNTERS / METRIC CARDS ── -->
    <section class="grid grid-cols-2 lg:grid-cols-5 gap-4 shrink-0">
      <!-- Pre-Orders Card (incoming customer pre-orders awaiting acceptance) -->
      <div
        class="bg-white dark:bg-stone-900/50 backdrop-blur-sm rounded-xl px-5 py-3 flex items-center gap-4 shadow-sm border group transition-all hover:shadow-md cursor-pointer"
        :class="
          activeTab === 'pending'
            ? 'border-amber-500 dark:border-amber-500/60 ring-2 ring-amber-500/20'
            : 'border-transparent dark:border-stone-800'
        "
        @click="activeTab = 'pending'"
      >
        <div
          class="size-12 rounded-lg bg-amber-50 dark:bg-amber-950/20 flex items-center justify-center transition-transform group-hover:scale-105 shrink-0 relative"
        >
          <span
            class="material-symbols-outlined text-[24px] text-amber-600 leading-none select-none"
            >notifications_active</span
          >
          <span
            v-if="counts.pending > 0"
            class="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-amber-500 ring-2 ring-white dark:ring-stone-900 animate-pulse"
          ></span>
        </div>
        <div>
          <p
            class="text-[11px] font-bold text-[#737373] dark:text-stone-400 uppercase tracking-wider mb-0.5"
          >
            {{ t('orderDashboard.pending') }}
          </p>
          <h3 class="text-2xl font-bold text-[#1A1C1C] dark:text-stone-100">
            {{ counts.pending }}
          </h3>
        </div>
      </div>

      <!-- Preparing Card -->
      <div
        class="bg-white dark:bg-stone-900/50 backdrop-blur-sm rounded-xl px-5 py-3 flex items-center gap-4 shadow-sm border group transition-all hover:shadow-md cursor-pointer"
        :class="
          activeTab === 'preparing'
            ? 'border-[#E26D5C] dark:border-[#E26D5C]/60 ring-2 ring-[#E26D5C]/20'
            : 'border-transparent dark:border-stone-800'
        "
        @click="activeTab = 'preparing'"
      >
        <div
          class="size-12 rounded-lg bg-[#FDF2F0] flex items-center justify-center transition-transform group-hover:scale-105 shrink-0"
        >
          <span
            class="material-symbols-outlined text-[24px] text-[#E26D5C] leading-none select-none"
            data-icon="coffee"
            >coffee</span
          >
        </div>
        <div>
          <p
            class="text-[11px] font-bold text-[#737373] dark:text-stone-400 uppercase tracking-wider mb-0.5"
          >
            {{ t('orderDashboard.preparing') }}
          </p>
          <h3 class="text-2xl font-bold text-[#1A1C1C] dark:text-stone-100">
            {{ counts.preparing }}
          </h3>
        </div>
      </div>

      <!-- Ready Card -->
      <div
        class="bg-white dark:bg-stone-900/50 backdrop-blur-sm rounded-xl px-5 py-3 flex items-center gap-4 shadow-sm border group transition-all hover:shadow-md cursor-pointer"
        :class="
          activeTab === 'ready'
            ? 'border-[#22C55E] dark:border-[#22C55E]/60 ring-2 ring-[#22C55E]/20'
            : 'border-transparent dark:border-stone-800'
        "
        @click="activeTab = 'ready'"
      >
        <div
          class="size-12 rounded-lg bg-[#F0FDF4] flex items-center justify-center transition-transform group-hover:scale-105 shrink-0"
        >
          <span
            class="material-symbols-outlined text-[24px] text-[#22C55E] leading-none select-none"
            data-icon="check_circle"
            >check_circle</span
          >
        </div>
        <div>
          <p
            class="text-[11px] font-bold text-[#737373] dark:text-stone-400 uppercase tracking-wider mb-0.5"
          >
            {{ t('orderDashboard.ready') }}
          </p>
          <h3 class="text-2xl font-bold text-[#1A1C1C] dark:text-stone-100">
            {{ counts.ready }}
          </h3>
        </div>
      </div>

      <!-- Completed Card -->
      <div
        class="bg-white dark:bg-stone-900/50 backdrop-blur-sm rounded-xl px-5 py-3 flex items-center gap-4 shadow-sm border group transition-all hover:shadow-md cursor-pointer"
        :class="
          activeTab === 'completed'
            ? 'border-teal-500 dark:border-teal-500/60 ring-2 ring-teal-500/20'
            : 'border-transparent dark:border-stone-800'
        "
        @click="activeTab = 'completed'"
      >
        <div
          class="size-12 rounded-lg bg-[#F0FDF9] flex items-center justify-center transition-transform group-hover:scale-105 shrink-0"
        >
          <span
            class="material-symbols-outlined text-[24px] text-[#0D9488] leading-none select-none"
            data-icon="done_all"
            >done_all</span
          >
        </div>
        <div>
          <p
            class="text-[11px] font-bold text-[#737373] dark:text-stone-400 uppercase tracking-wider mb-0.5"
          >
            {{ t('orderDashboard.completed') }}
          </p>
          <h3 class="text-2xl font-bold text-[#1A1C1C] dark:text-stone-100">
            {{ counts.completed }}
          </h3>
        </div>
      </div>

      <!-- Canceled Card -->
      <div
        class="bg-white dark:bg-stone-900/50 backdrop-blur-sm rounded-xl px-5 py-3 flex items-center gap-4 shadow-sm border group transition-all hover:shadow-md cursor-pointer"
        :class="
          activeTab === 'canceled'
            ? 'border-rose-500 dark:border-rose-500/60 ring-2 ring-rose-500/20'
            : 'border-transparent dark:border-stone-800'
        "
        @click="activeTab = 'canceled'"
      >
        <div
          class="size-12 rounded-lg bg-[#F8FAFC] flex items-center justify-center transition-transform group-hover:scale-105 shrink-0"
        >
          <span
            class="material-symbols-outlined text-[24px] text-rose-500 leading-none select-none"
            data-icon="cancel"
            >cancel</span
          >
        </div>
        <div>
          <p
            class="text-[11px] font-bold text-[#737373] dark:text-stone-400 uppercase tracking-wider mb-0.5"
          >
            {{ t('orderDashboard.canceled') }}
          </p>
          <h3 class="text-2xl font-bold text-[#1A1C1C] dark:text-stone-100">
            {{ counts.canceled }}
          </h3>
        </div>
      </div>
    </section>

    <!-- ── TAB NAVIGATION ── -->
    <div
      class="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 shrink-0"
    >
      <nav class="flex gap-6">
        <button
          v-for="tab in ['pending', 'preparing', 'ready', 'completed', 'canceled'] as const"
          :key="tab"
          class="pb-4 font-bold text-sm tracking-wide transition-all border-b-2 relative active:scale-98 shrink-0 flex items-center gap-2"
          :class="[
            activeTab === tab
              ? 'border-amber-700 text-amber-700 dark:border-amber-500 dark:text-amber-500 font-extrabold'
              : 'border-transparent text-stone-400 dark:text-stone-500 hover:text-stone-600',
          ]"
          @click="activeTab = tab"
        >
          {{ t(`orderDashboard.${tab}`) }}
          <span
            class="inline-flex items-center justify-center px-2 py-0.5 text-[11px] font-extrabold rounded-full transition-all"
            :class="[
              activeTab === tab
                ? 'bg-[#fcf3eb] text-[#b05a18] dark:bg-amber-900/20 dark:text-amber-500'
                : 'bg-stone-200/60 dark:bg-stone-800 text-stone-500 dark:text-stone-400',
            ]"
          >
            {{ counts[tab] }}
          </span>
        </button>
      </nav>

      <!-- Connection & Sync Status -->
      <div class="flex items-center gap-4 pb-4">
        <!-- Loader indicator -->
        <div
          v-if="loading && orders.length === 0"
          class="flex items-center gap-2 text-stone-500 text-sm font-semibold"
        >
          <span class="material-symbols-outlined animate-spin text-amber-700">sync</span>
          {{ t('common.loading') }}
        </div>
        <!-- Connection dot description -->
        <div class="flex items-center gap-2 text-xs font-bold text-stone-500 dark:text-stone-400">
          <span
            class="inline-block w-2.5 h-2.5 rounded-full shadow-sm animate-pulse"
            :class="
              isConnected ? 'bg-emerald-500 shadow-emerald-400' : 'bg-rose-500 shadow-rose-400'
            "
            :title="isConnected ? t('order.status.connected') : t('order.status.disconnected')"
          ></span>
          <span>{{ isConnected ? t('order.status.live') : t('order.status.offline') }}</span>
        </div>
      </div>
    </div>

    <!-- ── ACTIVE TICKETS KANBAN GRID ── -->
    <div class="flex-1 overflow-y-auto w-full pr-1 scrollbar-thin">
      <div
        v-if="filteredOrders.length > 0"
        class="grid gap-6 pb-12 items-start"
        style="grid-template-columns: repeat(auto-fill, minmax(262px, 1fr))"
      >
        <!-- Ticket Card -->
        <article
          v-for="order in filteredOrders"
          :key="order.id"
          class="flex flex-col bg-white dark:bg-stone-900 rounded-3xl border border-stone-200/60 dark:border-stone-800/60 shadow-sm cursor-pointer relative min-h-[224px] transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 active:scale-[0.99] group"
          :class="[
            activeTab === 'pending' ? 'border-t-4 border-t-amber-500' : '',
            activeTab === 'preparing' ? 'border-t-4 border-t-amber-500' : '',
            activeTab === 'ready' ? 'border-t-4 border-t-emerald-500' : '',
            activeTab === 'completed' ? 'border-t-4 border-t-teal-500' : '',
            activeTab === 'canceled' ? 'border-t-4 border-t-rose-500' : '',
          ]"
          @click="openOrderDetails(order)"
        >
          <!-- Card Header -->
          <div class="flex flex-col gap-2 p-5 pb-3 shrink-0">
            <!-- Status Action Trigger (own row at the top so it never overlaps the
                 order number, which can be long) -->
            <div class="relative shrink-0 self-end">
              <button
                class="flex items-center gap-1 py-1 px-2.5 border rounded-xl text-[11px] font-extrabold uppercase transition-colors shrink-0"
                :class="[
                  order.fulfillmentStatus === 'pending'
                    ? 'bg-amber-50 text-amber-700 border-amber-50'
                    : '',
                  order.fulfillmentStatus === 'preparing'
                    ? 'bg-[#fcf3eb] text-[#b05a18] border-[#fcf3eb] hover:bg-orange-100/50'
                    : '',
                  order.fulfillmentStatus === 'ready'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-50 hover:bg-emerald-100/50'
                    : '',
                  order.fulfillmentStatus === 'completed'
                    ? 'bg-teal-50 text-teal-800 border-teal-50 hover:bg-teal-100/50'
                    : '',
                  order.fulfillmentStatus === 'canceled'
                    ? 'bg-rose-50 text-rose-800 border-rose-50 hover:bg-rose-100/50'
                    : '',
                ]"
                @click="
                  !['canceled', 'pending'].includes(order.fulfillmentStatus) &&
                  toggleDropdown($event, order.id)
                "
              >
                {{ t(`orderDashboard.${order.fulfillmentStatus}`) }}
                <!-- A canceled/voided order is terminal — no status transitions offered. -->
                <span
                  v-if="!['canceled', 'pending'].includes(order.fulfillmentStatus)"
                  class="material-symbols-outlined text-[12px] font-extrabold leading-none"
                  >arrow_drop_down</span
                >
              </button>

              <!-- Status Transition Selection Dropdown -->
              <transition name="pop">
                <ul
                  v-if="
                    activeDropdownId === order.id &&
                    !['canceled', 'pending'].includes(order.fulfillmentStatus)
                  "
                  class="absolute right-0 mt-2 w-36 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xl rounded-2xl py-2 z-30 overflow-hidden font-semibold transition-all shrink-0"
                  @click.stop
                >
                  <li
                    v-for="st in ['preparing', 'ready', 'completed', 'canceled'] as const"
                    :key="st"
                  >
                    <a
                      v-if="st !== order.fulfillmentStatus"
                      href="#"
                      class="flex items-center gap-2 px-4 py-2 text-xs text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 font-bold transition-colors"
                      @click.prevent="handleStatusChange(order.id, st)"
                    >
                      <span
                        class="material-symbols-outlined text-[16px] leading-none shrink-0"
                        :class="[
                          st === 'preparing' ? 'text-amber-600' : '',
                          st === 'ready' ? 'text-emerald-600' : '',
                          st === 'completed' ? 'text-teal-600' : '',
                          st === 'canceled' ? 'text-rose-600' : '',
                        ]"
                      >
                        {{
                          st === 'preparing'
                            ? 'coffee'
                            : st === 'ready'
                              ? 'check_circle'
                              : st === 'completed'
                                ? 'done_all'
                                : 'cancel'
                        }}
                      </span>
                      {{ t(`orderDashboard.${st}`) }}
                    </a>
                  </li>
                </ul>
              </transition>
            </div>

            <!-- Order number + payment status (below the action, full width so the
                 whole number is always readable) -->
            <div class="min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <h2
                  class="font-extrabold text-stone-800 dark:text-stone-50 font-headline tracking-tight text-[16px] break-all"
                >
                  #{{ order.orderNumber }}
                </h2>
                <!-- Payment Status Badge -->
                <span
                  class="px-2 py-0.5 rounded-full text-[9px] font-extrabold tracking-wide uppercase shrink-0"
                  :class="
                    order.paymentStatus === 'paid'
                      ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200/30'
                      : 'bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 border border-amber-200/30'
                  "
                >
                  {{ t(`orderDashboard.${order.paymentStatus}`) }}
                </span>
              </div>
              <p
                class="text-[11px] font-bold text-stone-400 dark:text-stone-500 mt-1 uppercase tracking-wide"
              >
                {{ formatTime(order.createdAt) }} • {{ t(`cart.${order.orderType}`) }}
              </p>
            </div>
          </div>

          <!-- Items list -->
          <div class="flex-1 p-5 pt-2 flex flex-col gap-3">
            <div
              v-for="item in order.items"
              :key="item.id"
              class="flex items-start gap-3 border-b border-stone-100 dark:border-stone-800/40 pb-2.5 last:border-0 last:pb-0"
            >
              <span
                class="font-extrabold text-[#b05a18] dark:text-amber-500 text-sm leading-tight shrink-0 mt-0.5"
              >
                {{ item.quantity }}x
              </span>
              <div class="flex-1 min-w-0">
                <p
                  class="font-bold text-stone-800 dark:text-stone-100 text-[15px] leading-snug truncate"
                >
                  {{ item.product?.name }}
                </p>
                <!-- Nested modifiers -->
                <p
                  v-if="item.options && item.options.length > 0"
                  class="text-[12px] text-stone-400 dark:text-stone-500 font-semibold leading-normal mt-0.5"
                >
                  {{ item.options.map(o => o.optionName).join(', ') }}
                </p>
              </div>
            </div>
          </div>

          <!-- Pre-order actions: Accept straight into the kitchen (pending →
               preparing) or Reject; plus delivery contact shortcuts. -->
          <div
            v-if="order.fulfillmentStatus === 'pending'"
            class="p-5 pt-0 flex flex-col gap-3"
            @click.stop
          >
            <div
              v-if="order.customerPhone || order.telegramUsername || mapsLink(order)"
              class="flex flex-wrap items-center gap-2 text-[11px] font-bold"
            >
              <a
                v-if="order.customerPhone"
                :href="`tel:${order.customerPhone}`"
                class="inline-flex items-center gap-1 rounded-full bg-stone-100 dark:bg-stone-800 px-2.5 py-1 text-stone-600 dark:text-stone-300"
              >
                <span class="material-symbols-outlined text-[14px] leading-none">call</span
                >{{ order.customerPhone }}
              </a>
              <a
                v-if="order.telegramUsername"
                :href="`https://t.me/${order.telegramUsername}`"
                target="_blank"
                rel="noopener"
                class="inline-flex items-center gap-1 rounded-full bg-sky-50 dark:bg-sky-950/30 px-2.5 py-1 text-sky-700 dark:text-sky-400"
              >
                <span class="material-symbols-outlined text-[14px] leading-none">send</span>@{{
                  order.telegramUsername
                }}
              </a>
              <a
                v-if="mapsLink(order)"
                :href="mapsLink(order)!"
                target="_blank"
                rel="noopener"
                class="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-950/30 px-2.5 py-1 text-emerald-700 dark:text-emerald-400"
              >
                <span class="material-symbols-outlined text-[14px] leading-none">location_on</span
                >{{ t('preOrders.map') }}
              </a>
            </div>
            <div class="flex gap-2">
              <button
                type="button"
                class="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-amber-600 py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:bg-amber-700 active:scale-[0.98]"
                @click="handleAccept(order.id)"
              >
                <span class="material-symbols-outlined text-[18px] leading-none">check_circle</span>
                {{ t('preOrders.accept') }}
              </button>
              <button
                type="button"
                class="inline-flex items-center justify-center rounded-xl border border-stone-200 px-4 py-2.5 text-sm font-bold text-stone-600 transition-all hover:bg-stone-50 active:scale-95 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800"
                @click="openRejectDialog(order.id)"
              >
                {{ t('preOrders.reject') }}
              </button>
            </div>
          </div>
        </article>
      </div>

      <!-- Operational Empty State -->
      <div v-else class="flex flex-col items-center justify-center py-24 text-center shrink-0">
        <div
          class="w-20 h-20 rounded-full bg-stone-100 dark:bg-stone-800 flex items-center justify-center text-stone-300 dark:text-stone-600 mb-4 animate-bounce"
        >
          <span class="material-symbols-outlined text-4xl" data-icon="inbox">inbox</span>
        </div>
        <h3 class="font-extrabold text-stone-700 dark:text-stone-300 font-headline text-lg">
          {{ t('orderDashboard.emptyDashboard') }}
        </h3>
        <p class="text-xs text-stone-400 dark:text-stone-500 font-medium max-w-sm mt-1">
          {{ t(`orderDashboard.${activeTab}Desc`) }}
        </p>
      </div>
    </div>

    <!-- ── DRAG SHEET DRILL-DOWN VIEW (Selected Order Overlay) ── -->
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
            {{ t('orderDashboard.printReceipt') }}
          </button>
        </header>

        <!-- Receipt Wrapper (Both Drawer Scroll and Print layout) -->
        <div
          class="flex-1 overflow-y-auto p-6 flex flex-col gap-6 scrollbar-thin print:p-0 print:overflow-visible"
        >
          <!-- Order ID / QR area (Printed also) -->
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
                {{ shopSettingsStore.formatAmount(Number(selectedOrder.totalAmount)) }}
              </p>
            </div>
          </div>

          <!-- Items modifiers break tree -->
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
                <!-- Populated Product image fallback in drawer -->
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
                    </p>
                    <p
                      class="font-bold text-stone-700 dark:text-stone-300 text-xs shrink-0 pl-2"
                      :class="{
                        'line-through text-stone-400 dark:text-stone-600': isItemCancelled(item),
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

                  <!-- Nested modifier option sets listed as specific sub-bullets in details pane -->
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
                <span class="font-headline">{{
                  shopSettingsStore.formatAmount(Number(selectedOrder.totalAmount))
                }}</span>
              </div>

              <!-- Reversed (refunded) amount when the order was voided / had items cancelled -->
              <div
                v-if="refundedDisplay"
                class="flex justify-between font-bold text-rose-600 dark:text-rose-500"
              >
                <span>{{ t('orderActions.refundedLine') }}</span>
                <span>−{{ refundedDisplay }}</span>
              </div>
              <p
                v-if="voidedByLabel"
                class="pt-1 text-[11px] font-semibold text-stone-400 dark:text-stone-500"
              >
                {{ voidedByLabel }}
              </p>
            </div>
          </div>

          <!-- Void action — reverses the money (refund + un-redeem promotions). -->
          <div
            class="border-t border-stone-100 dark:border-stone-800 pt-6 shrink-0 print:hidden flex flex-col gap-3"
          >
            <button
              v-if="canReverseMoney"
              type="button"
              :disabled="actionBusy"
              class="flex items-center justify-center gap-2 rounded-2xl bg-rose-600 py-3 px-5 text-sm font-bold tracking-wide text-white shadow-sm transition-all hover:bg-rose-700 active:scale-[0.98] disabled:opacity-60"
              @click="openVoidDialog(selectedOrder.id)"
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
            <p class="mt-1">{{ t('ui.thankYou') }}</p>
          </div>
        </div>
      </section>
    </transition>

    <!-- Drawer Backdrop blur overlay -->
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
      @confirm="confirmReject"
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
/* Transitive popover animations */
.pop-enter-active,
.pop-leave-active {
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.pop-enter-from,
.pop-leave-to {
  opacity: 0;
  transform: translateY(4px) scale(0.98);
}

/* Transitive Drawer slide animations */
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

/* Printing styles wrapper */
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
