<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'
import { ArrowLeft, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-vue-next'
import { Card } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import GlobalDateFilter from '@/components/analytics/GlobalDateFilter.vue'
import { resolveGlobalRange } from '@/components/analytics/globalRange'
import type { GlobalRangeKey, GlobalRangeValue } from '@/types/analytics.types'
import { useInventoryStore } from '@/store/useInventoryStore'
import { useShopSettingsStore } from '@/store/useShopSettingsStore'
import { APP_ROUTES } from '@/constants/appRoutes'

const { t, locale } = useI18n()
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
// Changing the period resets to the first page and refetches from the server.
watch(range, () => {
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
          <GlobalDateFilter v-model="range" />
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
