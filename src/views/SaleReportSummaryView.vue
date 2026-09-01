<template>
  <div class="flex h-full flex-col bg-[#F9FAFB] dark:bg-stone-900 font-body overflow-hidden">
    <div class="flex-1 overflow-y-auto custom-scrollbar px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
      <div class="w-full space-y-6 lg:space-y-8">
        <!-- Export action. The page is titled by the top navbar. -->
        <div class="flex justify-end">
          <Button
            type="button"
            variant="primary"
            class="h-10 shrink-0 px-5 w-full sm:w-auto"
            @click="isExportDialogOpen = true"
          >
            <FileSpreadsheet class="h-4 w-4" />
            {{ t('reports.export.button') }}
          </Button>
        </div>

        <!-- auto-fit wraps the tiles on the ACTUAL available width (robust to the
             sidebar), so tablets get 1–2 full-width cards instead of 3 cramped ones. -->
        <div class="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-4 sm:gap-6">
          <StaffStatCard
            class="min-h-[90px]"
            :label="t('reports.total_revenue_today')"
            :value="formattedTotalRevenue"
            :icon="DollarSign"
            label-class="text-xs md:text-sm font-medium"
            value-class="text-base sm:text-lg font-bold"
            bg-color-class="bg-[#FDF2F0]"
            icon-color-class="text-[#E26D5C]"
          />

          <StaffStatCard
            class="min-h-[90px]"
            :label="t('reports.cash_drawer_expected')"
            :value="formattedCashTotal"
            :icon="Wallet"
            label-class="text-xs md:text-sm font-medium"
            value-class="text-base sm:text-lg font-bold"
            bg-color-class="bg-[#F0FDF4]"
            icon-color-class="text-[#22C55E]"
          />

          <StaffStatCard
            class="min-h-[90px]"
            :label="t('reports.khqr_expected')"
            :value="formattedKhqrTotal"
            :icon="QrCode"
            label-class="text-xs md:text-sm font-medium"
            value-class="text-base sm:text-lg font-bold"
            bg-color-class="bg-[#F8FAFC]"
            icon-color-class="text-slate-400"
          />
        </div>

        <Card
          class="gap-0 overflow-hidden rounded-xl border-none bg-white p-0 text-[#1A1C1C] shadow-sm flex flex-col"
        >
          <!-- Filter Panel -->
          <FilterPanel
            :has-active-filters="hasActiveFilters"
            actions-class="col-span-12 lg:col-span-3"
            @submit="applyFilters"
            @clear="clearFilters"
          >
            <!-- Start Date Filter -->
            <div class="flex flex-col gap-1 col-span-12 sm:col-span-6 lg:col-span-3">
              <Label
                for="report-filter-date"
                class="text-xs font-semibold uppercase tracking-wide text-[#1A1C1C]/50 dark:text-stone-400"
              >
                {{ t('reports.startDate') }}
              </Label>
              <AppInput
                id="report-filter-date"
                v-model="reportStore.selectedDate"
                type="date"
                :max="todayIsoDate"
                class="h-10 w-full cursor-pointer rounded-md border-none bg-stone-50 px-3 text-sm text-[#1A1C1C] shadow-none transition-colors focus:outline-none focus:ring-2 focus:ring-primary dark:bg-stone-800 dark:text-stone-100"
              />
            </div>

            <!-- End Date Filter -->
            <div class="flex flex-col gap-1 col-span-12 sm:col-span-6 lg:col-span-3">
              <Label
                for="report-filter-end-date"
                class="text-xs font-semibold uppercase tracking-wide text-[#1A1C1C]/50 dark:text-stone-400"
              >
                {{ t('reports.endDate') }}
              </Label>
              <AppInput
                id="report-filter-end-date"
                v-model="reportStore.selectedEndDate"
                type="date"
                :min="reportStore.selectedDate"
                :max="todayIsoDate"
                class="h-10 w-full cursor-pointer rounded-md border-none bg-stone-50 px-3 text-sm text-[#1A1C1C] shadow-none transition-colors focus:outline-none focus:ring-2 focus:ring-primary dark:bg-stone-800 dark:text-stone-100"
              />
            </div>

            <!-- Payment Method Filter -->
            <AppSelect
              v-model="reportStore.selectedPaymentMethod"
              :options="paymentMethodOptions"
              :label="t('reports.paymentMethods')"
              :all-option-label="t('reports.filters.all')"
              class="w-full col-span-12 sm:col-span-6 lg:col-span-3"
            />
          </FilterPanel>

          <div v-if="reportStore.isLoading" class="p-10 text-center text-sm text-[#A3A3A3]">
            {{ t('reports.loading') }}
          </div>

          <div v-else-if="reportStore.error" class="p-10 text-center text-sm text-red-500">
            {{ t(reportStore.error) }}
          </div>

          <template v-else>
            <Table class="min-w-[940px] text-left">
              <TableHeader>
                <TableRow
                  class="bg-[#FCFCFC] text-[11px] font-black uppercase text-[#A3A3A3] hover:bg-[#FCFCFC] dark:bg-stone-800 dark:text-stone-500 dark:hover:bg-stone-800"
                >
                  <TableHead class="px-6 py-4">{{ t('reports.table.time') }}</TableHead>
                  <TableHead class="px-6 py-4">{{ t('reports.table.orderId') }}</TableHead>
                  <TableHead class="px-6 py-4">{{ t('reports.table.cashier') }}</TableHead>
                  <TableHead class="px-6 py-4">{{ t('reports.table.type') }}</TableHead>
                  <TableHead class="px-6 py-4 text-center">
                    {{ t('reports.table.payment') }}
                  </TableHead>
                  <TableHead class="px-6 py-4 text-center">
                    {{ t('reports.table.method') }}
                  </TableHead>
                  <TableHead class="px-6 py-4 text-center">
                    {{ t('reports.table.total') }}
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                <TableEmpty
                  v-if="filteredOrders.length === 0"
                  :colspan="7"
                  class="text-[#A3A3A3] dark:text-stone-500"
                >
                  {{ t('reports.table.empty') }}
                </TableEmpty>

                <TableRow
                  v-for="order in paginatedOrders"
                  v-else
                  :key="order.id"
                  class="border-[#F2F2F2] text-sm dark:border-stone-800"
                >
                  <TableCell class="px-6 py-4 text-[#6B6B6B] dark:text-stone-400">
                    <div class="font-medium text-[#1A1C1C] dark:text-stone-100">
                      {{ formatDate(order.createdAt) }}
                    </div>
                    <div class="text-xs">{{ formatTime(order.createdAt) }}</div>
                  </TableCell>
                  <TableCell class="px-6 py-4 font-semibold">#{{ order.orderNumber }}</TableCell>

                  <!-- Cashier who took the order ("System" when none was recorded) -->
                  <TableCell class="px-6 py-4 whitespace-nowrap">
                    <span class="inline-flex items-center gap-1.5">
                      {{ cashierName(order.user, t('common.systemCashier')) }}
                      <span
                        v-if="isOwnOrder(order)"
                        class="rounded-full bg-[#fcf3eb] px-1.5 py-px text-[9px] font-extrabold uppercase tracking-wide text-[#b05a18] dark:bg-amber-950/20 dark:text-amber-500"
                      >
                        {{ t('reports.table.you') }}
                      </span>
                    </span>
                  </TableCell>

                  <TableCell class="px-6 py-4">{{ orderTypeLabel(order.orderType) }}</TableCell>
                  <TableCell class="px-6 py-4 text-center">
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
                  </TableCell>
                  <TableCell
                    class="px-6 py-4 text-center uppercase text-[#6B6B6B] dark:text-stone-400"
                  >
                    {{ order.paymentMethod
                    }}<template v-if="order.paymentMethod === 'khqr' && order.bankName">
                      — {{ order.bankName }}</template
                    >
                  </TableCell>
                  <TableCell class="px-6 py-4 text-center font-bold">
                    {{ formatUsd(order.totalAmount) }}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>

            <div
              v-if="filteredOrders.length > 0"
              class="flex items-center justify-between border-t border-[#F2F2F2] px-6 py-4 text-xs font-semibold text-[#A3A3A3]"
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

    <ExportSalesSummaryDialog
      v-model:open="isExportDialogOpen"
      :default-date="reportStore.selectedDate"
      :max-date="todayIsoDate"
    />
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { ref, computed, onMounted, watch } from 'vue'
import {
  DollarSign,
  Wallet,
  QrCode,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
} from 'lucide-vue-next'
import StaffStatCard from '@/components/staff/StaffStatCard.vue'
import { Card } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Label } from '@/components/ui/label'
import AppSelect from '@/components/ui/select/AppSelect.vue'
import FilterPanel from '@/components/common/FilterPanel.vue'
import ExportSalesSummaryDialog from '@/components/reports/ExportSalesSummaryDialog.vue'
import { useReportStore } from '@/store/useReportStore'
import { useAuthStore } from '@/store/useAuthStore'
import { useShopSettingsStore } from '@/store/useShopSettingsStore'
import { cashierName } from '@/utils/cashier'
import type { OrderRow } from '@/types/order.types'

