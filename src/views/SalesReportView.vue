<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'
import { toast } from 'vue-sonner'
import { DollarSign, ShoppingBag, Receipt } from 'lucide-vue-next'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import AnalyticsStatCard from '@/components/analytics/AnalyticsStatCard.vue'
import SalesBarChart from '@/components/analytics/SalesBarChart.vue'
import { USD_SYMBOL, KHR_SYMBOL } from '@/constants/currency'
import { useReportStore } from '@/store/useReportStore'
import type { ReportPeriod, SalesTrendGranularity } from '@/types/report.types'

// Sales Report: the period totals (sales-overview), the net-sales trend and one
// day's hour-by-hour breakdown, all of which the API already served but no page
// had yet surfaced.
const { t } = useI18n()
const reportStore = useReportStore()
const {
  salesPeriod,
  salesTrendGranularity,
  hourlyDate,
  salesOverview,
  salesTrendPoints,
  hourlyPoints,
  isSalesReportLoading,
  salesReportError,
} = storeToRefs(reportStore)

const PERIODS: ReportPeriod[] = ['daily', 'weekly', 'monthly']
const GRANULARITIES: SalesTrendGranularity[] = ['weekly', 'monthly', 'yearly']

/** Latest selectable day for the hourly chart — tomorrow has no sales yet. */
const todayIsoDate = new Intl.DateTimeFormat('en-CA').format(new Date())

