<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'
import { ArrowLeft, Download, LoaderCircle } from 'lucide-vue-next'
import { Card } from '@/components/ui/card'
import { DataTable } from '@/components/ui/table'
import type { DataTableHeader } from '@/types/table.types'
import AppSelect from '@/components/ui/select/AppSelect.vue'
import GlobalDateFilter from '@/components/analytics/GlobalDateFilter.vue'
import { resolveGlobalRange } from '@/components/analytics/globalRange'
import type { GlobalRangeKey, GlobalRangeValue } from '@/types/analytics.types'
import type { AdjustmentType, ExportLocale, InventoryHistoryEntry } from '@/types/inventory.types'
import { useInventoryStore } from '@/store/useInventoryStore'
import { useShopSettingsStore } from '@/store/useShopSettingsStore'
import { APP_ROUTES } from '@/constants/appRoutes'

const { t, locale } = useI18n()
const route = useRoute()
const router = useRouter()
const inventoryStore = useInventoryStore()
const shopSettingsStore = useShopSettingsStore()
const { items, historyItems, historyPagination, historyTotals, isHistoryLoading, isExporting } =
  storeToRefs(inventoryStore)

const itemId = computed(() => Number(route.params.id))
const item = computed(() => items.value.find(current => current.id === itemId.value) ?? null)