const { t } = useI18n()
const reportStore = useReportStore()
const authStore = useAuthStore()
const shopSettingsStore = useShopSettingsStore()

// Prefix used for a bank-specific payment filter value, e.g. "khqr:ABA".
const BANK_FILTER_PREFIX = 'khqr:'

// Marks the signed-in user's own rows so a cashier can spot their sales at a glance.
const isOwnOrder = (order: OrderRow) => {
  const currentUserId = authStore.user?.user_id ?? authStore.user?.id
  return currentUserId != null && order.user?.id === currentUserId
}

const today = new Date()
const todayIsoDate = new Intl.DateTimeFormat('en-CA').format(today)

const formatUsd = (amount: number | string) => `$${Number(amount).toFixed(2)}`

const isExportDialogOpen = ref(false)

// Cash, all-KHQR, then one option per bank the admin configured in Shop Settings.
// A bank value ("khqr:ABA") is mapped back to 'khqr' before the request (the store
// only sends cash/khqr to the server) and narrowed to that bank on the client.
const paymentMethodOptions = computed(() => [
  { value: 'cash', label: t('reports.filters.cash') },
  { value: 'khqr', label: t('reports.filters.khqr') },
  ...shopSettingsStore.payment_banks.map(bank => ({
    value: `${BANK_FILTER_PREFIX}${bank}`,
    label: `${t('reports.filters.khqr')} — ${bank}`,
  })),
])

