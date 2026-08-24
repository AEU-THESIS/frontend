<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Download,
  LoaderCircle,
} from 'lucide-vue-next'
import ExcelJS from 'exceljs'
import { Card } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import AppSelect from '@/components/ui/select/AppSelect.vue'
import GlobalDateFilter from '@/components/analytics/GlobalDateFilter.vue'
import { resolveGlobalRange } from '@/components/analytics/globalRange'
import type { GlobalRangeKey, GlobalRangeValue } from '@/types/analytics.types'
import type { AdjustmentType, InventoryHistoryEntry } from '@/types/inventory.types'
import { useInventoryStore } from '@/store/useInventoryStore'
import { useShopSettingsStore } from '@/store/useShopSettingsStore'
import { APP_ROUTES } from '@/constants/appRoutes'
import {
  EXCEL_MAX_ROWS_PER_SHEET,
  chunkSheetName,
  downloadWorkbook,
  excelHeaderCellStyle,
  groupByMonth,
  renderExcelBarChartImage,
  shouldSplitByMonth,
  writeExcelBanner,
  writeExcelFooter,
  writeExcelKpiRow,
  writeExcelNote,
  writeExcelSectionHeading,
  type ExcelKpiBlock,
} from '@/utils/excelExport'

const { t, tm, locale } = useI18n()
const route = useRoute()
const router = useRouter()
const inventoryStore = useInventoryStore()
const shopSettingsStore = useShopSettingsStore()
const { items, historyItems, historyPagination, historyTotals, isHistoryLoading } =
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
const paginationStart = computed(() =>
  totalItems.value ? (historyPagination.value.page - 1) * historyPagination.value.limit + 1 : 0
)
const paginationEnd = computed(
  () =>
    (historyPagination.value.page - 1) * historyPagination.value.limit + historyItems.value.length
)
// Sliding window of at most 3 page numbers, centered on the current page once
// there are more pages than fit — so page 7 of 20 shows 6/7/8, not 1/2/3.
const visiblePaginationPages = computed(() => {
  const pages = totalPages.value
  const maxVisible = 3
  if (pages <= maxVisible) return Array.from({ length: pages }, (_, index) => index + 1)

  const start = Math.min(Math.max(currentPage.value - 1, 1), pages - maxVisible + 1)
  return Array.from({ length: maxVisible }, (_, index) => start + index)
})

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

// --- Excel export ---
// Same report template as the Expense Report export: a main sheet with a
// banner, KPI cards, and an embedded chart, followed by the movement table —
// inline if it fits in one month, or split into one sheet per month once the
// range spans many (a "Yearly" export, say), same as Expense Report.
const isExporting = ref(false)

const slugify = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

