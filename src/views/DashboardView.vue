<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'
import { APP_ROUTES } from '@/constants/appRoutes'
import {
  DollarSign,
  ShoppingBag,
  Users,
  Download,
  Star,
  TrendingDown,
  AlertTriangle,
  LoaderCircle,
} from 'lucide-vue-next'
import { USD_SYMBOL } from '@/constants/currency'
import { STOCK_STATUS, SELLING_TABLE, SELLING_TYPE } from '@/constants/analytics'
import AnalyticsStatCard from '@/components/analytics/AnalyticsStatCard.vue'
import SalesBarChart from '@/components/analytics/SalesBarChart.vue'
import ItemPeriodFilter from '@/components/analytics/ItemPeriodFilter.vue'
import GlobalDateFilter from '@/components/analytics/GlobalDateFilter.vue'
import { resolveGlobalRange } from '@/components/analytics/globalRange'
import type {
  GlobalRangeKey,
  GlobalRangeValue,
  ItemPeriod,
  ItemPeriodSelection,
  DisplayItem,
  StockAlert,
} from '@/types/analytics.types'
import { getSellingItems, getKpiSummary, getInventoryInsights, getSalesTrend } from '@/api/report'
import type {
  KpiRange,
  KpiSummary,
  SalesTrendGranularity,
  SalesTrendPoint,
} from '@/types/report.types'

const { t, tm, locale } = useI18n()
const router = useRouter()

// Low-stock card action: jump to the full inventory management page.
const goToInventory = () => router.push({ name: APP_ROUTES.INVENTORY.name })

// Short month names for the active locale, sourced from our own i18n messages
// so dates localize even where the runtime's Intl lacks Khmer (km) data.
const monthNames = computed(() => tm('analytics.monthsShort') as unknown as string[])

// One calendar day, ordered per locale: "Jul 16, 2026" (en) / "16 កក្កដា 2026" (kh).
const formatDay = (d: Date, withYear = true) => {
  const m = monthNames.value[d.getMonth()] ?? ''
  const day = d.getDate()
  const year = d.getFullYear()
  if (locale.value === 'kh') return withYear ? `${day} ${m} ${year}` : `${day} ${m}`
  return withYear ? `${m} ${day}, ${year}` : `${m} ${day}`
}

// --- Global page filter (drives every widget) ---
// Selecting a global range refetches all widgets against that window. Each
// widget's own filter can still override it locally afterwards, until the next
// global change re-broadcasts to all of them.
const globalRange = ref<GlobalRangeValue>(resolveGlobalRange('today'))
const globalDateRange = computed(() => ({
  startDate: globalRange.value.startDate,
  endDate: globalRange.value.endDate,
}))

// Formats an inclusive window as e.g. "Jul 14, 2026" (single day) or
// "Jul 1 – Jul 14, 2026" (year shown once when both ends share it).
const formatDateRange = (s: Date, e: Date) => {
  const sameDay =
    s.getFullYear() === e.getFullYear() &&
    s.getMonth() === e.getMonth() &&
    s.getDate() === e.getDate()
  if (sameDay) return formatDay(s)
  // Omit the start year when both ends share it (e.g. "Jul 1 – Jul 16, 2026").
  const sameYear = s.getFullYear() === e.getFullYear()
  return `${formatDay(s, !sameYear)} – ${formatDay(e)}`
}

// Human-readable label for the active global window, shown on the KPI cards in
// place of a "vs last period" caption.
const rangeDateLabel = computed(() =>
  formatDateRange(new Date(globalRange.value.startDate), new Date(globalRange.value.endDate))
)

// Chart "follow the global filter" flag: reset to true on every global change;
// flipped to false when the user picks a granularity. The selling tables instead
// mirror the global window directly into their own filter state (see below).
const chartUseGlobal = ref(true)

// --- Time range tabs — a shortcut view of the global filter ---
// Clicking a tab sets the global range (and so updates the global filter
// button and every widget); the active tab mirrors the current global range.
const rangeOptions = [
  { key: 'today', label: 'analytics.range.today' },
  { key: 'yesterday', label: 'analytics.range.yesterday' },
  { key: 'last7', label: 'analytics.range.last7Days' },
  { key: 'monthly', label: 'analytics.range.monthly' },
  { key: 'yearly', label: 'analytics.range.yearly' },
] as const