const hasActiveFilters = computed(
  () =>
    reportStore.selectedDate !== todayIsoDate ||
    reportStore.selectedEndDate !== todayIsoDate ||
    reportStore.selectedPaymentMethod !== 'all'
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

  // Bank-specific filter: khqr orders paid via that exact bank.
  if (method.startsWith(BANK_FILTER_PREFIX)) {
    const bank = method.slice(BANK_FILTER_PREFIX.length)
    return orders.filter(
      order => order.paymentMethod?.toLowerCase() === 'khqr' && order.bankName === bank
    )
  }

  return orders.filter(order => order.paymentMethod?.toLowerCase() === method.toLowerCase())
})

const ITEMS_PER_PAGE = 10
const currentPage = ref(1)

// Selecting a different method/bank (client-side narrowing) can shrink the result
// set below the current page, so snap back to the first page.
watch(
  () => reportStore.selectedPaymentMethod,
  () => {
    currentPage.value = 1
  }
)

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
  // The end input's `min` can't fix a value already picked before the start moved
  // past it, so snap it up rather than showing a window the fetch won't honour.
  if (reportStore.selectedEndDate < reportStore.selectedDate) {
    reportStore.selectedEndDate = reportStore.selectedDate
  }

  currentPage.value = 1
  await reportStore.fetchDailyOverview()
}

const clearFilters = async () => {
  reportStore.selectedDate = todayIsoDate
  reportStore.selectedEndDate = todayIsoDate
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

// The list can span several days now, so a bare clock time is ambiguous — each
// row carries its calendar date above the time.
const formatDate = (isoString: string) =>
  new Date(isoString).toLocaleDateString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })

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