const numberLocale = computed(() => (locale.value === 'kh' ? 'km-KH' : locale.value))
const formatMoney = (amount: number) => shopSettingsStore.formatAmount(amount)
const formatNumber = (value: number) => value.toLocaleString(numberLocale.value)
const formatDate = (iso: string) =>
  new Date(iso).toLocaleString(numberLocale.value, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

// Reuse the dashboard's date-range filter + quick tabs, kept in sync: the tabs
// are a shortcut view of the same range the dropdown drives.
const range = ref<GlobalRangeValue>(resolveGlobalRange('today'))

const rangeOptions = [
  { key: 'today', label: 'analytics.range.today' },
  { key: 'yesterday', label: 'analytics.range.yesterday' },
  { key: 'last7', label: 'analytics.range.last7Days' },
  { key: 'monthly', label: 'analytics.range.monthly' },
  { key: 'yearly', label: 'analytics.range.yearly' },
] as const

// The "Monthly"/"Yearly" tabs map to the This Month/This Year presets; the rest 1:1.
const tabToGlobal: Record<string, GlobalRangeKey> = {
  today: 'today',
  yesterday: 'yesterday',
  last7: 'last7',
  monthly: 'thisMonth',
  yearly: 'thisYear',
}
const activeTab = computed(() => {
  const key = range.value.key
  if (key === 'thisMonth') return 'monthly'
  if (key === 'thisYear') return 'yearly'
  return key
})
const selectRange = (key: (typeof rangeOptions)[number]['key']) => {
  range.value = resolveGlobalRange(tabToGlobal[key])
}

// --- Summary totals for the selected period (aggregated server-side) ---
const round2 = (value: number) => Math.round(value * 100) / 100
const DAY_MS = 86_400_000
const unitLabel = computed(() => item.value?.unitOfMeasure ?? '')
const totalIn = computed(() => historyTotals.value.totalIn)
const totalOut = computed(() => historyTotals.value.totalOut)
const periodDays = computed(() => {
  const from = new Date(range.value.startDate).getTime()
  const to = new Date(range.value.endDate).getTime()
  return Math.max(1, Math.round((to - from) / DAY_MS))
})
// Usage is stock *consumed* per day. Net change (in − out) is a different
// figure: a restock would push it positive on a day stock was actually used up.
const avgDailyUsage = computed(() => round2(totalOut.value / periodDays.value))

const summaryStats = computed(() => [
  {
    label: 'inventory.history.summary.currentStock',
    value: `${formatNumber(item.value?.quantity ?? 0)} ${unitLabel.value}`,
    valueClass: 'text-emerald-600 dark:text-emerald-400',
  },
  {
    label: 'inventory.history.summary.averageDailyUsage',
    value: `${formatNumber(avgDailyUsage.value)} ${unitLabel.value}`,
    valueClass: 'text-[#1A1C1C] dark:text-stone-100',
  },
  {
    label: 'inventory.history.summary.totalIn',
    value: `+${formatNumber(totalIn.value)} ${unitLabel.value}`,
    valueClass: 'text-emerald-600 dark:text-emerald-400',
  },
  {
    label: 'inventory.history.summary.totalOut',
    value: `−${formatNumber(totalOut.value)} ${unitLabel.value}`,
    valueClass: 'text-rose-600 dark:text-rose-400',
  },
  {
    label: 'inventory.history.summary.currentValue',
    value: formatMoney(item.value?.totalValue ?? 0),
    valueClass: 'text-[#1A1C1C] dark:text-stone-100',
  },
  {
    label: 'inventory.history.summary.category',
    value: item.value?.category?.name || '—',
    valueClass: 'text-[#737373] dark:text-stone-400',
  },
  {
    label: 'inventory.history.summary.unit',
    value: unitLabel.value || '—',
    valueClass: 'text-[#1A1C1C] dark:text-stone-100',
  },
  {
    label: 'inventory.history.summary.reorderLevel',
    value: item.value?.minAlertThreshold
      ? `${formatNumber(item.value.minAlertThreshold)} ${unitLabel.value}`
      : '—',
    valueClass: 'text-[#1A1C1C] dark:text-stone-100',
  },
])

// --- Movement type filter: In / Out / Both ---
// "all" (Both) omits the param entirely, so the server returns every
// movement; the Total In/Out summary always reflects the full period
// regardless of this filter — only the listed rows narrow.
const typeFilter = ref<'all' | AdjustmentType>('all')
const typeFilterOptions = computed<{ value: AdjustmentType; label: string }[]>(() => [
  { value: 'add', label: t('inventory.history.filters.in') },
  { value: 'remove', label: t('inventory.history.filters.out') },
])

// --- Pagination (server-driven) ---
const PAGE_SIZE = 10
const currentPage = ref(1)
const totalPages = computed(() => historyPagination.value.totalPages)
const totalItems = computed(() => historyPagination.value.total)

const historySummary = (range: { from: number; to: number; total: number }) =>
  t('inventory.table.showingRange', { start: range.from, end: range.to, total: range.total })

/* -- Columns. `change` and `value` render as slots, so their `key` is only a
      column identity; the rest read straight off the row. -------------------- */
const historyHeaders = computed<DataTableHeader<InventoryHistoryEntry>[]>(() => [
  {
    key: 'createdAt',
    header: t('inventory.history.date'),
    formatter: ({ row }) => formatDate(row.createdAt),
    minWidth: '180px',
    cellClass: 'text-[#737373] dark:text-stone-400',
  },
  { key: 'change', header: t('inventory.history.change'), minWidth: '140px' },
  { key: 'value', header: t('inventory.history.value'), align: 'right', width: '140px' },
  {
    key: 'unitCost',
    header: t('inventory.history.unitCost'),
    // Money runs through the shop's currency formatter, so no `format: 'currency'`.
    formatter: ({ row }) => (row.unitCost === null ? '—' : formatMoney(row.unitCost)),
    align: 'right',
    width: '140px',
  },
  {
    key: 'notes',
    header: t('inventory.history.notes'),
    minWidth: '180px',
    cellClass: 'text-[#737373] dark:text-stone-400',
  },
  {
    key: 'user',
    header: t('inventory.history.by'),
    width: '150px',
    cellClass: 'font-semibold text-[#1A1C1C] dark:text-stone-100',
  },
])

// Fetch the current page for the selected range. The server does the date
// filtering + pagination and returns the period's in/out totals.
const load = () => {
  inventoryStore
    .fetchHistory(itemId.value, {
      from: range.value.startDate,
      to: range.value.endDate,
      type: typeFilter.value === 'all' ? undefined : typeFilter.value,
      page: currentPage.value,
      limit: PAGE_SIZE,
    })
    .catch(() => toast.error(t('inventory.messages.loadError')))
}
const goToPage = (page: number) => {
  const next = Math.min(Math.max(1, page), totalPages.value)
  if (next === currentPage.value) return
  currentPage.value = next
  load()
}
// Changing the period or the movement-type filter resets to the first page
// and refetches from the server.
watch([range, typeFilter], () => {
  currentPage.value = 1
  load()
})

const goBack = () => router.push({ name: APP_ROUTES.INVENTORY.name })

onMounted(async () => {
  // Ensure we can show the item's name/unit even on a direct page load, or when
  // the cached list is filtered and happens to exclude this item — a non-empty
  // list is not proof the item is in it.
  await inventoryStore.ensureItem(itemId.value)
  load()
})

// The workbook is built server-side and streamed back as .xlsx bytes: it covers
// every movement in the range, not just the page the table is showing, and
// honours the same period and movement-type filters. `locale` picks the
// language the server writes the file's labels, dates and numbers in.
const exportExcel = async () => {
  if (!totalItems.value || isExporting.value) return
  try {
    await inventoryStore.exportHistory(
      itemId.value,
      item.value?.name ?? t('inventory.history.title'),
      {
        from: range.value.startDate,
        to: range.value.endDate,
        type: typeFilter.value === 'all' ? undefined : typeFilter.value,
        locale: locale.value as ExportLocale,
      }
    )
  } catch {
    toast.error(t('inventory.history.exportError'))
  }
}
</script>

<template>
  <div
    class="h-full overflow-y-auto bg-[#F9FAFB] p-8 text-[#1A1C1C] dark:bg-stone-900 dark:text-stone-100"
  >
    <div class="w-full space-y-6">
      <!-- Header -->
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div class="flex items-center gap-3">
          <Button
            variant="tertiary"
            size="icon"
            class="size-9 shrink-0 rounded-xl border border-slate-200 dark:border-stone-700"
            :title="t('inventory.history.back')"
            @click="goBack"
          >
            <ArrowLeft class="size-4" />
          </Button>
          <div>
            <h1 class="font-headline-lg text-xl font-bold text-on-background">
              {{ item?.name || t('inventory.history.title') }}
            </h1>
          </div>
        </div>

        <!-- Period filter (shared with the dashboard): quick tabs + dropdown -->
        <div class="flex flex-nowrap items-center gap-2 overflow-x-auto lg:gap-3">
          <div
            class="hidden shrink-0 items-center gap-1 overflow-x-auto rounded-xl border border-slate-100 bg-white p-1 lg:flex dark:border-stone-800 dark:bg-stone-900/50"
          >
            <Button
              v-for="opt in rangeOptions"
              :key="opt.key"
              type="button"
              variant="tertiary"
              :class="[
                'h-auto shrink-0 rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all',
                activeTab === opt.key
                  ? 'bg-[#D2691E] text-white shadow-sm hover:bg-[#D2691E] hover:text-white'
                  : 'text-[#737373] hover:bg-slate-50 hover:text-[#1A1C1C] dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-100',
              ]"
              @click="selectRange(opt.key)"
            >
              {{ t(opt.label) }}
            </Button>
          </div>
          <AppSelect
            v-model="typeFilter"
            :options="typeFilterOptions"
            :label="undefined"
            :all-option-label="t('inventory.history.filters.both')"
            :placeholder="t('inventory.history.filters.type')"
            class="w-28 shrink-0 lg:w-32"
          />
          <GlobalDateFilter v-model="range" />
          <Button
            type="button"
            variant="tertiary"
            :disabled="!totalItems || isExporting"
            :title="t('inventory.history.export')"
            class="h-auto shrink-0 rounded-xl border border-slate-100 bg-white px-3.5 py-2 text-xs font-bold text-[#1A1C1C] shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-stone-800 dark:bg-stone-900/50 dark:text-stone-100 dark:hover:bg-stone-800"
            @click="exportExcel"
          >
            <LoaderCircle v-if="isExporting" class="size-3.5 animate-spin sm:mr-1.5" />
            <Download v-else class="size-3.5 sm:mr-1.5" />
            <span class="hidden sm:inline">{{ t('inventory.history.export') }}</span>
          </Button>
        </div>
      </div>

      <!-- Summary totals for the selected period -->
      <Card
        class="rounded-xl border-none bg-white p-5 shadow-sm dark:border dark:border-stone-800 dark:bg-stone-900"
      >
        <div class="grid grid-cols-2 gap-4 sm:grid-cols-4 xl:grid-cols-8">
          <div v-for="stat in summaryStats" :key="stat.label" class="flex flex-col gap-1">
            <span
              class="text-[11px] font-black uppercase tracking-wide text-[#A3A3A3] dark:text-stone-500"
            >
              {{ t(stat.label) }}
            </span>
            <span class="text-sm font-bold" :class="stat.valueClass">{{ stat.value }}</span>
          </div>
        </div>
      </Card>

      <!-- History table -->
      <Card
        class="gap-0 overflow-hidden rounded-xl border-none bg-white p-0 shadow-sm dark:border dark:border-stone-800 dark:bg-stone-900"
      >
        <DataTable
          :headers="historyHeaders"
          :data="historyItems"
          :total-count="totalItems"
          :loading="isHistoryLoading"
          :pagination="{
            page: currentPage,
            pageSize: PAGE_SIZE,
            showPageSizeSelector: false,
          }"
          :summary-formatter="historySummary"
          :empty-title="t('inventory.history.empty')"
          :empty-description="''"
          :caption="t('inventory.history.title')"
          row-key="id"
          min-width="640px"
          max-height="none"
          class="rounded-none border-0 shadow-none"
          @page-change="goToPage"
        >
          <!-- Quantity moved, signed and coloured by direction -->
          <template #[`cell:change`]="{ row }">
            <span
              class="font-bold"
              :class="
                row.type === 'add'
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-rose-600 dark:text-rose-400'
              "
            >
              {{ row.type === 'add' ? '+' : '−' }}{{ formatNumber(row.quantityChanged) }}
              {{ item?.unitOfMeasure }}
            </span>
          </template>

          <!-- Value moved. Null means the movement carried no cost. -->
          <template #[`cell:value`]="{ row }">
            <span
              v-if="row.value !== null"
              class="font-bold"
              :class="
                row.type === 'add'
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-rose-600 dark:text-rose-400'
              "
            >
              {{ row.type === 'add' ? '+' : '−' }}{{ formatMoney(row.value) }}
            </span>
            <span v-else class="text-[#A3A3A3] dark:text-stone-500">—</span>
          </template>
        </DataTable>
      </Card>
    </div>
  </div>
</template>