// The "Monthly"/"Yearly" tabs map to the global "This Month"/"This Year"
// presets; the others match 1:1.
const tabToGlobal: Record<string, GlobalRangeKey> = {
  today: 'today',
  yesterday: 'yesterday',
  last7: 'last7',
  monthly: 'thisMonth',
  yearly: 'thisYear',
}
const activeTab = computed(() => {
  const key = globalRange.value.key
  if (key === 'thisMonth') return 'monthly'
  if (key === 'thisYear') return 'yearly'
  return key
})

// Maps a global preset to the KPI endpoint's range enum (+ explicit window for custom).
const kpiRangeFromGlobal = (): { range: KpiRange; useDates: boolean } => {
  const key = globalRange.value.key
  if (key === 'custom') return { range: 'custom', useDates: true }
  if (key === 'thisMonth') return { range: 'monthly', useDates: false }
  if (key === 'thisYear') return { range: 'yearly', useDates: false }
  return { range: key, useDates: false }
}

// --- KPI cards (fetched, respond to the range tabs) ---
const kpi = ref<KpiSummary | null>(null)
const kpiLoading = ref(false)

const formatUSD = (v: number) =>
  `${USD_SYMBOL}${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const stats = computed(() => [
  {
    label: 'analytics.kpi.netSales',
    value: kpi.value ? formatUSD(kpi.value.netSales) : '—',
    icon: DollarSign,
    iconBgClass: 'bg-[#FDF2F0] dark:bg-[#D2691E]/15',
    iconColorClass: 'text-[#D2691E]',
    trend: kpi.value?.netSalesTrend ?? null,
    trendLabel: rangeDateLabel.value,
  },
  {
    label: 'analytics.kpi.totalOrders',
    value: kpi.value ? kpi.value.totalOrders.toLocaleString('en-US') : '—',
    icon: ShoppingBag,
    iconBgClass: 'bg-[#EFF6FF] dark:bg-[#3B82F6]/15',
    iconColorClass: 'text-[#3B82F6]',
    trend: kpi.value?.totalOrdersTrend ?? null,
    trendLabel: rangeDateLabel.value,
  },
  {
    label: 'analytics.kpi.activeStaff',
    value: kpi.value ? String(kpi.value.activeStaff) : '—',
    icon: Users,
    iconBgClass: 'bg-[#F0FDF4] dark:bg-[#22C55E]/15',
    iconColorClass: 'text-[#22C55E]',
    trend: null,
    trendLabel: t('analytics.kpi.currentlyClockedIn'),
  },
])

// Monotonic request token: each call claims the next id, and only the response
// whose id is still the latest may commit. A slower earlier request that
// resolves after a newer one is discarded, so stale data never overwrites the
// current selection.
let kpiRequestId = 0
const fetchKpi = async () => {
  const requestId = ++kpiRequestId
  kpiLoading.value = true
  try {
    const { range, useDates } = kpiRangeFromGlobal()
    const summary = await getKpiSummary(range, useDates ? globalDateRange.value : undefined)
    if (requestId !== kpiRequestId) return
    kpi.value = summary
  } catch {
    if (requestId !== kpiRequestId) return
    toast.error(t('analytics.loadError'))
  } finally {
    if (requestId === kpiRequestId) kpiLoading.value = false
  }
}

// A range-tab click drives the global filter (updating the button + all widgets).
const selectRange = (key: (typeof rangeOptions)[number]['key']) => {
  globalRange.value = resolveGlobalRange(tabToGlobal[key])
}

// --- Net Sales Overview chart (Weekly / Monthly / Yearly) ---
const chartGranularity = ref<SalesTrendGranularity>('weekly')
const chartData = ref<SalesTrendPoint[]>([])
const chartLoading = ref(false)

// Same latest-wins guard as the KPI fetch: rapid granularity/range changes can
// leave overlapping trend requests in flight; only the newest commits its points.
let chartRequestId = 0
const fetchSalesTrend = async () => {
  const requestId = ++chartRequestId
  chartLoading.value = true
  try {
    const { points } = chartUseGlobal.value
      ? await getSalesTrend(chartGranularity.value, globalDateRange.value)
      : await getSalesTrend(chartGranularity.value)
    if (requestId !== chartRequestId) return
    chartData.value = points
  } catch {
    if (requestId !== chartRequestId) return
    toast.error(t('analytics.loadError'))
  } finally {
    if (requestId === chartRequestId) chartLoading.value = false
  }
}

// A granularity-tab click overrides the global window for the chart only,
// reverting it to the fixed weekly/monthly/yearly view.
const selectGranularity = (key: SalesTrendGranularity) => {
  chartUseGlobal.value = false
  chartGranularity.value = key
  fetchSalesTrend()
}

const granularityTabs = [
  { key: 'weekly', label: 'analytics.granularity.weekly' },
  { key: 'monthly', label: 'analytics.granularity.monthly' },
  { key: 'yearly', label: 'analytics.granularity.yearly' },
] as const

// --- Best / Lowest selling items (fetched per card, filterable by period) ---
// Badge palette for best-seller categories, picked deterministically by name.
const CATEGORY_PALETTE = [
  'bg-[#FDF2F0] text-[#D2691E]',
  'bg-[#FEF9C3] text-[#A16207]',
  'bg-[#E0F2FE] text-[#0369A1]',
  'bg-[#DCFCE7] text-[#15803D]',
  'bg-[#FCE7F3] text-[#BE185D]',
  'bg-[#F5F3FF] text-[#8B5CF6]',
]
const categoryClass = (name: string) => {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash += name.charCodeAt(i)
  return CATEGORY_PALETTE[hash % CATEGORY_PALETTE.length]
}

// Companion value holds a "YYYY-MM-DD..YYYY-MM-DD" window when period is 'range'.
const bestPeriod = ref<ItemPeriod>('thisWeek')
const bestValue = ref('')
const bestSelling = ref<DisplayItem[]>([])
const bestLoading = ref(false)

const lowestPeriod = ref<ItemPeriod>('thisWeek')
const lowestValue = ref('')
const lowestSelling = ref<DisplayItem[]>([])
const lowestLoading = ref(false)

// Resolves an item-table's local period into an inclusive [start, end] window,
// mirroring the backend's getItemReportRange so the label matches the data.
const resolveItemPeriod = (period: ItemPeriod, value: string): { start: Date; end: Date } => {
  const ref_ = new Date()
  const end = ref_
  if (period === 'thisWeek') {
    const start = new Date(ref_)
    const mondayOffset = (start.getDay() + 6) % 7
    start.setDate(start.getDate() - mondayOffset)
    start.setHours(0, 0, 0, 0)
    return { start, end }
  }
  if (period === 'thisMonth')
    return { start: new Date(ref_.getFullYear(), ref_.getMonth(), 1), end }
  if (period === 'thisYear') return { start: new Date(ref_.getFullYear(), 0, 1), end }
  // range: a custom "YYYY-MM-DD..YYYY-MM-DD" window (local calendar days).
  const [s, e] = value.split('..')
  const [sy, sm, sd] = (s ?? '').split('-').map(Number)
  const [ey, em, ed] = (e ?? '').split('-').map(Number)
  return {
    start: new Date(sy || ref_.getFullYear(), (sm || 1) - 1, sd || 1, 0, 0, 0, 0),
    end: new Date(ey || ref_.getFullYear(), (em || 1) - 1, ed || 1, 23, 59, 59, 999),
  }
}

// Date label shown beside each card title, derived from that table's own filter
// selection (which mirrors the global window until the user overrides it).
const bestDateLabel = computed(() => {
  const { start, end } = resolveItemPeriod(bestPeriod.value, bestValue.value)
  return formatDateRange(start, end)
})
const lowestDateLabel = computed(() => {
  const { start, end } = resolveItemPeriod(lowestPeriod.value, lowestValue.value)
  return formatDateRange(start, end)
})

// Independent latest-wins tokens per table, so a slow response for one table's
// older selection can't replace the rows it now shows.
let bestRequestId = 0
let lowestRequestId = 0

const fetchSellingItems = async (which: (typeof SELLING_TABLE)[keyof typeof SELLING_TABLE]) => {
  const isBest = which === SELLING_TABLE.BEST
  const period = isBest ? bestPeriod.value : lowestPeriod.value
  const value = isBest ? bestValue.value : lowestValue.value
  const loading = isBest ? bestLoading : lowestLoading
  const requestId = isBest ? ++bestRequestId : ++lowestRequestId
  // Read the token live so we compare against the newest request, not a snapshot.
  const isCurrent = () => requestId === (isBest ? bestRequestId : lowestRequestId)

  // A custom range overrides the preset `period` on the backend via dates.
  let window: { startDate: string; endDate: string } | undefined
  if (period === 'range') {
    const { start, end } = resolveItemPeriod('range', value)
    window = { startDate: start.toISOString(), endDate: end.toISOString() }
  }

  loading.value = true
  try {
    const { items } = await getSellingItems({
      type: isBest ? SELLING_TYPE.TOP : SELLING_TYPE.BOTTOM,
      // 'range' is a UI-only period; send a valid enum since dates take over.
      period: period === 'range' ? 'thisWeek' : period,
      startDate: window?.startDate,
      endDate: window?.endDate,
    })
    if (!isCurrent()) return
    const mapped: DisplayItem[] = items.map(i => ({
      id: i.productId,
      name: i.name,
      category: i.category,
      catClass: isBest ? categoryClass(i.category) : '',
      units: i.quantity,
    }))
    if (isBest) bestSelling.value = mapped
    else lowestSelling.value = mapped
  } catch {
    if (!isCurrent()) return
    toast.error(t('analytics.loadError'))
  } finally {
    if (isCurrent()) loading.value = false
  }
}

// A per-table filter change overrides the global window for that table only,
// until the next global change re-syncs it. The filter emits period + value as
// one atomic selection, so applying it commits both and fires a single request.
const setBestSelection = ({ period, value }: ItemPeriodSelection) => {
  bestPeriod.value = period
  bestValue.value = value
  fetchSellingItems(SELLING_TABLE.BEST)
}
const setLowestSelection = ({ period, value }: ItemPeriodSelection) => {
  lowestPeriod.value = period
  lowestValue.value = value
  fetchSellingItems(SELLING_TABLE.LOWEST)
}

// --- Low stock alerts (fetched from inventory insights) ---
const lowStock = ref<StockAlert[]>([])
const lowStockLoading = ref(false)

const fetchInventoryInsights = async () => {
  lowStockLoading.value = true
  try {
    const insights = await getInventoryInsights()
    // Out-of-stock ingredients are surfaced as critical, at-threshold ones as low.
    lowStock.value = [
      ...insights.outOfStock.map(i => ({
        id: i.id,
        name: i.name,
        status: STOCK_STATUS.CRITICAL,
        remaining: i.currentStock,
        unit: i.unitOfMeasure,
      })),
      ...insights.lowStock.map(i => ({
        id: i.id,
        name: i.name,
        status: STOCK_STATUS.LOW,
        remaining: i.currentStock,
        unit: i.unitOfMeasure,
      })),
    ]
  } catch {
    toast.error(t('analytics.loadError'))
  } finally {
    lowStockLoading.value = false
  }
}

// Maps the active global window into a selling-table filter selection: the
// month/year presets map directly; every other window becomes an explicit range.
const globalToItemFilter = (): { period: ItemPeriod; value: string } => {
  const key = globalRange.value.key
  if (key === 'thisMonth') return { period: 'thisMonth', value: '' }
  if (key === 'thisYear') return { period: 'thisYear', value: '' }
  const pad = (n: number) => String(n).padStart(2, '0')
  const toInput = (iso: string) => {
    const d = new Date(iso)
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  }
  return {
    period: 'range',
    value: `${toInput(globalRange.value.startDate)}..${toInput(globalRange.value.endDate)}`,
  }
}

// Broadcast the global filter to every widget. Runs immediately, so it also
// drives the initial page load.
const applyGlobalRange = () => {
  chartUseGlobal.value = true
  // Mirror the global window into the selling-table filters so they display and
  // query the same range as the global filter.
  const synced = globalToItemFilter()
  bestPeriod.value = synced.period
  bestValue.value = synced.value
  lowestPeriod.value = synced.period
  lowestValue.value = synced.value
  fetchKpi()
  fetchSalesTrend()
  fetchSellingItems(SELLING_TABLE.BEST)
  fetchSellingItems(SELLING_TABLE.LOWEST)
}

watch(globalRange, applyGlobalRange, { immediate: true })

// Low-stock alerts don't depend on the global date range, so fetch them once on
// mount rather than on every filter change (which would fire redundant,
// overlapping requests).
fetchInventoryInsights()

const stockBadgeClass = (status: string) =>
  status === STOCK_STATUS.CRITICAL
    ? 'bg-[#FEE2E2] text-[#DC2626] dark:bg-[#DC2626]/15'
    : 'bg-[#FEF3C7] text-[#B45309] dark:bg-[#B45309]/15'
</script>

<template>
  <div class="flex h-full flex-col overflow-hidden bg-[#F9FAFB] font-body dark:bg-stone-900">
    <div
      class="flex-1 overflow-y-auto px-6 py-8 [&::-webkit-scrollbar-thumb]:rounded-[10px] [&::-webkit-scrollbar-thumb]:bg-[#e5e7eb] [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar]:w-[5px]"
    >
      <div class="mx-auto w-full space-y-8">
        <!-- Page header -->
        <div class="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div class="flex items-center gap-3">
            <!-- Global page filter (drives every widget) -->
            <!-- Range tabs (local override for the KPI cards) -->
            <div
              class="flex items-center gap-1 rounded-xl border border-slate-100 bg-white p-1 dark:border-stone-800 dark:bg-stone-900/50"
            >
              <Button
                v-for="opt in rangeOptions"
                :key="opt.key"
                type="button"
                variant="tertiary"
                :class="[
                  'h-auto rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all',
                  activeTab === opt.key
                    ? 'bg-[#D2691E] text-white shadow-sm'
                    : 'text-[#737373] hover:bg-slate-50 dark:text-stone-400 dark:hover:bg-stone-800',
                ]"
                @click="selectRange(opt.key)"
              >
                {{ t(opt.label) }}
              </Button>
            </div>
            <GlobalDateFilter v-model="globalRange" />
          </div>

          <div class="flex flex-wrap items-center gap-3">
            <Button
              class="h-10 gap-2 rounded-xl bg-[#1A1C1C] px-5 font-bold text-white shadow-none transition-all hover:bg-[#333] dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-white"
            >
              <Download class="size-4" />
              {{ t('analytics.exportReport') }}
            </Button>
          </div>
        </div>

        <!-- KPI cards -->
        <div
          class="grid grid-cols-1 gap-6 transition-opacity sm:grid-cols-3"
          :class="kpiLoading ? 'opacity-60' : ''"
        >
          <AnalyticsStatCard
            v-for="s in stats"
            :key="s.label"
            :label="t(s.label)"
            :value="s.value"
            :icon="s.icon"
            :icon-bg-class="s.iconBgClass"
            :icon-color-class="s.iconColorClass"
            :trend="s.trend"
            :trend-label="s.trendLabel"
          />
        </div>

        <!-- Net Sales Overview -->
        <div
          class="rounded-2xl border border-transparent bg-white p-6 shadow-sm dark:border-stone-800 dark:bg-stone-900/50 lg:p-8"
        >
          <div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 class="text-lg font-bold text-[#1A1C1C] dark:text-stone-100">
                {{ t('analytics.chart.netSalesOverview') }}
              </h2>
              <p class="mt-1 text-sm text-[#A3A3A3] dark:text-stone-500">
                {{ t('analytics.chart.subtitle') }}
              </p>
            </div>

            <div class="flex items-center gap-3">
              <div
                class="flex items-center gap-1 rounded-xl border border-slate-100 bg-[#FAFAFA] p-1 dark:border-stone-800 dark:bg-stone-800/50"
              >
                <Button
                  v-for="tab in granularityTabs"
                  :key="tab.key"
                  type="button"
                  variant="tertiary"
                  :class="[
                    'h-auto rounded-lg px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide transition-all',
                    !chartUseGlobal && chartGranularity === tab.key
                      ? 'bg-white text-[#D2691E] shadow-sm dark:bg-stone-900'
                      : 'text-[#A3A3A3] hover:text-[#737373] dark:text-stone-500',
                  ]"
                  @click="selectGranularity(tab.key)"
                >
                  {{ t(tab.label) }}
                </Button>
              </div>
            </div>
          </div>

          <div class="transition-opacity" :class="chartLoading ? 'opacity-60' : ''">
            <SalesBarChart :data="chartData" :prefix="USD_SYMBOL" />
          </div>
        </div>

        <!-- Best / Lowest selling -->
        <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <!-- Top 5 -->
          <div
            class="rounded-2xl border border-transparent bg-white p-6 shadow-sm dark:border-stone-800 dark:bg-stone-900/50"
          >
            <div class="mb-5 flex items-center justify-between">
              <div class="flex items-center gap-2.5">
                <Star class="size-5 fill-[#F59E0B] text-[#F59E0B]" />
                <h2 class="text-base font-bold text-[#1A1C1C] dark:text-stone-100">
                  {{ t('analytics.bestSelling') }}
                </h2>
                <span
                  class="whitespace-nowrap rounded-md bg-[#FAFAFA] px-2 py-0.5 text-[11px] font-bold text-[#737373] dark:bg-stone-800 dark:text-stone-400"
                >
                  {{ bestDateLabel }}
                </span>
              </div>
              <div class="flex items-center gap-3">
                <ItemPeriodFilter
                  :period="bestPeriod"
                  :value="bestValue"
                  @update:selection="setBestSelection"
                />
              </div>
            </div>

            <div class="overflow-x-auto">
              <table class="w-full border-spacing-0 text-left">
                <thead>
                  <tr
                    class="border-b border-slate-50 text-[10px] font-bold uppercase tracking-wider text-[#A3A3A3] dark:border-stone-800"
                  >
                    <th class="pb-3 font-bold">{{ t('analytics.table.item') }}</th>
                    <th class="pb-3 font-bold">{{ t('analytics.table.category') }}</th>
                    <th class="pb-3 text-right font-bold">{{ t('analytics.table.unitsSold') }}</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-50 dark:divide-stone-800">
                  <tr v-if="bestLoading">
                    <td colspan="3" class="py-14 text-center">
                      <LoaderCircle class="mx-auto size-6 animate-spin text-[#D2691E]/50" />
                    </td>
                  </tr>
                  <tr v-else-if="bestSelling.length === 0">
                    <td colspan="3" class="py-14 text-center text-sm font-semibold text-slate-300">
                      {{ t('analytics.noItemData') }}
                    </td>
                  </tr>
                  <tr v-for="item in bestSelling" v-else :key="item.id" class="group">
                    <td class="py-3.5">
                      <div class="flex items-center gap-3">
                        <div
                          class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#FAFAFA] text-sm dark:bg-stone-800"
                        >
                          ☕
                        </div>
                        <span class="text-sm font-bold text-[#1A1C1C] dark:text-stone-100">
                          {{ item.name }}
                        </span>
                      </div>
                    </td>
                    <td class="py-3.5">
                      <span
                        class="inline-flex rounded-md px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide"
                        :class="item.catClass"
                      >
                        {{ item.category }}
                      </span>
                    </td>
                    <td
                      class="py-3.5 text-right text-sm font-bold text-[#1A1C1C] dark:text-stone-100"
                    >
                      {{ item.units }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Bottom 5 -->
          <div
            class="rounded-2xl border border-transparent bg-white p-6 shadow-sm dark:border-stone-800 dark:bg-stone-900/50"
          >
            <div class="mb-5 flex items-center justify-between">
              <div class="flex items-center gap-2.5">
                <TrendingDown class="size-5 text-[#DC2626]" />
                <h2 class="text-base font-bold text-[#1A1C1C] dark:text-stone-100">
                  {{ t('analytics.lowestSelling') }}
                </h2>
                <span
                  class="whitespace-nowrap rounded-md bg-[#FAFAFA] px-2 py-0.5 text-[11px] font-bold text-[#737373] dark:bg-stone-800 dark:text-stone-400"
                >
                  {{ lowestDateLabel }}
                </span>
              </div>
              <div class="flex items-center gap-3">
                <ItemPeriodFilter
                  :period="lowestPeriod"
                  :value="lowestValue"
                  @update:selection="setLowestSelection"
                />
              </div>
            </div>

            <div class="overflow-x-auto">
              <table class="w-full border-spacing-0 text-left">
                <thead>
                  <tr
                    class="border-b border-slate-50 text-[10px] font-bold uppercase tracking-wider text-[#A3A3A3] dark:border-stone-800"
                  >
                    <th class="pb-3 font-bold">{{ t('analytics.table.item') }}</th>
                    <th class="pb-3 font-bold">{{ t('analytics.table.category') }}</th>
                    <th class="pb-3 text-right font-bold">{{ t('analytics.table.unitsSold') }}</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-50 dark:divide-stone-800">
                  <tr v-if="lowestLoading">
                    <td colspan="3" class="py-14 text-center">
                      <LoaderCircle class="mx-auto size-6 animate-spin text-[#D2691E]/50" />
                    </td>
                  </tr>
                  <tr v-else-if="lowestSelling.length === 0">
                    <td colspan="3" class="py-14 text-center text-sm font-semibold text-slate-300">
                      {{ t('analytics.noItemData') }}
                    </td>
                  </tr>
                  <tr v-for="item in lowestSelling" v-else :key="item.id" class="group">
                    <td class="py-3.5">
                      <div class="flex items-center gap-3">
                        <div
                          class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#FAFAFA] text-sm dark:bg-stone-800"
                        >
                          🥡
                        </div>
                        <span class="text-sm font-bold text-[#1A1C1C] dark:text-stone-100">
                          {{ item.name }}
                        </span>
                      </div>
                    </td>
                    <td class="py-3.5">
                      <span class="text-xs font-semibold text-[#737373] dark:text-stone-400">
                        {{ item.category }}
                      </span>
                    </td>
                    <td class="py-3.5 text-right text-sm font-bold text-[#DC2626]">
                      {{ item.units }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- Low stock + Insight -->
        <div class="grid grid-cols-1 gap-6">
          <!-- Low stock alerts -->
          <div
            class="rounded-2xl border border-transparent bg-white p-6 shadow-sm dark:border-stone-800 dark:bg-stone-900/50"
          >
            <div class="mb-5 flex items-center justify-between">
              <div class="flex items-center gap-2.5">
                <AlertTriangle class="size-5 text-[#F59E0B]" />
                <h2 class="text-base font-bold text-[#1A1C1C] dark:text-stone-100">
                  {{ t('analytics.lowStockAlerts') }}
                </h2>
              </div>
              <Button
                type="button"
                variant="tertiary"
                class="h-auto px-0 text-xs font-bold text-[#D2691E] hover:bg-transparent hover:underline"
                @click="goToInventory"
              >
                {{ t('analytics.viewInventory') }}
              </Button>
            </div>

            <div class="overflow-x-auto">
              <table class="w-full border-spacing-0 text-left">
                <thead>
                  <tr
                    class="border-b border-slate-50 text-[10px] font-bold uppercase tracking-wider text-[#A3A3A3] dark:border-stone-800"
                  >
                    <th class="pb-3 font-bold">{{ t('analytics.table.item') }}</th>
                    <th class="pb-3 font-bold">{{ t('analytics.table.status') }}</th>
                    <th class="pb-3 text-right font-bold">{{ t('analytics.table.remaining') }}</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-50 dark:divide-stone-800">
                  <tr v-if="lowStockLoading">
                    <td colspan="3" class="py-14 text-center">
                      <LoaderCircle class="mx-auto size-6 animate-spin text-[#D2691E]/50" />
                    </td>
                  </tr>
                  <tr v-else-if="lowStock.length === 0">
                    <td colspan="3" class="py-14 text-center text-sm font-semibold text-slate-300">
                      {{ t('analytics.stock.allStocked') }}
                    </td>
                  </tr>
                  <tr v-for="item in lowStock" v-else :key="item.id" class="group">
                    <td class="py-3.5">
                      <div class="flex items-center gap-3">
                        <div
                          class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#FAFAFA] text-sm dark:bg-stone-800"
                        >
                          📦
                        </div>
                        <span class="text-sm font-bold text-[#1A1C1C] dark:text-stone-100">
                          {{ item.name }}
                        </span>
                      </div>
                    </td>
                    <td class="py-3.5">
                      <span
                        class="inline-flex rounded-md px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide"
                        :class="stockBadgeClass(item.status)"
                      >
                        {{
                          item.status === STOCK_STATUS.CRITICAL
                            ? t('analytics.stock.critical')
                            : t('analytics.stock.lowStock')
                        }}
                      </span>
                    </td>
                    <td class="py-3.5 text-right text-sm font-bold text-[#DC2626]">
                      {{ item.remaining }} {{ item.unit }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