const formatUSD = (value: number) =>
  `${USD_SYMBOL}${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

// Riel is quoted whole: the smallest note in circulation is 100៛.
const formatKHR = (value: number) => `${Math.round(value).toLocaleString('en-US')}${KHR_SYMBOL}`

const stats = computed(() => [
  {
    label: t('reports.sales.totalSales'),
    value: salesOverview.value ? formatUSD(salesOverview.value.totalSales) : '—',
    icon: DollarSign,
    iconBgClass: 'bg-[#FDF2F0] dark:bg-[#D2691E]/15',
    iconColorClass: 'text-[#D2691E]',
  },
  {
    label: t('reports.sales.totalOrders'),
    value: salesOverview.value ? salesOverview.value.totalOrders.toLocaleString('en-US') : '—',
    icon: ShoppingBag,
    iconBgClass: 'bg-[#EFF6FF] dark:bg-[#3B82F6]/15',
    iconColorClass: 'text-[#3B82F6]',
  },
  {
    label: t('reports.sales.averageOrderValue'),
    value: salesOverview.value ? formatUSD(salesOverview.value.averageOrderValue) : '—',
    icon: Receipt,
    iconBgClass: 'bg-[#F0FDF4] dark:bg-[#16A34A]/15',
    iconColorClass: 'text-[#16A34A]',
  },
])

/** The USD/KHR split, laid out as label/value rows under the headline cards. */
const currencyRows = computed(() => {
  const overview = salesOverview.value
  return [
    {
      key: 'salesUsd',
      label: t('reports.sales.salesUsd'),
      value: overview ? formatUSD(overview.salesUSD) : '—',
    },
    {
      key: 'salesKhr',
      label: t('reports.sales.salesKhr'),
      value: overview ? formatKHR(overview.salesKHR) : '—',
    },
    {
      key: 'avgUsd',
      label: t('reports.sales.averageUsd'),
      value: overview ? formatUSD(overview.averageOrderValueUSD) : '—',
    },
    {
      key: 'avgKhr',
      label: t('reports.sales.averageKhr'),
      value: overview ? formatKHR(overview.averageOrderValueKHR) : '—',
    },
  ]
})

const hasHourlySales = computed(() => hourlyPoints.value.some(point => point.value > 0))

// Each control refetches only the widget it drives.
watch(salesPeriod, () => reportStore.fetchSalesOverview())
watch(salesTrendGranularity, () => reportStore.fetchSalesTrend())
watch(hourlyDate, () => reportStore.fetchHourlyBreakdown())

watch(salesReportError, key => {
  if (key) toast.error(t(key))
})

onMounted(() => reportStore.fetchSalesReport())
</script>

<template>
  <div
    class="h-full overflow-y-auto bg-[#F9FAFB] p-8 text-[#1A1C1C] dark:bg-stone-900 dark:text-stone-100"
  >
    <div class="w-full space-y-6">
      <!-- Period filter. The page is titled by the top navbar. -->
      <div class="flex justify-end">
        <div
          class="flex shrink-0 items-center gap-1 rounded-xl border border-slate-100 bg-white p-1 dark:border-stone-800 dark:bg-stone-900/50"
        >
          <Button
            v-for="period in PERIODS"
            :key="period"
            type="button"
            variant="tertiary"
            :class="[
              'h-auto shrink-0 rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all',
              salesPeriod === period
                ? 'bg-[#D2691E] text-white shadow-sm hover:bg-[#D2691E] hover:text-white'
                : 'text-[#737373] hover:bg-slate-50 hover:text-[#1A1C1C] dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-100',
            ]"
            @click="salesPeriod = period"
          >
            {{ t(`reports.sales.period.${period}`) }}
          </Button>
        </div>
      </div>

      <!-- Period totals -->
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <AnalyticsStatCard
          v-for="stat in stats"
          :key="stat.label"
          :label="stat.label"
          :value="stat.value"
          :icon="stat.icon"
          :icon-bg-class="stat.iconBgClass"
          :icon-color-class="stat.iconColorClass"
        />
      </div>

      <!-- Settlement-currency split -->
      <Card
        class="rounded-xl border-none bg-white p-5 shadow-sm dark:border dark:border-stone-800 dark:bg-stone-900"
      >
        <h2 class="text-sm font-black uppercase tracking-wide text-[#A3A3A3] dark:text-stone-500">
          {{ t('reports.sales.currencySplit') }}
        </h2>
        <div class="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <div v-for="row in currencyRows" :key="row.key">
            <p class="text-[11px] font-bold uppercase tracking-wider text-[#A3A3A3]">
              {{ row.label }}
            </p>
            <p class="mt-1 text-xl font-bold">{{ row.value }}</p>
          </div>
        </div>
      </Card>

      <!-- Net-sales trend -->
      <Card
        class="rounded-xl border-none bg-white p-5 shadow-sm dark:border dark:border-stone-800 dark:bg-stone-900"
      >
        <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 class="text-sm font-black uppercase tracking-wide text-[#A3A3A3] dark:text-stone-500">
            {{ t('reports.sales.trendTitle') }}
          </h2>
          <div
            class="flex items-center gap-1 rounded-xl border border-slate-100 bg-white p-1 dark:border-stone-800 dark:bg-stone-900/50"
          >
            <Button
              v-for="granularity in GRANULARITIES"
              :key="granularity"
              type="button"
              variant="tertiary"
              :class="[
                'h-auto shrink-0 rounded-lg px-3 py-1 text-xs font-bold transition-all',
                salesTrendGranularity === granularity
                  ? 'bg-[#D2691E] text-white shadow-sm hover:bg-[#D2691E] hover:text-white'
                  : 'text-[#737373] hover:bg-slate-50 hover:text-[#1A1C1C] dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-100',
              ]"
              @click="salesTrendGranularity = granularity"
            >
              {{ t(`analytics.granularity.${granularity}`) }}
            </Button>
          </div>
        </div>
        <SalesBarChart :data="salesTrendPoints" :prefix="USD_SYMBOL" />
      </Card>

      <!-- Hourly breakdown -->
      <Card
        class="rounded-xl border-none bg-white p-5 shadow-sm dark:border dark:border-stone-800 dark:bg-stone-900"
      >
        <div class="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2
              class="text-sm font-black uppercase tracking-wide text-[#A3A3A3] dark:text-stone-500"
            >
              {{ t('reports.sales.hourlyTitle') }}
            </h2>
            <p class="mt-1 text-xs text-[#A3A3A3] dark:text-stone-500">
              {{ t('reports.sales.hourlySubtitle') }}
            </p>
          </div>
          <div class="flex flex-col gap-1">
            <Label
              for="hourly-date"
              class="text-xs font-semibold uppercase tracking-wide text-[#1A1C1C]/50 dark:text-stone-400"
            >
              {{ t('reports.sales.hourlyDate') }}
            </Label>
            <AppInput
              id="hourly-date"
              v-model="hourlyDate"
              type="date"
              :max="todayIsoDate"
              class="h-10 w-48 cursor-pointer rounded-md border-none bg-stone-50 px-3 text-sm text-[#1A1C1C] shadow-none focus:outline-none focus:ring-2 focus:ring-primary dark:bg-stone-800 dark:text-stone-100"
            />
          </div>
        </div>

        <p
          v-if="!isSalesReportLoading && !hasHourlySales"
          class="py-10 text-center text-sm font-bold text-[#A3A3A3] dark:text-stone-500"
        >
          {{ t('reports.sales.hourlyEmpty') }}
        </p>
        <SalesBarChart v-else :data="hourlyPoints" :prefix="USD_SYMBOL" />
      </Card>
    </div>
  </div>
</template>
