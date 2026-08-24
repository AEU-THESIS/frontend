<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'
import { storeToRefs } from 'pinia'
import type ExcelJS from 'exceljs'
import { Wallet, Receipt, Download, LoaderCircle } from 'lucide-vue-next'
import { Card } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import AnalyticsStatCard from '@/components/analytics/AnalyticsStatCard.vue'
import SalesBarChart from '@/components/analytics/SalesBarChart.vue'
import GlobalDateFilter from '@/components/analytics/GlobalDateFilter.vue'
import { resolveGlobalRange } from '@/components/analytics/globalRange'
import type { GlobalRangeKey, GlobalRangeValue, BarDatum } from '@/types/analytics.types'
import type { InventoryExpenseRecord } from '@/types/inventory.types'
import { useInventoryStore } from '@/store/useInventoryStore'
import { useShopSettingsStore } from '@/store/useShopSettingsStore'
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

const { t, tm } = useI18n()
const inventoryStore = useInventoryStore()
const shopSettingsStore = useShopSettingsStore()
const { expenseByDay, expenseByIngredient, expenseSummary, isExpenseReportLoading } =
  storeToRefs(inventoryStore)

const formatMoney = (amount: number) => shopSettingsStore.formatAmount(amount)

// Reuses the same quick-tabs + dropdown pattern as the rest of the app's
// date-range filters, so the control behaves identically everywhere.
const range = ref<GlobalRangeValue>(resolveGlobalRange('last7'))

const rangeOptions = [
  { key: 'today', label: 'analytics.range.today' },
  { key: 'yesterday', label: 'analytics.range.yesterday' },
  { key: 'last7', label: 'analytics.range.last7Days' },
  { key: 'monthly', label: 'analytics.range.monthly' },
  { key: 'yearly', label: 'analytics.range.yearly' },
] as const

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

const hasData = computed(
  () => expenseByDay.value.length > 0 || expenseByIngredient.value.length > 0
)

const chartData = computed<BarDatum[]>(() =>
  expenseByDay.value.map(point => ({ label: point.label, value: point.totalSpend }))
)

const load = () => {
  inventoryStore
    .fetchExpenseReport({ startDate: range.value.startDate, endDate: range.value.endDate })
    .catch(() => toast.error(t('inventory.expenseReport.loadError')))
}

watch(range, load)
onMounted(load)

// --- Excel export ---
// A main "Expense Report" sheet — banner, filter context, KPI cards, an
// embedded chart image — plus the purchase-history table. Once the range
// spans more than one calendar month (a "Yearly" export, say), the table
// moves off the main sheet and into one sheet per month instead: a single
// flat table for a year of restocking is unwieldy, while per-month sheets
// stay easy to page through. A short range keeps the table inline.
const isExporting = ref(false)

const RECORD_TABLE_COLUMNS = [
  { width: 14 },
  { width: 24 },
  { width: 12 },
  { width: 14 },
  { width: 14 },
]

// Writes the header/rows/Total-row for a table starting at `startRow` on
// `targetSheet`, with autofilter over the header. Reused for both the inline
// (single-month) case and each per-month sheet.
const writeRecordsTable = (
  targetSheet: ExcelJS.Worksheet,
  startRow: number,
  rows: InventoryExpenseRecord[],
  moneyFormat: string,
  headers: string[],
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

  rows.forEach((record, idx) => {
    const row = targetSheet.getRow(startRow + 1 + idx)
    row.getCell(1).value = record.date
    row.getCell(2).value = record.name
    row.getCell(3).value = `${record.quantity} ${record.unitOfMeasure}`
    row.getCell(3).alignment = { horizontal: 'right' }
    row.getCell(4).value = record.unitCost
    row.getCell(4).numFmt = moneyFormat
    row.getCell(4).alignment = { horizontal: 'right' }
    row.getCell(5).value = record.totalCost
    row.getCell(5).numFmt = moneyFormat
    row.getCell(5).alignment = { horizontal: 'right' }
  })

  const totalRowIndex = startRow + 1 + rows.length
  const totalRow = targetSheet.getRow(totalRowIndex)
  totalRow.getCell(1).value = totalRowLabel
  totalRow.getCell(1).font = { bold: true }
  const sum = rows.reduce((acc, r) => acc + r.totalCost, 0)
  totalRow.getCell(5).value = Math.round(sum * 100) / 100
  totalRow.getCell(5).font = { bold: true }
  totalRow.getCell(5).numFmt = moneyFormat
  totalRow.getCell(5).alignment = { horizontal: 'right' }

  return totalRowIndex + 1
}

