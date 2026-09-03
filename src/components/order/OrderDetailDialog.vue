<template>
  <!-- ── ORDER DETAIL DIALOG ──────────────────────────────────────────────
       Read-only "show more detail" popup for the Sale Report page. Reads the
       same orderStore.selectedOrder as OrderHistoryView's side-panel drawer
       (OrderDetailPanel.vue), so any page can trigger it by calling
       orderStore.fetchSingleOrderDetail(id) — this component just renders
       whatever is loaded. Teleported to <body> so it always sits above the
       host page regardless of any overflow/positioning it uses. -->
  <Teleport to="body">
    <transition name="dialog-fade">
      <div
        v-if="selectedOrder"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 dark:bg-stone-950/60 backdrop-blur-sm"
        @click.self="closeOrderDetails"
      >
        <div
          class="w-full max-w-lg max-h-[85vh] overflow-hidden rounded-3xl bg-white dark:bg-stone-900 shadow-2xl flex flex-col"
          role="dialog"
          aria-modal="true"
        >
          <!-- Header -->
          <header
            class="flex items-start justify-between gap-4 p-6 border-b border-stone-100 dark:border-stone-800 shrink-0"
          >
            <div>
              <h2 class="font-extrabold text-xl text-stone-800 dark:text-stone-50 font-headline">
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
            <button
              type="button"
              class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-600 dark:hover:bg-stone-800 dark:hover:text-stone-300"
              :aria-label="t('common.close')"
              @click="closeOrderDetails"
            >
              <span class="material-symbols-outlined text-xl">close</span>
            </button>
          </header>

          <!-- Loading state -->
          <div v-if="orderStore.detailLoading" class="flex-1 flex items-center justify-center p-10">
            <p class="text-sm font-semibold text-stone-400">{{ t('reports.loading') }}</p>
          </div>

          <template v-else>
            <div class="flex-1 overflow-y-auto p-6 flex flex-col gap-6 scrollbar-thin">
              <!-- Order Metadata Cards -->
              <div class="grid grid-cols-2 gap-4 shrink-0">
                <div
                  class="p-4 rounded-2xl bg-stone-50 dark:bg-stone-900/50 border border-stone-100 dark:border-stone-800/40"
                >
                  <p class="text-[10px] font-bold text-stone-400 uppercase tracking-wide">
                    {{ t('orderDashboard.orderType') }}
                  </p>
                  <p
                    class="font-extrabold text-sm text-stone-700 dark:text-stone-300 mt-1 capitalize"
                  >
                    {{ t(`cart.${selectedOrder.orderType}`) }}
                  </p>
                </div>

                <div
                  class="p-4 rounded-2xl bg-stone-50 dark:bg-stone-900/50 border border-stone-100 dark:border-stone-800/40"
                >
                  <p class="text-[10px] font-bold text-stone-400 uppercase tracking-wide">
                    {{ t('orderDashboard.totalItems') }}
                  </p>
                  <p class="font-extrabold text-sm text-stone-700 dark:text-stone-300 mt-1">
                    {{ getSelectedOrderTotalQty }} {{ t('orderDashboard.items') }}
                  </p>
                </div>

                <div
                  class="col-span-2 p-4 rounded-2xl bg-[#fcf3eb] dark:bg-amber-950/10 border border-orange-100 dark:border-amber-950/20"
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
              <div class="flex flex-col gap-4">
                <h3
                  class="font-extrabold text-sm text-stone-400 dark:text-stone-500 uppercase tracking-wider shrink-0"
                >
                  {{ t('orderDashboard.items') }}
                </h3>

                <div class="flex flex-col gap-4">
                  <div
                    v-for="item in selectedOrder.items"
                    :key="item.id"
                    class="flex items-start gap-4 border-b border-stone-100 dark:border-stone-800 pb-4 last:border-0 last:pb-0"
                    :class="{ 'opacity-70': isItemCancelled(item) }"
                  >
                    <!-- Thumbnail -->
                    <div
                      v-if="item.product?.imageUrl"
                      class="w-12 h-12 rounded-xl bg-stone-100 dark:bg-stone-800 shrink-0 overflow-hidden"
                    >
                      <img
                        :src="item.product.imageUrl"
                        class="w-full h-full object-cover"
                        :alt="t('product.thumbnailAlt')"
                      />
                    </div>
                    <div
                      v-else
                      class="w-12 h-12 rounded-xl bg-stone-100 dark:bg-stone-800 shrink-0 flex items-center justify-center text-stone-300 dark:text-stone-600"
                    >
                      <span class="material-symbols-outlined text-2xl">local_cafe</span>
                    </div>

                    <div class="flex-1 min-w-0">
                      <div class="flex justify-between items-start gap-2">
                        <p
                          class="font-bold text-stone-800 dark:text-stone-100 text-[15px] leading-tight"
                          :class="{
                            'line-through text-stone-400 dark:text-stone-600':
                              isItemCancelled(item),
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
                        <!-- Line total (qty × unit price, matches the order total) —
                             not the unit price alone, so items add up to the total. -->
                        <p
                          class="font-bold text-stone-700 dark:text-stone-300 text-xs shrink-0 pl-2"
                          :class="{
                            'line-through text-stone-400 dark:text-stone-600':
                              isItemCancelled(item) || item.isComplimentary,
                          }"
                        >
                          {{ shopSettingsStore.formatAmount(Number(item.subtotal)) }}
                        </p>
                      </div>

                      <p class="text-xs text-stone-500 font-extrabold mt-1">
                        {{ t('cart.quantity') }} : {{ item.quantity }}
                      </p>

                      <ul
                        v-if="item.options && item.options.length > 0"
                        class="mt-2 flex flex-col gap-1"
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
              <div class="border-t border-stone-100 dark:border-stone-800 pt-6 shrink-0">
                <h3
                  class="font-extrabold text-sm text-stone-400 dark:text-stone-500 uppercase tracking-wider mb-4"
                >
                  {{ t('orderDashboard.paymentSummary') }}
                </h3>

                <div
                  class="flex flex-col gap-2 font-semibold text-sm text-stone-600 dark:text-stone-400"
                >
                  <div class="flex justify-between">
                    <span>{{ t('orderDashboard.subtotal') }}</span>
                    <span class="text-stone-800 dark:text-stone-200">{{
                      shopSettingsStore.formatAmount(
                        Number(selectedOrder.totalAmount) +
                          Number(selectedOrder.discountAmount || 0)
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
                      }}{{
                        shopSettingsStore.formatAmount(Number(selectedOrder.discountAmount || 0))
                      }}
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
                      >−{{
                        shopSettingsStore.formatAmount(Number(selectedOrder.discountAmount))
                      }}</span
                    >
                  </div>

                  <div
                    class="flex justify-between font-extrabold text-lg text-[#b05a18] dark:text-amber-500 pt-3 border-t border-stone-100 dark:border-stone-800"
                  >
                    <span>{{ t('orderDashboard.total') }}</span>
                    <span class="font-headline">{{ formatOrderTotal(selectedOrder) }}</span>
                  </div>

                  <!-- Payment method / amount received / change — already returned
                       by the API, previously never surfaced anywhere. -->
                  <div class="flex justify-between">
                    <span>{{ t('orderDashboard.payment-method') }}</span>
                    <span class="text-stone-800 dark:text-stone-200 uppercase">{{
                      selectedOrder.paymentMethod
                    }}</span>
                  </div>
                  <div class="flex justify-between">
                    <span>{{ t('orderDashboard.amountReceived') }}</span>
                    <span class="text-stone-800 dark:text-stone-200">{{
                      formatPaymentCurrencyAmount(selectedOrder, selectedOrder.receivedAmount)
                    }}</span>
                  </div>
                  <div class="flex justify-between">
                    <span>{{ t('orderDashboard.change') }}</span>
                    <span class="text-stone-800 dark:text-stone-200">{{
                      formatPaymentCurrencyAmount(selectedOrder, selectedOrder.changeAmount)
                    }}</span>
                  </div>

                  <!-- Reversed (refunded) amount, if the order was voided / had items cancelled -->
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
            </div>

            <!-- Footer -->
            <footer
              class="p-4 border-t border-stone-100 dark:border-stone-800 shrink-0 flex justify-end"
            >
              <button
                type="button"
                class="rounded-2xl border border-stone-200 dark:border-stone-700 px-5 py-2.5 text-sm font-bold text-stone-600 dark:text-stone-300 transition-colors hover:bg-stone-50 dark:hover:bg-stone-800 active:scale-95"
                @click="closeOrderDetails"
              >
                {{ t('common.close') }}
              </button>
            </footer>
          </template>
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'
import { useOrderStore } from '@/store/useOrderStore'
import { useShopSettingsStore } from '@/store/useShopSettingsStore'
import { roundRielUp } from '@/utils/money'
import { formatDateTime } from '@/utils/datetime'
import type { OrderDetail, OrderItemDetail } from '@/types/order.types'

const { t } = useI18n()
const orderStore = useOrderStore()
const shopSettingsStore = useShopSettingsStore()
const { selectedOrder } = storeToRefs(orderStore)

// Order total shown in the currency the customer actually paid in. A riel order
// shows the exact note-rounded riel figure (using the order's OWN snapshot rate),
// so it matches the receipt and reconciles even if the shop later changed its
// exchange rate. USD orders show dollars.
const formatOrderTotal = (order: OrderDetail) => {
  if (order.paymentCurrency === 'KHR') {
    const riel = roundRielUp(Number(order.totalAmount) * Number(order.exchangeRateSnapshot))
    return `${riel.toLocaleString()}៛`
  }
  return `$${Number(order.totalAmount).toFixed(2)}`
}

// receivedAmount / changeAmount are already expressed in the order's own payment
// currency (unlike totalAmount, which is stored in USD and converted for
// display), so these are formatted directly with no exchange-rate conversion.
const formatPaymentCurrencyAmount = (order: OrderDetail, amount: number | string) => {
  if (order.paymentCurrency === 'KHR') {
    return `${Math.round(Number(amount)).toLocaleString()}៛`
  }
  return `$${Number(amount).toFixed(2)}`
}

const isItemCancelled = (item: OrderItemDetail) => item.canceledAt != null

// Total refunded so far, summed from the reversing (negative-amount) transactions
// and shown in the order's own payment currency. Informational only — this
// dialog is read-only and doesn't expose the void/cancel-item actions.
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

const getSelectedOrderTotalQty = computed(() => {
  if (!selectedOrder.value) return 0
  return selectedOrder.value.items.reduce((sum, item) => sum + item.quantity, 0)
})

const closeOrderDetails = () => {
  selectedOrder.value = null
}

// Escape closes the dialog, matching standard modal behaviour.
const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && selectedOrder.value) {
    closeOrderDetails()
  }
}
onMounted(() => window.addEventListener('keydown', handleKeydown))
onUnmounted(() => window.removeEventListener('keydown', handleKeydown))
</script>

<style scoped>
.dialog-fade-enter-active,
.dialog-fade-leave-active {
  transition: opacity 0.2s ease;
}
.dialog-fade-enter-from,
.dialog-fade-leave-to {
  opacity: 0;
}
</style>
