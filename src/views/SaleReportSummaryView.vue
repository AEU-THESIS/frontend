<template>
  <div class="flex h-full flex-col bg-[#F9FAFB] dark:bg-stone-900 font-body overflow-hidden">
    <div class="flex-1 overflow-y-auto custom-scrollbar px-10 py-10">
      <div class="w-full space-y-8">
        <!-- Header -->
        <!-- <div>
          <h1 class="text-3xl font-bold text-[#1A1C1C] dark:text-stone-50">
            {{ t('reports.title') }}
          </h1>
          <p class="mt-1 text-sm text-[#737373] dark:text-stone-400">
            {{ t('reports.subtitle') }}
          </p>
        </div> -->

        <div class="grid grid-cols-1 gap-6 md:grid-cols-3">
          <StaffStatCard
            class="h-[90px]"
            :label="t('reports.total_revenue_today')"
            :value="formattedTotalRevenue"
            :icon="DollarSign"
            label-class="text-xs md:text-sm font-medium dark:text-stone-300"
            value-class="text-lg md:text-xl font-bold dark:text-stone-100"
            bg-color-class="bg-[#FDF2F0] dark:bg-rose-950/30 dark:border dark:border-rose-900/30"
            icon-color-class="text-[#E26D5C] dark:text-rose-400"
          />

          <StaffStatCard
            class="h-[90px]"
            :label="t('reports.cash_drawer_expected')"
            :value="formattedCashTotal"
            :icon="Wallet"
            label-class="text-xs md:text-sm font-medium dark:text-stone-300"
            value-class="text-lg md:text-xl font-bold dark:text-stone-100"
            bg-color-class="bg-[#F0FDF4] dark:bg-emerald-950/30 dark:border dark:border-emerald-900/30"
            icon-color-class="text-[#22C55E] dark:text-emerald-400"
          />

          <StaffStatCard
            class="h-[90px]"
            :label="t('reports.khqr_expected')"
            :value="formattedKhqrTotal"
            :icon="QrCode"
            label-class="text-xs md:text-sm font-medium dark:text-stone-300"
            value-class="text-lg md:text-xl font-bold dark:text-stone-100"
            bg-color-class="bg-[#F8FAFC] dark:bg-stone-800/50 dark:border dark:border-stone-700/50"
            icon-color-class="text-slate-400 dark:text-stone-400"
          />
        </div>

        <Card
          class="gap-0 overflow-hidden rounded-xl border border-transparent dark:border-stone-800 bg-white dark:bg-stone-900 p-0 text-[#1A1C1C] dark:text-stone-100 shadow-sm flex flex-col"
        >
          <!-- Filter Panel -->
          <FilterPanel
            :has-active-filters="hasActiveFilters"
            actions-class="col-span-12 sm:col-span-4"
            @submit="applyFilters"
            @clear="clearFilters"
          >
            <!-- Date Filter -->
            <div class="flex flex-col gap-1 col-span-12 sm:col-span-4">
              <label
                for="report-filter-date"
                class="text-xs font-semibold uppercase tracking-wide text-[#1A1C1C]/50 dark:text-stone-400"
              >
                {{ t('reports.date') }}
              </label>
              <input
                id="report-filter-date"
                v-model="reportStore.selectedDate"
                type="date"
                :max="todayIsoDate"
                class="h-10 w-full cursor-pointer rounded-md border border-stone-200/60 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 px-3 text-sm text-[#1A1C1C] dark:text-stone-100 transition-colors focus:outline-none focus:ring-2 focus:ring-primary dark:[color-scheme:dark]"
              />
            </div>

            <!-- Payment Method Filter -->
            <AppSelect
              v-model="reportStore.selectedPaymentMethod"
              :options="paymentMethodOptions"
              :label="t('reports.paymentMethods')"
              :all-option-label="t('reports.filters.all')"
              class="w-full col-span-12 sm:col-span-4"
            />
          </FilterPanel>

          <div
            v-if="reportStore.isLoading"
            class="p-10 text-center text-sm text-[#A3A3A3] dark:text-stone-500"
          >
            {{ t('reports.loading') }}
          </div>

          <div
            v-else-if="reportStore.error"
            class="p-10 text-center text-sm text-red-500 dark:text-red-400"
          >
            {{ t(reportStore.error) }}
          </div>

          <template v-else>
            <div class="overflow-x-auto">
              <table class="w-full min-w-[820px] text-left">
                <thead>
                  <tr
                    class="bg-[#FCFCFC] dark:bg-stone-950/50 text-[11px] font-black uppercase text-[#A3A3A3] dark:text-stone-400 border-b border-[#F2F2F2] dark:border-stone-800"
                  >
                    <th class="px-6 py-4">{{ t('reports.table.time') }}</th>
                    <th class="px-6 py-4">{{ t('reports.table.orderId') }}</th>
                    <th class="px-6 py-4">{{ t('reports.table.type') }}</th>
                    <th class="px-6 py-4 text-center">{{ t('reports.table.payment') }}</th>
                    <th class="px-6 py-4 text-center">{{ t('reports.table.method') }}</th>
                    <th class="px-6 py-4 text-center">{{ t('reports.table.total') }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-if="filteredOrders.length === 0">
                    <td
                      colspan="6"
                      class="p-10 text-center text-sm text-[#A3A3A3] dark:text-stone-500"
                    >
                      {{ t('reports.table.empty') }}
                    </td>
                  </tr>
                  <tr
                    v-for="order in paginatedOrders"
                    v-else
                    :key="order.id"
                    class="border-t border-[#F2F2F2] dark:border-stone-800 text-sm hover:bg-stone-50/50 dark:hover:bg-stone-800/30 transition-colors"
                  >
                    <td class="px-6 py-4 text-[#6B6B6B] dark:text-stone-400">
                      {{ formatTime(order.createdAt) }}
                    </td>
                    <td class="px-6 py-4 font-semibold text-[#1A1C1C] dark:text-stone-200">
                      #{{ order.orderNumber }}
                    </td>
                    <td class="px-6 py-4 text-[#1A1C1C] dark:text-stone-300">
                      {{ orderTypeLabel(order.orderType) }}
                    </td>
                    <td class="px-6 py-4 text-center">
                      <span
                        class="inline-flex rounded-full px-3 py-1 text-[11px] font-bold capitalize"
                        :class="
                          order.paymentStatus === 'paid'
                            ? 'bg-[#F0FDF4] dark:bg-emerald-950/40 text-[#22C55E] dark:text-emerald-400'
                            : 'bg-[#FDF2F0] dark:bg-rose-950/40 text-[#E26D5C] dark:text-rose-400'
                        "
                      >
                        {{ order.paymentStatus }}
                      </span>
                    </td>
                    <td class="px-6 py-4 text-center uppercase text-[#6B6B6B] dark:text-stone-400">
                      {{ order.paymentMethod }}
                    </td>
                    <td class="px-6 py-4 text-center font-bold text-[#1A1C1C] dark:text-stone-100">
                      {{ formatUsd(order.totalAmount) }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div
              v-if="filteredOrders.length > 0"
              class="flex items-center justify-between border-t border-[#F2F2F2] dark:border-stone-800 px-6 py-4 text-xs font-semibold text-[#A3A3A3] dark:text-stone-400"
            >
              <div>
                {{
                  t('reports.table.pagination', {
                    startIndex,
                    endIndex,
                    chronologicalOrders: filteredOrders.length,
                  })
                }}
              </div>

              <div class="flex items-center gap-4 text-stone-900 dark:text-stone-100">
                <button
                  :disabled="currentPage === 1"
                  class="flex h-9 w-9 items-center justify-center rounded-full border border-stone-200 dark:border-stone-800 transition hover:bg-stone-50 dark:hover:bg-stone-800 disabled:opacity-30 disabled:hover:bg-transparent select-none"
                  @click="prevPage"
                >
                  <ChevronLeft class="h-4 w-4 text-stone-400 dark:text-stone-500" />
                </button>

                <span class="text-xs font-bold text-stone-700 dark:text-stone-300">
                  Page {{ currentPage }} of {{ totalPages }}
                </span>

                <button
                  :disabled="currentPage === totalPages"
                  class="flex h-9 w-9 items-center justify-center rounded-full border border-stone-200 dark:border-stone-800 transition hover:bg-stone-50 dark:hover:bg-stone-800 disabled:opacity-30 disabled:hover:bg-transparent select-none"
                  @click="nextPage"
                >
                  <ChevronRight class="h-4 w-4 text-stone-400 dark:text-stone-500" />
                </button>
              </div>
            </div>
          </template>
        </Card>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { ref, computed, onMounted } from 'vue'
import { DollarSign, Wallet, QrCode, ChevronLeft, ChevronRight } from 'lucide-vue-next'
import StaffStatCard from '@/components/staff/StaffStatCard.vue'
import { Card } from '@/components/ui/card'
import AppSelect from '@/components/ui/select/AppSelect.vue'
import FilterPanel from '@/components/common/FilterPanel.vue'
import { useReportStore } from '@/store/useReportStore'

const { t } = useI18n()
const reportStore = useReportStore()

const today = new Date()
const todayIsoDate = new Intl.DateTimeFormat('en-CA').format(today)

const formatUsd = (amount: number | string) => `$${Number(amount).toFixed(2)}`

const paymentMethodOptions = computed(() => [
  { value: 'cash', label: t('reports.filters.cash') },
  { value: 'khqr', label: t('reports.filters.khqr') },
  { value: 'cod', label: t('reports.filters.cod') },
])

const hasActiveFilters = computed(
  () => reportStore.selectedDate !== todayIsoDate || reportStore.selectedPaymentMethod !== 'all'
)

/**
 * Filtered orders computed property.
 * Filters reportStore.chronologicalOrders dynamically based on selected payment method.
 */
const filteredOrders = computed(() => {
  const orders = reportStore.chronologicalOrders || []
  const method = reportStore.selectedPaymentMethod

  if (!method || method === 'all') {
    return orders
  }

  return orders.filter(order => order.paymentMethod?.toLowerCase() === method.toLowerCase())
})

const ITEMS_PER_PAGE = 5
const currentPage = ref(1)

const totalPages = computed(() => Math.ceil(filteredOrders.value.length / ITEMS_PER_PAGE) || 1)

const paginatedOrders = computed(() => {
  const start = (currentPage.value - 1) * ITEMS_PER_PAGE
  const end = start + ITEMS_PER_PAGE
  return filteredOrders.value.slice(start, end)
})

const startIndex = computed(() => (currentPage.value - 1) * ITEMS_PER_PAGE + 1)
const endIndex = computed(() =>
  Math.min(currentPage.value * ITEMS_PER_PAGE, filteredOrders.value.length)
)

const nextPage = () => {
  if (currentPage.value < totalPages.value) currentPage.value++
}

const prevPage = () => {
  if (currentPage.value > 1) currentPage.value--
}

const applyFilters = async () => {
  currentPage.value = 1
  await reportStore.fetchDailyOverview()
}

const clearFilters = async () => {
  reportStore.selectedDate = todayIsoDate
  reportStore.selectedPaymentMethod = 'all'
  currentPage.value = 1

  await reportStore.fetchDailyOverview()
}

const formatUsdWithKhr = (amountUsd: number, rate: number) => {
  const khr = Math.round(amountUsd * rate)
  return `${formatUsd(amountUsd)} / ${khr.toLocaleString()} KHR`
}

const formattedTotalRevenue = computed(() =>
  formatUsdWithKhr(reportStore.summary.total_revenue, reportStore.summary.exchange_rate)
)
const formattedCashTotal = computed(() =>
  formatUsdWithKhr(reportStore.summary.cash_total, reportStore.summary.exchange_rate)
)
const formattedKhqrTotal = computed(() =>
  formatUsdWithKhr(reportStore.summary.khqr_total, reportStore.summary.exchange_rate)
)

const formatTime = (isoString: string) =>
  new Date(isoString).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })

const orderTypeLabel = (orderType: string) =>
  orderType === 'dine_in' ? t('reports.table.dineIn') : t('reports.table.takeaway')

onMounted(() => {
  reportStore.fetchDailyOverview()
})
</script>

<style scoped>
.cards-row :deep(.stat-label-class-or-tag) {
  font-size: 1.25rem;
  line-height: 1.25rem;
}

.cards-row :deep(.stat-value-class-or-tag) {
  font-size: 1.25rem;
  font-weight: 700;
}
</style>
