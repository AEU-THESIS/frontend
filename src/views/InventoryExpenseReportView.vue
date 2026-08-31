<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'
import { storeToRefs } from 'pinia'
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
import type { ExportLocale } from '@/types/inventory.types'
import { useInventoryStore } from '@/store/useInventoryStore'
import { useShopSettingsStore } from '@/store/useShopSettingsStore'

const { t, locale } = useI18n()
const inventoryStore = useInventoryStore()
const shopSettingsStore = useShopSettingsStore()
const { expenseByDay, expenseByIngredient, expenseSummary, isExpenseReportLoading, isExporting } =
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

// The workbook is built server-side and streamed back as .xlsx bytes, so the
// button only asks for the current range and saves what arrives. `locale` picks
// the language the server writes the file's labels, dates and numbers in.
const exportExcel = async () => {
  if (!hasData.value || isExporting.value) return
  try {
    await inventoryStore.exportExpenseReport({
      startDate: range.value.startDate,
      endDate: range.value.endDate,
      locale: locale.value as ExportLocale,
    })
  } catch {
    toast.error(t('inventory.expenseReport.exportError'))
  }
}
</script>

<template>
  <div
    class="h-full overflow-y-auto bg-[#F9FAFB] p-8 text-[#1A1C1C] dark:bg-stone-900 dark:text-stone-100"
  >
    <div class="w-full space-y-6">
      <!-- Header -->
      <div class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-end">
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
          <GlobalDateFilter v-model="range" />
          <Button
            type="button"
            variant="tertiary"
            :disabled="!hasData || isExporting"
            class="h-auto shrink-0 rounded-xl border border-slate-100 bg-white px-3.5 py-2 text-xs font-bold text-[#1A1C1C] shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-stone-800 dark:bg-stone-900/50 dark:text-stone-100 dark:hover:bg-stone-800"
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
