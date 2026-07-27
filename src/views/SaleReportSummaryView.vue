<template>
  <div class="flex h-full flex-col bg-[#F9FAFB] dark:bg-stone-900 font-body overflow-hidden">
    <div class="flex-1 overflow-y-auto custom-scrollbar px-10 py-10">
      <div class="mx-auto w-full max-w-[1400px] space-y-8">
        <div class="grid grid-cols-1 gap-6 md:grid-cols-3">
          <StaffStatCard
            class="h-[90px]"
            :label="t('reports.total_revenue_today')"
            :value="formattedTotalRevenue"
            :icon="DollarSign"
            label-class="text-xs md:text-sm font-medium"
            value-class="text-lg md:text-xl font-bold"
            bg-color-class="bg-[#FDF2F0]"
            icon-color-class="text-[#E26D5C]"
          />

          <StaffStatCard
            class="h-[90px]"
            :label="t('reports.cash_drawer_expected')"
            :value="formattedCashTotal"
            :icon="Wallet"
            label-class="text-xs md:text-sm font-medium"
            value-class="text-lg md:text-xl font-bold"
            bg-color-class="bg-[#F0FDF4]"
            icon-color-class="text-[#22C55E]"
          />

          <StaffStatCard
            class="h-[90px]"
            :label="t('reports.khqr_expected')"
            :value="formattedKhqrTotal"
            :icon="QrCode"
            label-class="text-xs md:text-sm font-medium"
            value-class="text-lg md:text-xl font-bold"
            bg-color-class="bg-[#F8FAFC]"
            icon-color-class="text-slate-400"
          />
        </div>

        <Card
          class="overflow-hidden rounded-xl border-none bg-white p-0 text-[#1A1C1C] shadow-sm flex flex-col"
        >
          <div
            class="flex flex-wrap items-center justify-between gap-3 p-4 h-auto md:h-[56px] border-b border-[#F2F2F2]"
          >
            <div class="flex flex-wrap items-center gap-4">
              <div class="flex items-center gap-2">
                <label
                  class="text-[11px] font-bold uppercase text-[#A3A3A3] tracking-wider whitespace-nowrap"
                >
                  {{ t('reports.date') }}
                </label>
                <input
                  v-model="reportStore.selectedDate"
                  type="date"
                  :max="todayIsoDate"
                  class="w-40 h-9 bg-stone-50 dark:bg-stone-950/50 border border-stone-200 dark:border-stone-800/80 rounded-lg px-3 text-xs font-semibold focus:outline-none focus:border-[#b05a18]/50 cursor-pointer"
                  @change="reportStore.fetchDailyOverview"
                />
              </div>

              <div class="flex items-center gap-2">
                <label
                  class="text-[11px] font-bold uppercase text-[#A3A3A3] tracking-wider whitespace-nowrap"
                >
                  {{ t('reports.paymentMethods') }}
                </label>
                <select
                  v-model="reportStore.selectedPaymentMethod"
                  class="w-36 h-9 bg-stone-50 dark:bg-stone-950/50 border border-stone-200 dark:border-stone-800/80 rounded-lg px-3 text-xs font-semibold focus:outline-none focus:border-[#b05a18]/50 cursor-pointer"
                  @change="reportStore.fetchDailyOverview"
                >
                  <option value="all">{{ t('reports.filters.all') }}</option>
                  <option value="cash">{{ t('reports.filters.cash') }}</option>
                  <option value="khqr">{{ t('reports.filters.khqr') }}</option>
                </select>
              </div>
            </div>
          </div>

          <div v-if="reportStore.isLoading" class="p-10 text-center text-sm text-[#A3A3A3]">
            {{ t('reports.loading') }}
          </div>

          <div v-else-if="reportStore.error" class="p-10 text-center text-sm text-red-500">
            {{ t(reportStore.error) }}
          </div>

          <template v-else>
            <div class="overflow-x-auto">
              <table class="w-full min-w-[820px] text-left">
                <thead>
                  <tr class="bg-[#FCFCFC] text-[11px] font-black uppercase text-[#A3A3A3]">
                    <th class="px-6 py-4">{{ t('reports.table.time') }}</th>
                    <th class="px-6 py-4">{{ t('reports.table.orderId') }}</th>
                    <th class="px-6 py-4">{{ t('reports.table.type') }}</th>
                    <th class="px-6 py-4 text-center">{{ t('reports.table.payment') }}</th>
                    <th class="px-6 py-4 text-center">{{ t('reports.table.method') }}</th>
                    <th class="px-6 py-4 text-center">{{ t('reports.table.total') }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-if="reportStore.chronologicalOrders.length === 0">
                    <td colspan="6" class="p-10 text-center text-sm text-[#A3A3A3]">
                      {{ t('reports.table.empty') }}
                    </td>
                  </tr>
                  <tr
                    v-for="order in paginatedOrders"
                    v-else
                    :key="order.id"
                    class="border-t border-[#F2F2F2] text-sm"
                  >
                    <td class="px-6 py-4 text-[#6B6B6B]">{{ formatTime(order.createdAt) }}</td>
                    <td class="px-6 py-4 font-semibold">#{{ order.orderNumber }}</td>
                    <td class="px-6 py-4">{{ orderTypeLabel(order.orderType) }}</td>
                    <td class="px-6 py-4 text-center">
                      <span
                        class="inline-flex rounded-full px-3 py-1 text-[11px] font-bold capitalize"
                        :class="
                          order.paymentStatus === 'paid'
                            ? 'bg-[#F0FDF4] text-[#22C55E]'
                            : 'bg-[#FDF2F0] text-[#E26D5C]'
                        "
                      >
                        {{ order.paymentStatus }}
                      </span>
                    </td>
                    <td class="px-6 py-4 text-center uppercase text-[#6B6B6B]">
                      {{ order.paymentMethod }}
                    </td>
                    <td class="px-6 py-4 text-center font-bold">
                      {{ formatUsd(order.totalAmount) }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div
              v-if="reportStore.chronologicalOrders.length > 0"
              class="flex items-center justify-between border-t border-[#F2F2F2] px-6 py-4 text-xs font-semibold text-[#A3A3A3]"
            >
              <div>
                {{
                  t('reports.table.pagination', {
                    startIndex,
                    endIndex,
                    chronologicalOrders: reportStore.chronologicalOrders.length,
                  })
                }}
              </div>

              <div class="flex items-center gap-4 text-stone-900 dark:text-stone-100">
                <button
                  :disabled="currentPage === 1"
                  class="flex h-9 w-9 items-center justify-center rounded-full border border-stone-200 dark:border-stone-800 transition hover:bg-stone-50 dark:hover:bg-stone-800/50 disabled:opacity-30 disabled:hover:bg-transparent select-none"
                  @click="prevPage"
                >
                  <ChevronLeft class="h-4 w-4 text-stone-400" />
                </button>

                <span class="text-xs font-bold"> Page {{ currentPage }} of {{ totalPages }} </span>

                <button
                  :disabled="currentPage === totalPages"
                  class="flex h-9 w-9 items-center justify-center rounded-full border border-stone-200 dark:border-stone-800 transition hover:bg-stone-50 dark:hover:bg-stone-800/50 disabled:opacity-30 disabled:hover:bg-transparent select-none"
                  @click="nextPage"
                >
                  <ChevronRight class="h-4 w-4 text-stone-400" />
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
import { ref, computed, onMounted, watch } from 'vue'
import { DollarSign, Wallet, QrCode, ChevronLeft, ChevronRight } from 'lucide-vue-next'
import StaffStatCard from '@/components/staff/StaffStatCard.vue'
import { useReportStore } from '@/store/useReportStore'

const { t } = useI18n()
const reportStore = useReportStore()

const today = new Date()
const todayIsoDate = new Intl.DateTimeFormat('en-CA').format(today)

const formatUsd = (amount: number | string) => `$${Number(amount).toFixed(2)}`

const ITEMS_PER_PAGE = 5
const currentPage = ref(1)

const totalPages = computed(
  () => Math.ceil(reportStore.chronologicalOrders.length / ITEMS_PER_PAGE) || 1
)

const paginatedOrders = computed(() => {
  const start = (currentPage.value - 1) * ITEMS_PER_PAGE
  const end = start + ITEMS_PER_PAGE
  return reportStore.chronologicalOrders.slice(start, end)
})

const startIndex = computed(() => (currentPage.value - 1) * ITEMS_PER_PAGE + 1)
const endIndex = computed(() =>
  Math.min(currentPage.value * ITEMS_PER_PAGE, reportStore.chronologicalOrders.length)
)

const nextPage = () => {
  if (currentPage.value < totalPages.value) currentPage.value++
}

const prevPage = () => {
  if (currentPage.value > 1) currentPage.value--
}

watch(
  () => [reportStore.selectedDate, reportStore.selectedPaymentMethod],
  () => {
    currentPage.value = 1
  }
)

/**
 * "exchange rate $1 = 4100khr" — combined USD/KHR display per the acceptance criteria.
 */
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
