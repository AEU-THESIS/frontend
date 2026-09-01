<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'
import { toast } from 'vue-sonner'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import SalesBarChart from '@/components/analytics/SalesBarChart.vue'
import { USD_SYMBOL } from '@/constants/currency'
import { useReportStore } from '@/store/useReportStore'
import type { ProductPerformanceRow, ReportPeriod } from '@/types/report.types'

// Product Performance: the best/worst sellers and the per-category roll-up,
// both from endpoints that already existed but had no page.
const { t } = useI18n()
const reportStore = useReportStore()
const {
  productPeriod,
  itemPerformance,
  categoriesByRevenue,
  isProductReportLoading,
  productReportError,
} = storeToRefs(reportStore)

const PERIODS: ReportPeriod[] = ['daily', 'weekly', 'monthly']

const formatUSD = (value: number) =>
  `${USD_SYMBOL}${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

/** The two ranked lists, rendered by one shared table block. */
const rankedTables = computed(() => [
  {
    key: 'top',
    title: t('reports.products.topSellers'),
    rows: itemPerformance.value.topSellers,
  },
  {
    key: 'bottom',
    title: t('reports.products.bottomSellers'),
    rows: itemPerformance.value.bottomSellers,
  },
])

const categoryChartData = computed(() =>
  categoriesByRevenue.value.map(row => ({ label: row.category, value: row.revenue }))
)

const rowKey = (row: ProductPerformanceRow, index: number) => `${row.name}-${index}`

watch(productPeriod, () => reportStore.fetchProductPerformance())

watch(productReportError, key => {
  if (key) toast.error(t(key))
})

onMounted(() => reportStore.fetchProductPerformance())
</script>

<template>
  <div
    class="h-full overflow-y-auto bg-[#F9FAFB] p-8 text-[#1A1C1C] dark:bg-stone-900 dark:text-stone-100"
  >
    <div class="w-full space-y-6">
      <!-- Header -->
      <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 class="text-xl font-bold">{{ t('reports.products.title') }}</h1>
          <p class="mt-1 text-sm text-[#A3A3A3] dark:text-stone-500">
            {{ t('reports.products.subtitle') }}
          </p>
        </div>

        <div
          class="flex shrink-0 items-center gap-1 self-start rounded-xl border border-slate-100 bg-white p-1 lg:self-auto dark:border-stone-800 dark:bg-stone-900/50"
        >
          <Button
            v-for="period in PERIODS"
            :key="period"
            type="button"
            variant="tertiary"
            :class="[
              'h-auto shrink-0 rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all',
              productPeriod === period
                ? 'bg-[#D2691E] text-white shadow-sm hover:bg-[#D2691E] hover:text-white'
                : 'text-[#737373] hover:bg-slate-50 hover:text-[#1A1C1C] dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-100',
            ]"
            @click="productPeriod = period"
          >
            {{ t(`reports.sales.period.${period}`) }}
          </Button>
        </div>
      </div>

      <!-- Best / lowest sellers -->
      <div class="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card
          v-for="table in rankedTables"
          :key="table.key"
          class="gap-0 overflow-hidden rounded-xl border-none bg-white p-0 shadow-sm dark:border dark:border-stone-800 dark:bg-stone-900"
        >
          <h2
            class="px-6 pt-5 text-sm font-black uppercase tracking-wide text-[#A3A3A3] dark:text-stone-500"
          >
            {{ table.title }}
          </h2>

          <p
            v-if="!isProductReportLoading && !table.rows.length"
            class="px-6 py-10 text-center text-sm font-bold text-[#A3A3A3] dark:text-stone-500"
          >
            {{ t('reports.products.empty') }}
          </p>

          <Table v-else class="text-left">
            <TableHeader>
              <TableRow
                class="bg-[#FCFCFC] text-[11px] font-black uppercase text-[#A3A3A3] hover:bg-[#FCFCFC] dark:bg-stone-800 dark:text-stone-500 dark:hover:bg-stone-800"
              >
                <TableHead class="px-6 py-4">{{ t('reports.products.table.item') }}</TableHead>
                <TableHead class="px-6 py-4 text-right">
                  {{ t('reports.products.table.unitsSold') }}
                </TableHead>
                <TableHead class="px-6 py-4 text-right">
                  {{ t('reports.products.table.revenue') }}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow
                v-for="(row, index) in table.rows"
                :key="rowKey(row, index)"
                class="border-slate-100 text-sm dark:border-stone-800"
              >
                <TableCell class="px-6 py-4 font-semibold">{{ row.name }}</TableCell>
                <TableCell class="px-6 py-4 text-right font-bold">{{ row.quantity }}</TableCell>
                <TableCell class="px-6 py-4 text-right font-bold">
                  {{ formatUSD(row.revenue) }}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </Card>
      </div>

      <!-- Category revenue -->
      <Card
        class="rounded-xl border-none bg-white p-5 shadow-sm dark:border dark:border-stone-800 dark:bg-stone-900"
      >
        <h2 class="text-sm font-black uppercase tracking-wide text-[#A3A3A3] dark:text-stone-500">
          {{ t('reports.products.categoryChart') }}
        </h2>
        <p
          v-if="!isProductReportLoading && !categoryChartData.length"
          class="py-10 text-center text-sm font-bold text-[#A3A3A3] dark:text-stone-500"
        >
          {{ t('reports.products.empty') }}
        </p>
        <div v-else class="mt-4">
          <SalesBarChart :data="categoryChartData" :prefix="USD_SYMBOL" />
        </div>
      </Card>

      <!-- Category breakdown -->
      <Card
        v-if="categoriesByRevenue.length"
        class="gap-0 overflow-hidden rounded-xl border-none bg-white p-0 shadow-sm dark:border dark:border-stone-800 dark:bg-stone-900"
      >
        <h2
          class="px-6 pt-5 text-sm font-black uppercase tracking-wide text-[#A3A3A3] dark:text-stone-500"
        >
          {{ t('reports.products.categoryTable') }}
        </h2>
        <Table class="text-left">
          <TableHeader>
            <TableRow
              class="bg-[#FCFCFC] text-[11px] font-black uppercase text-[#A3A3A3] hover:bg-[#FCFCFC] dark:bg-stone-800 dark:text-stone-500 dark:hover:bg-stone-800"
            >
              <TableHead class="px-6 py-4">{{ t('reports.products.table.category') }}</TableHead>
              <TableHead class="px-6 py-4 text-right">
                {{ t('reports.products.table.unitsSold') }}
              </TableHead>
              <TableHead class="px-6 py-4 text-right">
                {{ t('reports.products.table.revenue') }}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow
              v-for="row in categoriesByRevenue"
              :key="row.category"
              class="border-slate-100 text-sm dark:border-stone-800"
            >
              <TableCell class="px-6 py-4 font-semibold">{{ row.category }}</TableCell>
              <TableCell class="px-6 py-4 text-right font-bold">{{ row.quantity }}</TableCell>
              <TableCell class="px-6 py-4 text-right font-bold">
                {{ formatUSD(row.revenue) }}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </Card>
    </div>
  </div>
</template>