// Grouped by the same local calendar day the on-screen Date column renders,
// so an exported record lands in the same month a user would expect from
// looking at the table.
const localDateKey = (iso: string) => {
  const d = new Date(iso)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const MOVEMENT_TABLE_COLUMNS = [
  { width: 18 },
  { width: 10 },
  { width: 12 },
  { width: 10 },
  { width: 14 },
  { width: 14 },
  { width: 24 },
  { width: 18 },
]

// Writes the header/rows/Total-row for the movement table starting at
// `startRow`, with autofilter over the header. Reused for the inline
// (single-month) case and each per-month sheet. The Total row sums the
// signed Value column — a net dollar change for the movements on that sheet.
const writeMovementTable = (
  targetSheet: ExcelJS.Worksheet,
  startRow: number,
  rows: InventoryHistoryEntry[],
  unit: string,
  moneyFormat: string,
  headers: string[],
  typeLabels: { add: string; remove: string },
  totalRowLabel: string
) => {
  const headerRow = targetSheet.getRow(startRow)
  headers.forEach((label, idx) => {
    const cell = headerRow.getCell(idx + 1)
    cell.value = label
    excelHeaderCellStyle(cell, idx >= 2 ? 'right' : 'left')
  })
  targetSheet.autoFilter = {
    from: { row: startRow, column: 1 },
    to: { row: startRow, column: headers.length },
  }

  rows.forEach((entry, idx) => {
    const row = targetSheet.getRow(startRow + 1 + idx)
    const signedValue =
      entry.value === null ? null : entry.type === 'add' ? entry.value : -entry.value
    const values: (string | number)[] = [
      formatDate(entry.createdAt),
      entry.type === 'add' ? typeLabels.add : typeLabels.remove,
      entry.quantityChanged,
      unit,
      signedValue ?? '',
      entry.unitCost ?? '',
      entry.notes ?? '',
      entry.user ?? '',
    ]
    values.forEach((value, colIdx) => {
      const cell = row.getCell(colIdx + 1)
      cell.value = value
      if (colIdx === 2) cell.alignment = { horizontal: 'right' }
      if ((colIdx === 4 || colIdx === 5) && value !== '') cell.numFmt = moneyFormat
    })
  })

  const totalRowIndex = startRow + 1 + rows.length
  const totalRow = targetSheet.getRow(totalRowIndex)
  totalRow.getCell(2).value = totalRowLabel
  totalRow.getCell(2).font = { bold: true }
  const sheetTotal = rows.reduce((sum, entry) => {
    if (entry.value === null) return sum
    return sum + (entry.type === 'add' ? entry.value : -entry.value)
  }, 0)
  totalRow.getCell(5).value = Math.round(sheetTotal * 100) / 100
  totalRow.getCell(5).font = { bold: true }
  totalRow.getCell(5).numFmt = moneyFormat

  return totalRowIndex + 1
}

const exportExcel = async () => {
  if (!totalItems.value || isExporting.value) return
  isExporting.value = true
  try {
    const entries = await inventoryStore.fetchAllHistory(itemId.value, {
      from: range.value.startDate,
      to: range.value.endDate,
      type: typeFilter.value === 'all' ? undefined : typeFilter.value,
    })

    const itemName = item.value?.name ?? t('inventory.history.title')
    const hx = (key: string, params?: Record<string, unknown>) =>
      t(`inventory.history.excel.${key}`, { item: itemName, ...params })
    const monthNames = tm('analytics.monthsShort') as unknown as string[]

    const workbook = new ExcelJS.Workbook()
    workbook.creator = 'RoutinCafe POS'
    const currency = shopSettingsStore.currency_symbol
    const moneyFormat = `"${currency}"#,##0.00`
    const startLabel = range.value.startDate.slice(0, 10)
    const endLabel = range.value.endDate.slice(0, 10)
    const unit = unitLabel.value

    const sheet = workbook.addWorksheet(t('inventory.history.title'))
    sheet.columns = MOVEMENT_TABLE_COLUMNS

    const typeFilterLabel =
      typeFilter.value === 'all'
        ? t('inventory.history.filters.both')
        : typeFilter.value === 'add'
          ? t('inventory.history.filters.in')
          : t('inventory.history.filters.out')
    let cursor = writeExcelBanner(
      sheet,
      1,
      6,
      hx('title'),
      hx('subtitle'),
      hx('filterLine', {
        start: startLabel,
        end: endLabel,
        type: typeFilterLabel,
        unit: unit || '—',
        category: item.value?.category?.name ?? '—',
      })
    )

    const kpiBlocks: ExcelKpiBlock[] = [
      {
        from: 1,
        to: 2,
        header: hx('kpiCurrentStock'),
        value: `${formatNumber(item.value?.quantity ?? 0)} ${unit}`,
        caption: hx('kpiCurrentStockCaption', { value: formatMoney(item.value?.totalValue ?? 0) }),
      },
      {
        from: 3,
        to: 4,
        header: hx('kpiTotalIn'),
        value: `${formatNumber(totalIn.value)} ${unit}`,
        caption: hx('kpiTotalInCaption'),
      },
      {
        from: 5,
        to: 6,
        header: hx('kpiTotalOut'),
        value: `${formatNumber(totalOut.value)} ${unit}`,
        caption: hx('kpiTotalOutCaption'),
      },
    ]
    cursor = writeExcelKpiRow(sheet, cursor, kpiBlocks)

    // --- Value Over Time: embedded chart image (net signed value per day) ---
    cursor = writeExcelSectionHeading(sheet, cursor, 6, hx('chartTitle'))
    const dayTotals = new Map<string, number>()
    for (const entry of entries) {
      if (entry.value === null) continue
      const key = localDateKey(entry.createdAt)
      const signed = entry.type === 'add' ? entry.value : -entry.value
      dayTotals.set(key, (dayTotals.get(key) ?? 0) + signed)
    }
    const chartPoints = [...dayTotals.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, value]) => ({
        label: `${Number(date.slice(5, 7))}/${Number(date.slice(8, 10))}`,
        value: Math.round(value * 100) / 100,
      }))
    if (chartPoints.length > 0) {
      const chartDataUrl = await renderExcelBarChartImage(chartPoints, {
        title: hx('chartLabel'),
        valuePrefix: currency,
      })
      const imageId = workbook.addImage({ base64: chartDataUrl, extension: 'png' })
      sheet.addImage(imageId, { tl: { col: 0, row: cursor - 1 }, ext: { width: 560, height: 236 } })
      cursor += 15
    }
    cursor += 1

    // --- Movement History: inline if it's one month, per-month sheets otherwise ---
    cursor = writeExcelSectionHeading(sheet, cursor, 6, hx('movementHistory'))
    const monthGroups = groupByMonth(entries, entry => localDateKey(entry.createdAt), monthNames)
    const tableHeaders = [
      hx('tableDate'),
      hx('tableType'),
      hx('tableQuantity'),
      hx('tableUnit'),
      hx('tableValue'),
      hx('tableUnitCost'),
      hx('tableNotes'),
      hx('tableBy'),
    ]
    const typeLabels = { add: hx('typeAdd'), remove: hx('typeRemove') }
    const totalRowLabel = hx('totalRow')

    if (!shouldSplitByMonth(monthGroups.length, entries.length)) {
      cursor = writeMovementTable(
        sheet,
        cursor,
        entries,
        unit,
        moneyFormat,
        tableHeaders,
        typeLabels,
        totalRowLabel
      )
      cursor += 1
    } else {
      cursor = writeExcelNote(sheet, cursor, 6, hx('multiMonthNote'))
      cursor += 1

      for (const month of monthGroups) {
        if (month.items.length <= EXCEL_MAX_ROWS_PER_SHEET) {
          const monthSheet = workbook.addWorksheet(month.label)
          monthSheet.columns = MOVEMENT_TABLE_COLUMNS
          writeMovementTable(
            monthSheet,
            1,
            month.items,
            unit,
            moneyFormat,
            tableHeaders,
            typeLabels,
            totalRowLabel
          )
          continue
        }
        for (let start = 0; start < month.items.length; start += EXCEL_MAX_ROWS_PER_SHEET) {
          const chunk = month.items.slice(start, start + EXCEL_MAX_ROWS_PER_SHEET)
          const chunkSheet = workbook.addWorksheet(
            chunkSheetName(month.label, start + 1, start + chunk.length)
          )
          chunkSheet.columns = MOVEMENT_TABLE_COLUMNS
          writeMovementTable(
            chunkSheet,
            1,
            chunk,
            unit,
            moneyFormat,
            tableHeaders,
            typeLabels,
            totalRowLabel
          )
        }
      }
    }

    writeExcelFooter(sheet, cursor, 6, hx('footerHeading'), hx('footerBody'))

    await downloadWorkbook(
      workbook,
      `stock-history_${slugify(itemName)}_${startLabel}_${endLabel}.xlsx`
    )
  } catch {
    toast.error(t('inventory.history.exportError'))
  } finally {
    isExporting.value = false
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
            class="size-9 rounded-xl border border-slate-200 dark:border-stone-700"
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
        <div class="flex flex-wrap items-center gap-3">
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
            class="w-32"
          />
          <GlobalDateFilter v-model="range" />
          <Button
            type="button"
            variant="tertiary"
            :disabled="!totalItems || isExporting"
            class="h-auto rounded-xl border border-slate-100 bg-white px-3.5 py-2 text-xs font-bold text-[#1A1C1C] shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-stone-800 dark:bg-stone-900/50 dark:text-stone-100 dark:hover:bg-stone-800"
            @click="exportExcel"
          >
            <LoaderCircle v-if="isExporting" class="mr-1.5 size-3.5 animate-spin" />
            <Download v-else class="mr-1.5 size-3.5" />
            {{ t('inventory.history.export') }}
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
        <Table class="min-w-[640px] text-left">
          <TableHeader>
            <TableRow
              class="bg-[#FCFCFC] text-[11px] font-black uppercase text-[#A3A3A3] hover:bg-[#FCFCFC] dark:bg-stone-800 dark:text-stone-500 dark:hover:bg-stone-800"
            >
              <TableHead class="px-6 py-4">{{ t('inventory.history.date') }}</TableHead>
              <TableHead class="px-6 py-4">{{ t('inventory.history.change') }}</TableHead>
              <TableHead class="px-6 py-4 text-right">
                {{ t('inventory.history.value') }}
              </TableHead>
              <TableHead class="px-6 py-4 text-right">
                {{ t('inventory.history.unitCost') }}
              </TableHead>
              <TableHead class="px-6 py-4">{{ t('inventory.history.notes') }}</TableHead>
              <TableHead class="px-6 py-4">{{ t('inventory.history.by') }}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-if="isHistoryLoading" class="hover:bg-transparent">
              <TableCell
                colspan="6"
                class="px-6 py-14 text-center text-sm font-bold text-[#A3A3A3] dark:text-stone-500"
              >
                {{ t('inventory.messages.loading') }}
              </TableCell>
            </TableRow>
            <TableRow v-else-if="historyItems.length === 0" class="hover:bg-transparent">
              <TableCell
                colspan="6"
                class="px-6 py-14 text-center text-sm font-bold text-[#A3A3A3] dark:text-stone-500"
              >
                {{ t('inventory.history.empty') }}
              </TableCell>
            </TableRow>
            <TableRow
              v-for="entry in historyItems"
              v-else
              :key="entry.id"
              class="border-slate-100 text-sm dark:border-stone-800"
            >
              <TableCell class="px-6 py-4 text-[#737373] dark:text-stone-400">
                {{ formatDate(entry.createdAt) }}
              </TableCell>
              <TableCell class="px-6 py-4 font-bold">
                <span
                  :class="
                    entry.type === 'add'
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-rose-600 dark:text-rose-400'
                  "
                >
                  {{ entry.type === 'add' ? '+' : '−' }}{{ formatNumber(entry.quantityChanged) }}
                  {{ item?.unitOfMeasure }}
                </span>
              </TableCell>
              <TableCell class="px-6 py-4 text-right font-bold">
                <span
                  v-if="entry.value !== null"
                  :class="
                    entry.type === 'add'
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-rose-600 dark:text-rose-400'
                  "
                >
                  {{ entry.type === 'add' ? '+' : '−' }}{{ formatMoney(entry.value) }}
                </span>
                <span v-else class="font-normal text-[#A3A3A3] dark:text-stone-500">—</span>
              </TableCell>
              <TableCell class="px-6 py-4 text-right text-[#1A1C1C] dark:text-stone-100">
                {{ entry.unitCost === null ? '—' : formatMoney(entry.unitCost) }}
              </TableCell>
              <TableCell class="px-6 py-4 text-[#737373] dark:text-stone-400">
                {{ entry.notes || '—' }}
              </TableCell>
              <TableCell class="px-6 py-4 font-semibold text-[#1A1C1C] dark:text-stone-100">
                {{ entry.user || '—' }}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>

        <footer
          class="flex flex-col gap-3 border-t border-slate-100 px-6 py-4 dark:border-stone-800 sm:flex-row sm:items-center sm:justify-between"
        >
          <p class="text-xs font-semibold text-[#737373] dark:text-stone-400">
            {{
              t('inventory.table.showingRange', {
                start: paginationStart,
                end: paginationEnd,
                total: totalItems,
              })
            }}
          </p>
          <div class="flex items-center gap-2">
            <Button
              variant="tertiary"
              size="icon"
              class="size-8 rounded-lg border border-slate-200 text-[#A3A3A3] dark:border-stone-700 dark:text-stone-500"
              :disabled="currentPage === 1"
              @click="goToPage(1)"
            >
              <ChevronsLeft class="size-4" />
            </Button>
            <Button
              variant="tertiary"
              size="icon"
              class="size-8 rounded-lg border border-slate-200 text-[#A3A3A3] dark:border-stone-700 dark:text-stone-500"
              :disabled="currentPage === 1"
              @click="goToPage(currentPage - 1)"
            >
              <ChevronLeft class="size-4" />
            </Button>
            <Button
              v-for="page in visiblePaginationPages"
              :key="page"
              variant="tertiary"
              size="icon"
              class="size-8 rounded-lg border text-xs font-black"
              :class="
                page === currentPage
                  ? 'border-[#D2691E] bg-[#D2691E] text-white'
                  : 'border-slate-200 text-[#737373] dark:border-stone-700 dark:text-stone-400'
              "
              @click="goToPage(page)"
            >
              {{ page }}
            </Button>
            <Button
              variant="tertiary"
              size="icon"
              class="size-8 rounded-lg border border-slate-200 text-[#A3A3A3] dark:border-stone-700 dark:text-stone-500"
              :disabled="currentPage === totalPages"
              @click="goToPage(currentPage + 1)"
            >
              <ChevronRight class="size-4" />
            </Button>
            <Button
              variant="tertiary"
              size="icon"
              class="size-8 rounded-lg border border-slate-200 text-[#A3A3A3] dark:border-stone-700 dark:text-stone-500"
              :disabled="currentPage === totalPages"
              @click="goToPage(totalPages)"
            >
              <ChevronsRight class="size-4" />
            </Button>
          </div>
        </footer>
      </Card>
    </div>
  </div>
</template>
