<template>
  <div class="flex h-full flex-col bg-[#F9FAFB] dark:bg-stone-900 font-body overflow-hidden">
    <div class="flex-1 overflow-y-auto custom-scrollbar px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
      <div class="w-full space-y-6 lg:space-y-8">
        <!-- Description (the title lives in the top navbar) + export action -->
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p class="text-sm text-[#737373] dark:text-stone-400">
            {{ t('reports.subtitle') }}
          </p>
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

          <div v-if="reportStore.error" class="p-10 text-center text-sm text-red-500">
            {{ t(reportStore.error) }}
          </div>

          <DataTable
            v-else
            :headers="reportHeaders"
            :data="reportOrders"
            :total-count="reportTotal"
            :loading="reportStore.isLoading"
            :pagination="{
              page: reportStore.ordersPage,
              pageSize: reportStore.ordersPageSize,
              showPageSizeSelector: false,
            }"
            :summary-formatter="reportSummary"
            :empty-title="t('reports.table.empty')"
            :empty-description="''"
            :caption="t('reports.title')"
            row-key="id"
            min-width="940px"
            max-height="none"
            client-sort
            class="rounded-none border-0 shadow-none"
            @page-change="handlePageChange"
          >
            <!-- The list can span several days, so each row carries its date -->
            <template #[`cell:createdAt`]="{ row }">
              <div class="font-medium text-[#1A1C1C] dark:text-stone-100">
                {{ formatDate(row.createdAt) }}
              </div>
              <div class="text-xs text-[#6B6B6B] dark:text-stone-400">
                {{ formatTime(row.createdAt) }}
              </div>
            </template>

            <template #[`cell:orderNumber`]="{ row }">
              <span class="font-semibold">#{{ row.orderNumber }}</span>
            </template>

            <!-- Cashier who took the order ("System" when none was recorded) -->
            <template #[`cell:cashier`]="{ row }">
              <span class="inline-flex items-center gap-1.5 whitespace-nowrap">
                {{ cashierName(row.user, t('common.systemCashier')) }}
                <span
                  v-if="isOwnOrder(row)"
                  class="rounded-full bg-[#fcf3eb] px-1.5 py-px text-[9px] font-extrabold uppercase tracking-wide text-[#b05a18] dark:bg-amber-950/20 dark:text-amber-500"
                >
                  {{ t('reports.table.you') }}
                </span>
              </span>
            </template>

            <!-- Paid / unpaid pill -->
            <template #[`cell:paymentStatus`]="{ row }">
              <span
                class="inline-flex rounded-full px-3 py-1 text-[11px] font-bold capitalize"
                :class="
                  row.paymentStatus === 'paid'
                    ? 'bg-[#F0FDF4] text-[#22C55E]'
                    : 'bg-[#FDF2F0] text-[#E26D5C]'
                "
              >
                {{ row.paymentStatus }}
              </span>
            </template>

            <!-- KHQR rows name the bank that settled them -->
            <template #[`cell:paymentMethod`]="{ row }">
              {{ row.paymentMethod
              }}<template v-if="row.paymentMethod === 'khqr' && row.bankName">
                — {{ row.bankName }}</template
              >
            </template>
          </DataTable>
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
import { ref, computed, onMounted } from 'vue'
import { DollarSign, Wallet, QrCode, FileSpreadsheet } from 'lucide-vue-next'
import StaffStatCard from '@/components/staff/StaffStatCard.vue'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { DataTable } from '@/components/ui/table'
import type { DataTableHeader } from '@/types/table.types'
import { Label } from '@/components/ui/label'
import { AppInput } from '@/components/ui/input'
import AppSelect from '@/components/ui/select/AppSelect.vue'
import FilterPanel from '@/components/common/FilterPanel.vue'
import ExportSalesSummaryDialog from '@/components/reports/ExportSalesSummaryDialog.vue'
import { useReportStore } from '@/store/useReportStore'
import { useAuthStore } from '@/store/useAuthStore'
import { useShopSettingsStore } from '@/store/useShopSettingsStore'
import { cashierName } from '@/utils/cashier'
import { shopDateString } from '@/utils/shopDate'
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

// The shop's local "today" (not the browser's), so the default window and the
// date-picker's max match the day the server reports on.
const todayIsoDate = shopDateString(0)

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
 * The rows for the page the DataTable is showing. The server already applied the
 * date window and the cash/khqr filter; only a bank-specific selection
 * ("khqr:ABA") still has to be narrowed here, since the API has no bank filter.
 */
const reportOrders = computed<OrderRow[]>(() => {
  const orders = reportStore.orders || []
  const method = reportStore.selectedPaymentMethod

  if (!method.startsWith(BANK_FILTER_PREFIX)) return orders

  const bank = method.slice(BANK_FILTER_PREFIX.length)
  return orders.filter(
    order => order.paymentMethod?.toLowerCase() === 'khqr' && order.bankName === bank
  )
})

// Row count across every page, straight from the server so the pager knows how
// many pages there are. A bank-specific selection is narrowed per page on the
// client, so for those the total counts all KHQR orders in the window.
const reportTotal = computed(() => reportStore.pagination?.total ?? reportOrders.value.length)

const reportSummary = (range: { from: number; to: number; total: number }) =>
  t('reports.table.pagination', {
    startIndex: range.from,
    endIndex: range.to,
    total: range.total,
  })

const handlePageChange = (page: number) => reportStore.fetchOrdersPage(page)

const applyFilters = async () => {
  // The end input's `min` can't fix a value already picked before the start moved
  // past it, so snap it up rather than showing a window the fetch won't honour.
  if (reportStore.selectedEndDate < reportStore.selectedDate) {
    reportStore.selectedEndDate = reportStore.selectedDate
  }

  // `fetchDailyOverview` restarts at page one for the new window.
  await reportStore.fetchDailyOverview()
}

const clearFilters = async () => {
  reportStore.selectedDate = todayIsoDate
  reportStore.selectedEndDate = todayIsoDate
  reportStore.selectedPaymentMethod = 'all'

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

/* -- Columns. The whole filtered list is here, so sorting spans every row. -- */
const reportHeaders = computed<DataTableHeader<OrderRow>[]>(() => [
  { key: 'createdAt', header: t('reports.table.time'), sortable: true, minWidth: '150px' },
  { key: 'orderNumber', header: t('reports.table.orderId'), sortable: true, width: '140px' },
  { key: 'cashier', header: t('reports.table.cashier'), minWidth: '170px' },
  {
    key: 'orderType',
    header: t('reports.table.type'),
    formatter: ({ row }) => orderTypeLabel(row.orderType),
    sortable: true,
    width: '140px',
  },
  {
    key: 'paymentStatus',
    header: t('reports.table.payment'),
    align: 'center',
    sortable: true,
    width: '140px',
  },
  {
    key: 'paymentMethod',
    header: t('reports.table.method'),
    align: 'center',
    sortable: true,
    width: '130px',
    cellClass: 'uppercase text-[#6B6B6B] dark:text-stone-400',
  },
  {
    key: 'totalAmount',
    header: t('reports.table.total'),
    formatter: ({ row }) => formatUsd(row.totalAmount),
    align: 'center',
    sortable: true,
    // Amounts arrive as strings from the API — compare them as numbers.
    sortAccessor: row => Number(row.totalAmount),
    width: '130px',
    cellClass: 'font-bold',
  },
])

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