const exportExcel = async () => {
  if (!hasData.value || isExporting.value) return
  isExporting.value = true
  try {
    const { data: records } = await inventoryStore.fetchExpenseRecords({
      startDate: range.value.startDate,
      endDate: range.value.endDate,
    })

    const ex = (key: string, params?: Record<string, unknown>) =>
      t(`inventory.expenseReport.excel.${key}`, params ?? {})
    const monthNames = tm('analytics.monthsShort') as unknown as string[]

    const { default: ExcelJSLib } = await import('exceljs')
    const workbook = new ExcelJSLib.Workbook()
    workbook.creator = 'RoutinCafe POS'
    const currency = shopSettingsStore.currency_symbol
    const moneyFormat = `"${currency}"#,##0.00`
    const startLabel = range.value.startDate.slice(0, 10)
    const endLabel = range.value.endDate.slice(0, 10)
    const { totalSpend, purchaseCount } = expenseSummary.value
    const averagePurchase = purchaseCount > 0 ? totalSpend / purchaseCount : 0

    const sheet = workbook.addWorksheet(ex('title'))
    sheet.columns = [
      { width: 16 },
      { width: 22 },
      { width: 12 },
      { width: 12 },
      { width: 14 },
      { width: 10 },
    ]

    let cursor = writeExcelBanner(
      sheet,
      1,
      6,
      ex('title'),
      ex('subtitle'),
      ex('filterLine', {
        start: startLabel,
        end: endLabel,
        item: ex('allItems'),
        groupBy: ex('groupByDay'),
        currency,
      })
    )

    const kpiBlocks: ExcelKpiBlock[] = [
      {
        from: 1,
        to: 2,
        header: ex('kpiTotalSpend'),
        value: totalSpend,
        numFmt: moneyFormat,
        caption: ex('kpiTotalSpendCaption', { count: purchaseCount }),
      },
      {
        from: 3,
        to: 4,
        header: ex('kpiTransactions'),
        value: purchaseCount,
        caption: ex('kpiTransactionsCaption'),
      },
      {
        from: 5,
        to: 6,
        header: ex('kpiAverage'),
        value: Math.round(averagePurchase * 100) / 100,
        numFmt: moneyFormat,
        caption: ex('kpiAverageCaption'),
      },
    ]
    cursor = writeExcelKpiRow(sheet, cursor, kpiBlocks)

    // --- Spend Over Time: embedded chart image ---
    cursor = writeExcelSectionHeading(sheet, cursor, 6, t('inventory.expenseReport.chartTitle'))
    if (chartData.value.length > 0) {
      const chartDataUrl = await renderExcelBarChartImage(chartData.value, {
        title: ex('chartLabel'),
        valuePrefix: currency,
      })
      const imageId = workbook.addImage({ base64: chartDataUrl, extension: 'png' })
      sheet.addImage(imageId, { tl: { col: 0, row: cursor - 1 }, ext: { width: 560, height: 236 } })
      cursor += 15
    }
    cursor += 1

    // --- Purchase History: inline if it's one month, per-month sheets otherwise ---
    cursor = writeExcelSectionHeading(sheet, cursor, 6, ex('purchaseHistory'))
    const monthGroups = groupByMonth(records, record => record.date, monthNames)
    const tableHeaders = [
      ex('tableDate'),
      ex('tableItem'),
      ex('tableQuantity'),
      ex('tableUnitCost'),
      ex('tableTotal'),
    ]
    const totalRowLabel = ex('totalRow')

    if (!shouldSplitByMonth(monthGroups.length, records.length)) {
      cursor = writeRecordsTable(sheet, cursor, records, moneyFormat, tableHeaders, totalRowLabel)
      cursor += 1
    } else {
      cursor = writeExcelNote(sheet, cursor, 6, ex('multiMonthNote'))
      cursor += 1

      for (const month of monthGroups) {
        if (month.items.length <= EXCEL_MAX_ROWS_PER_SHEET) {
          const monthSheet = workbook.addWorksheet(month.label)
          monthSheet.columns = RECORD_TABLE_COLUMNS
          writeRecordsTable(monthSheet, 1, month.items, moneyFormat, tableHeaders, totalRowLabel)
          continue
        }
        for (let start = 0; start < month.items.length; start += EXCEL_MAX_ROWS_PER_SHEET) {
          const chunk = month.items.slice(start, start + EXCEL_MAX_ROWS_PER_SHEET)
          const chunkSheet = workbook.addWorksheet(
            chunkSheetName(month.label, start + 1, start + chunk.length)
          )
          chunkSheet.columns = RECORD_TABLE_COLUMNS
          writeRecordsTable(chunkSheet, 1, chunk, moneyFormat, tableHeaders, totalRowLabel)
        }
      }
    }

    writeExcelFooter(sheet, cursor, 6, ex('footerHeading'), ex('footerBody'))

    await downloadWorkbook(workbook, `inventory-expense-report_${startLabel}_${endLabel}.xlsx`)
  } catch {
    toast.error(t('inventory.expenseReport.exportError'))
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
      <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 class="font-headline-lg text-xl font-bold text-on-background">
            {{ t('inventory.expenseReport.title') }}
          </h1>
          <p class="mt-1 text-sm font-medium text-[#737373] dark:text-stone-400">
            {{ t('inventory.expenseReport.subtitle') }}
          </p>
        </div>

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
          <GlobalDateFilter v-model="range" />
          <Button
            type="button"
            variant="tertiary"
            :disabled="!hasData || isExporting"
            class="h-auto rounded-xl border border-slate-100 bg-white px-3.5 py-2 text-xs font-bold text-[#1A1C1C] shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-stone-800 dark:bg-stone-900/50 dark:text-stone-100 dark:hover:bg-stone-800"
            @click="exportExcel"
          >
            <LoaderCircle v-if="isExporting" class="mr-1.5 size-3.5 animate-spin" />
            <Download v-else class="mr-1.5 size-3.5" />
            {{ t('inventory.expenseReport.export') }}
          </Button>
        </div>
      </div>

      <!-- KPI cards -->
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <AnalyticsStatCard
          :label="t('inventory.expenseReport.totalSpend')"
          :value="formatMoney(expenseSummary.totalSpend)"
          :icon="Wallet"
          icon-bg-class="bg-[#FDF2F0] dark:bg-[#D2691E]/15"
          icon-color-class="text-[#D2691E]"
        />
        <AnalyticsStatCard
          :label="t('inventory.expenseReport.purchaseCount')"
          :value="String(expenseSummary.purchaseCount)"
          :icon="Receipt"
          icon-bg-class="bg-[#EFF6FF] dark:bg-[#3B82F6]/15"
          icon-color-class="text-[#3B82F6]"
        />
      </div>

      <!-- Empty state -->
      <Card
        v-if="!isExpenseReportLoading && !hasData"
        class="rounded-xl border-none bg-white p-14 text-center shadow-sm dark:border dark:border-stone-800 dark:bg-stone-900"
      >
        <p class="text-sm font-bold text-[#A3A3A3] dark:text-stone-500">
          {{ t('inventory.expenseReport.empty') }}
        </p>
        <p class="mt-1 text-xs text-[#A3A3A3] dark:text-stone-500">
          {{ t('inventory.expenseReport.emptyHint') }}
        </p>
      </Card>

      <template v-else>
        <!-- Spend over time -->
        <Card
          class="rounded-xl border-none bg-white p-5 shadow-sm dark:border dark:border-stone-800 dark:bg-stone-900"
        >
          <h2
            class="mb-4 text-sm font-black uppercase tracking-wide text-[#A3A3A3] dark:text-stone-500"
          >
            {{ t('inventory.expenseReport.chartTitle') }}
          </h2>
          <SalesBarChart :data="chartData" :prefix="shopSettingsStore.currency_symbol" />
        </Card>

        <!-- Spend by item -->
        <Card
          class="gap-0 overflow-hidden rounded-xl border-none bg-white p-0 shadow-sm dark:border dark:border-stone-800 dark:bg-stone-900"
        >
          <h2
            class="px-6 pt-5 text-sm font-black uppercase tracking-wide text-[#A3A3A3] dark:text-stone-500"
          >
            {{ t('inventory.expenseReport.breakdownTitle') }}
          </h2>
          <Table class="min-w-[560px] text-left">
            <TableHeader>
              <TableRow
                class="bg-[#FCFCFC] text-[11px] font-black uppercase text-[#A3A3A3] hover:bg-[#FCFCFC] dark:bg-stone-800 dark:text-stone-500 dark:hover:bg-stone-800"
              >
                <TableHead class="px-6 py-4">{{
                  t('inventory.expenseReport.table.item')
                }}</TableHead>
                <TableHead class="px-6 py-4">{{
                  t('inventory.expenseReport.table.unit')
                }}</TableHead>
                <TableHead class="px-6 py-4 text-right">
                  {{ t('inventory.expenseReport.table.quantity') }}
                </TableHead>
                <TableHead class="px-6 py-4 text-right">
                  {{ t('inventory.expenseReport.table.totalSpend') }}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow
                v-for="row in expenseByIngredient"
                :key="row.ingredientId"
                class="border-slate-100 text-sm dark:border-stone-800"
              >
                <TableCell class="px-6 py-4 font-semibold">{{ row.name }}</TableCell>
                <TableCell class="px-6 py-4 text-[#737373] dark:text-stone-400">
                  {{ row.unitOfMeasure }}
                </TableCell>
                <TableCell class="px-6 py-4 text-right">{{ row.quantity }}</TableCell>
                <TableCell class="px-6 py-4 text-right font-bold">
                  {{ formatMoney(row.totalSpend) }}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </Card>
      </template>
    </div>
  </div>
</template>
