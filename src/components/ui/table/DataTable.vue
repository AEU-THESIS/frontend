<script setup lang="ts" generic="TRow extends object">
import { Fragment, computed, h, ref, watch, type VNodeChild } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  CheckboxIndicator,
  CheckboxRoot,
  PaginationEllipsis,
  PaginationFirst,
  PaginationLast,
  PaginationList,
  PaginationListItem,
  PaginationNext,
  PaginationPrev,
  PaginationRoot,
} from 'reka-ui'
import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ChevronsUpDown,
  Check,
  Inbox,
  Minus,
} from 'lucide-vue-next'
import type {
  DataTableAlign,
  DataTableBreakpoint,
  DataTableCellContext,
  DataTableHeader,
  DataTablePaginationConfig,
  DataTableProps,
  DataTableSort,
  SortDirection,
} from '@/types/table.types'
import { cn } from '@/lib/utils'
import TableBody from './TableBody.vue'
import TableCell from './TableCell.vue'
import TableEmpty from './TableEmpty.vue'
import TableHead from './TableHead.vue'
import TableHeader from './TableHeader.vue'
import TableRow from './TableRow.vue'

const props = withDefaults(defineProps<DataTableProps<TRow>>(), {
  rowKey: undefined,
  loading: false,
  selectable: false,
  selected: undefined,
  sort: undefined,
  stickyHeader: true,
  maxHeight: '450px',
  minWidth: '640px',
  fillHeight: false,
  pagination: undefined,
  totalCount: undefined,
  serverSide: false,
  clientSort: false,
  currencySymbol: '$',
  locale: undefined,
  emptyValue: '—',
  emptyTitle: undefined,
  emptyDescription: undefined,
  caption: undefined,
  rowClass: undefined,
  clickableRows: false,
  skeletonRows: undefined,
  dense: false,
  summaryFormatter: undefined,
  class: undefined,
})

const emit = defineEmits<{
  'update:selected': [keys: (string | number)[]]
  'update:sort': [sort: DataTableSort | null]
  /** 1-based page. In server mode the parent must refetch. */
  'page-change': [page: number]
  /** New page size. Always paired with a reset to page 1. */
  'page-size-change': [pageSize: number]
  /** `null` once a tri-state header cycles back to unsorted. */
  'sort-change': [sort: DataTableSort | null]
  'row-click': [row: TRow, index: number]
}>()

defineSlots<{
  /** Per-column cell override, e.g. `#[`cell:total`]="{ row }"`. */
  [key: `cell:${string}`]: (context: DataTableCellContext<TRow>) => unknown
  /** Per-column header override, e.g. `#[`header:total`]="{ column }"`. */
  [key: `header:${string}`]: (context: { column: DataTableHeader<TRow> }) => unknown
  /** Replaces the whole empty state. */
  empty?: () => unknown
  /** Extra controls rendered to the left of the pagination footer. */
  'footer-start'?: () => unknown
}>()

const { t, locale: i18nLocale } = useI18n()

/* -- Renders a column's `cell()` VNode without remounting between updates. -- */
const RenderCell = (cellProps: { node: VNodeChild }) => h(Fragment, [cellProps.node])

/* -------------------------------------------------------------------------- */
/* Pagination config                                                          */
/* -------------------------------------------------------------------------- */

const DEFAULT_PAGE_SIZE = 10

const paginationConfig = computed<DataTablePaginationConfig | null>(() => {
  if (props.pagination === false) return null
  const config = props.pagination ?? {}
  if (config.enabled === false) return null
  return {
    pageSizeOptions: [5, 10, 25, 50],
    showPageSizeSelector: true,
    showEdges: true,
    showSummary: true,
    siblingCount: 1,
    ...config,
  }
})

const isPaginated = computed(() => paginationConfig.value !== null)
/** Server mode: the parent owns slicing and sorting, we only signal intent. */
const isServerSide = computed(() => props.serverSide || props.totalCount !== undefined)

/** Server-paged but locally sorted: the order reaches the current page only. */
const sortsCurrentPageOnly = computed(() => isServerSide.value && props.clientSort)

const internalPage = ref(paginationConfig.value?.page ?? 1)
const internalPageSize = ref(paginationConfig.value?.pageSize ?? DEFAULT_PAGE_SIZE)

// Controlled page/pageSize: mirror the parent whenever it pushes a new value.
watch(
  () => paginationConfig.value?.page,
  page => {
    if (page === undefined || page === internalPage.value) return
    internalPage.value = page
    // A page-local sort described the rows we just left, so it goes with them.
    if (sortsCurrentPageOnly.value) clearSort()
  }
)
watch(
  () => paginationConfig.value?.pageSize,
  pageSize => {
    if (pageSize !== undefined) internalPageSize.value = pageSize
  }
)

const pageSize = computed(() => internalPageSize.value)

/* -------------------------------------------------------------------------- */
/* Sorting                                                                    */
/* -------------------------------------------------------------------------- */

const internalSort = ref<DataTableSort | null>(props.sort ?? null)

watch(
  () => props.sort,
  sort => {
    if (sort !== undefined) internalSort.value = sort
  }
)

const activeSort = computed(() => (props.sort !== undefined ? props.sort : internalSort.value))

/** Drops the active sort, telling a controlling parent to drop it too. */
const clearSort = () => {
  if (!activeSort.value) return
  internalSort.value = null
  emit('update:sort', null)
  emit('sort-change', null)
}

/** Cycles asc → desc → unsorted, so a column can always be reset. */
const nextDirection = (header: DataTableHeader<TRow>): SortDirection | null => {
  const current = activeSort.value
  if (!current || current.key !== header.key) return 'asc'
  if (current.direction === 'asc') return 'desc'
  return null
}

const toggleSort = (header: DataTableHeader<TRow>) => {
  if (!header.sortable) return
  const direction = nextDirection(header)
  const nextSort: DataTableSort | null = direction ? { key: header.key, direction } : null

  internalSort.value = nextSort
  emit('update:sort', nextSort)
  emit('sort-change', nextSort)

  // A re-sort invalidates the current offset, so restart from the first page —
  // unless it only re-orders the page already on screen.
  if (isPaginated.value && !sortsCurrentPageOnly.value) setPage(1)
}

const ariaSortFor = (header: DataTableHeader<TRow>) => {
  if (!header.sortable) return undefined
  const current = activeSort.value
  if (!current || current.key !== header.key) return 'none'
  return current.direction === 'asc' ? 'ascending' : 'descending'
}

/* -------------------------------------------------------------------------- */
/* Value access & formatting                                                  */
/* -------------------------------------------------------------------------- */

const resolvedLocale = computed(() => {
  if (props.locale) return props.locale
  return i18nLocale.value === 'kh' ? 'km-KH' : 'en-US'
})

const getValue = (header: DataTableHeader<TRow>, row: TRow): unknown =>
  header.accessor ? header.accessor(row) : (row as Record<string, unknown>)[header.key]

const toNumber = (value: unknown) => {
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

const formatNumeric = (value: unknown, digits: number) => {
  const parsed = toNumber(value)
  if (parsed === null) return props.emptyValue
  return parsed.toLocaleString(resolvedLocale.value, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })
}

const formatDate = (value: unknown, withTime: boolean) => {
  if (value === null || value === undefined || value === '') return props.emptyValue
  const date = value instanceof Date ? value : new Date(value as string | number)
  if (Number.isNaN(date.getTime())) return props.emptyValue
  return date.toLocaleString(resolvedLocale.value, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  })
}

const formatCell = (header: DataTableHeader<TRow>, row: TRow, index: number): string => {
  const value = getValue(header, row)
  if (header.formatter) return header.formatter({ value, row, index, column: header })
  if (value === null || value === undefined || value === '') return props.emptyValue

  switch (header.format) {
    case 'number':
      return formatNumeric(value, header.decimals ?? 0)
    case 'currency':
      return formatNumeric(value, header.decimals ?? 2)
    case 'percent': {
      const formatted = formatNumeric(value, header.decimals ?? 1)
      return formatted === props.emptyValue ? formatted : `${formatted}%`
    }
    case 'date':
      return formatDate(value, false)
    case 'datetime':
      return formatDate(value, true)
    default:
      return String(value)
  }
}

const cellContext = (
  header: DataTableHeader<TRow>,
  row: TRow,
  index: number
): DataTableCellContext<TRow> => ({ value: getValue(header, row), row, index, column: header })

const renderCellNode = (header: DataTableHeader<TRow>, row: TRow, index: number): VNodeChild =>
  header.cell ? header.cell(cellContext(header, row, index)) : null

/** Currency columns carry the symbol once, in the header, not per cell. */
const showsCurrency = (header: DataTableHeader<TRow>) =>
  header.currency ?? header.format === 'currency'

const headerLabel = (header: DataTableHeader<TRow>) =>
  showsCurrency(header) ? `${header.header} (${props.currencySymbol})` : header.header

/* -------------------------------------------------------------------------- */
/* Layout helpers                                                             */
/* -------------------------------------------------------------------------- */

const NUMERIC_FORMATS = new Set(['number', 'currency', 'percent'])

const alignOf = (header: DataTableHeader<TRow>): DataTableAlign =>
  header.align ?? (header.format && NUMERIC_FORMATS.has(header.format) ? 'right' : 'left')

const ALIGN_CLASS: Record<DataTableAlign, string> = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
}

const JUSTIFY_CLASS: Record<DataTableAlign, string> = {
  left: 'justify-start',
  center: 'justify-center',
  right: 'justify-end',
}

const HIDE_BELOW_CLASS: Record<DataTableBreakpoint, string> = {
  sm: 'hidden sm:table-cell',
  md: 'hidden md:table-cell',
  lg: 'hidden lg:table-cell',
  xl: 'hidden xl:table-cell',
}

const cellPadding = computed(() =>
  props.dense ? 'px-3 py-2 md:px-4' : 'px-3 py-3 md:px-6 md:py-4'
)

const headerStyle = (header: DataTableHeader<TRow>) => ({
  width: header.width,
  minWidth: header.minWidth,
})

const responsiveClass = (header: DataTableHeader<TRow>) =>
  header.hideBelow ? HIDE_BELOW_CLASS[header.hideBelow] : ''

/** Hidden columns stay in the DOM, so every column counts toward the span. */
const totalColumnCount = computed(() => props.headers.length + (props.selectable ? 1 : 0))

/* -------------------------------------------------------------------------- */
/* Rows: sorting, paging                                                      */
/* -------------------------------------------------------------------------- */

const compareValues = (a: unknown, b: unknown) => {
  // Blanks sort last in both directions so real data always leads.
  const aBlank = a === null || a === undefined || a === ''
  const bBlank = b === null || b === undefined || b === ''
  if (aBlank && bBlank) return 0
  if (aBlank) return 1
  if (bBlank) return -1

  if (typeof a === 'number' && typeof b === 'number') return a - b
  if (typeof a === 'boolean' && typeof b === 'boolean') return Number(a) - Number(b)
  if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime()

  const aNumber = toNumber(a)
  const bNumber = toNumber(b)
  if (aNumber !== null && bNumber !== null) return aNumber - bNumber

  return String(a).localeCompare(String(b), resolvedLocale.value, { numeric: true })
}

const sortedRows = computed(() => {
  const sort = activeSort.value
  // Server mode receives rows already ordered — re-sorting would fight the API,
  // unless `clientSort` puts this table in charge of its own page.
  if (!sort || (isServerSide.value && !sortsCurrentPageOnly.value)) return props.data

  const header = props.headers.find(current => current.key === sort.key)
  if (!header) return props.data

  const read = (row: TRow) =>
    header.sortAccessor ? header.sortAccessor(row) : getValue(header, row)
  const factor = sort.direction === 'asc' ? 1 : -1

  return [...props.data].sort((a, b) => compareValues(read(a), read(b)) * factor)
})

const totalRows = computed(() =>
  isServerSide.value ? (props.totalCount ?? props.data.length) : sortedRows.value.length
)

const totalPages = computed(() =>
  isPaginated.value ? Math.max(1, Math.ceil(totalRows.value / pageSize.value)) : 1
)

const currentPage = computed(() => Math.min(Math.max(1, internalPage.value), totalPages.value))

const visibleRows = computed(() => {
  if (!isPaginated.value || isServerSide.value) return sortedRows.value
  const start = (currentPage.value - 1) * pageSize.value
  return sortedRows.value.slice(start, start + pageSize.value)
})

// Deleting the last row of the final page would otherwise strand the viewer on
// an empty page, so follow the data back into range.
watch(totalPages, pages => {
  if (internalPage.value > pages) setPage(pages)
})

const setPage = (page: number) => {
  const next = Math.min(Math.max(1, page), totalPages.value)
  if (next === internalPage.value) return
  // The next page arrives in the API's own order — a sort that only ever
  // covered the rows on screen must not linger over rows it never saw.
  if (sortsCurrentPageOnly.value) clearSort()
  internalPage.value = next
  emit('page-change', next)
}

const handlePageUpdate = (page: number) => setPage(page)

const setPageSize = (value: string) => {
  const next = Number(value)
  if (!Number.isFinite(next) || next === internalPageSize.value) return
  internalPageSize.value = next
  emit('page-size-change', next)
  if (sortsCurrentPageOnly.value) clearSort()
  // Offsets computed from the old size are meaningless — restart at page 1.
  if (internalPage.value !== 1) {
    internalPage.value = 1
    emit('page-change', 1)
  }
}

const showingFrom = computed(() =>
  totalRows.value === 0 ? 0 : (currentPage.value - 1) * pageSize.value + 1
)
const showingTo = computed(() =>
  isServerSide.value
    ? Math.min((currentPage.value - 1) * pageSize.value + props.data.length, totalRows.value)
    : Math.min(currentPage.value * pageSize.value, totalRows.value)
)

const summaryText = computed(() => {
  const range = { from: showingFrom.value, to: showingTo.value, total: totalRows.value }
  return props.summaryFormatter
    ? props.summaryFormatter(range)
    : t('dataTable.pagination.showing', range)
})

/* -------------------------------------------------------------------------- */
/* Selection                                                                  */
/* -------------------------------------------------------------------------- */

const internalSelected = ref<(string | number)[]>(props.selected ?? [])

watch(
  () => props.selected,
  selected => {
    if (selected !== undefined) internalSelected.value = [...selected]
  }
)

const selectedKeys = computed(() =>
  props.selected !== undefined ? props.selected : internalSelected.value
)

const rowKeyOf = (row: TRow, index: number): string | number => {
  if (typeof props.rowKey === 'function') return props.rowKey(row, index)
  const value = (row as Record<string, unknown>)[props.rowKey ?? 'id']
  return typeof value === 'string' || typeof value === 'number' ? value : index
}

const isSelected = (row: TRow, index: number) => selectedKeys.value.includes(rowKeyOf(row, index))

const commitSelection = (keys: (string | number)[]) => {
  internalSelected.value = keys
  emit('update:selected', keys)
}

const toggleRow = (row: TRow, index: number) => {
  const key = rowKeyOf(row, index)
  const keys = selectedKeys.value
  commitSelection(keys.includes(key) ? keys.filter(current => current !== key) : [...keys, key])
}

const pageKeys = computed(() => visibleRows.value.map((row, index) => rowKeyOf(row, index)))

const allPageSelected = computed(
  () => pageKeys.value.length > 0 && pageKeys.value.every(key => selectedKeys.value.includes(key))
)
const somePageSelected = computed(
  () => !allPageSelected.value && pageKeys.value.some(key => selectedKeys.value.includes(key))
)

/** `'indeterminate'` is reka-ui's tri-state value for a partial page. */
const headerCheckboxState = computed<boolean | 'indeterminate'>(() =>
  somePageSelected.value ? 'indeterminate' : allPageSelected.value
)

/** Only the current page is affected — selections on other pages are kept. */
const toggleAllOnPage = () => {
  if (allPageSelected.value) {
    const onPage = new Set(pageKeys.value)
    commitSelection(selectedKeys.value.filter(key => !onPage.has(key)))
    return
  }
  const merged = new Set(selectedKeys.value)
  pageKeys.value.forEach(key => merged.add(key))
  commitSelection([...merged])
}

/* -------------------------------------------------------------------------- */
/* Rows                                                                       */
/* -------------------------------------------------------------------------- */

const skeletonCount = computed(() =>
  Math.max(1, props.skeletonRows ?? (isPaginated.value ? pageSize.value : 5))
)

const handleRowClick = (row: TRow, index: number) => {
  if (!props.clickableRows) return
  emit('row-click', row, index)
}

const pageSizeOptions = computed(() => paginationConfig.value?.pageSizeOptions ?? [])
</script>

<template>
  <div
    :class="
      cn(
        'flex w-full flex-col overflow-hidden border border-stone-100 bg-white shadow-sm dark:border-stone-800 dark:bg-stone-900',
        props.fillHeight && 'h-full',
        props.class
      )
    "
  >
    <!-- ── Scroll container: horizontal on overflow, vertical when capped ─── -->
    <div
      :class="cn('relative w-full overflow-auto', props.fillHeight && 'min-h-0 flex-1')"
      :style="{ maxHeight: props.maxHeight }"
      tabindex="0"
      role="region"
      :aria-label="props.caption ?? t('dataTable.regionLabel')"
    >
      <table
        data-slot="table"
        class="w-full caption-bottom border-collapse text-left text-sm"
        :style="{ minWidth: props.minWidth }"
        :aria-busy="props.loading"
        :aria-rowcount="totalRows"
      >
        <caption v-if="props.caption" class="sr-only">
          {{
            props.caption
          }}
        </caption>

        <TableHeader>
          <TableRow
            :class="
              cn(
                'border-stone-100 bg-stone-50 hover:bg-stone-50 dark:border-stone-800 dark:bg-stone-800 dark:hover:bg-stone-800',
                props.stickyHeader && 'sticky top-0 z-10'
              )
            "
          >
            <!-- Selection column -->
            <TableHead
              v-if="props.selectable"
              scope="col"
              :class="
                cn(
                  cellPadding,
                  'w-12 text-[11px] font-bold text-stone-500 dark:text-stone-400',
                  props.stickyHeader && 'sticky top-0 bg-stone-50 dark:bg-stone-800'
                )
              "
            >
              <CheckboxRoot
                :model-value="headerCheckboxState"
                :aria-label="t('dataTable.select.allOnPage')"
                :disabled="pageKeys.length === 0"
                class="flex size-5 shrink-0 items-center justify-center rounded border border-stone-300 bg-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D2691E]/40 disabled:opacity-40 data-[state=checked]:border-[#D2691E] data-[state=checked]:bg-[#D2691E] data-[state=indeterminate]:border-[#D2691E] data-[state=indeterminate]:bg-[#D2691E] dark:border-stone-600 dark:bg-stone-900"
                @update:model-value="toggleAllOnPage"
              >
                <CheckboxIndicator class="text-white">
                  <Minus v-if="somePageSelected" class="size-3.5" />
                  <Check v-else class="size-3.5" />
                </CheckboxIndicator>
              </CheckboxRoot>
            </TableHead>

            <!-- Data columns -->
            <TableHead
              v-for="header in props.headers"
              :key="header.key"
              scope="col"
              :style="headerStyle(header)"
              :aria-sort="ariaSortFor(header)"
              :class="
                cn(
                  cellPadding,
                  'text-[11px] font-bold tracking-wide text-stone-500 uppercase dark:text-stone-400',
                  ALIGN_CLASS[alignOf(header)],
                  responsiveClass(header),
                  props.stickyHeader && 'sticky top-0 bg-stone-50 dark:bg-stone-800',
                  header.headerClass
                )
              "
            >
              <slot :name="`header:${header.key}`" :column="header">
                <!-- Sortable headers are real buttons: focusable and Enter/Space operable -->
                <button
                  v-if="header.sortable"
                  type="button"
                  :aria-label="t('dataTable.sort.action', { column: headerLabel(header) })"
                  :class="
                    cn(
                      'inline-flex items-center gap-1.5 rounded-md text-[11px] font-bold tracking-wide uppercase transition-colors hover:text-[#974400] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D2691E]/40 dark:hover:text-[#E08B4C]',
                      JUSTIFY_CLASS[alignOf(header)],
                      alignOf(header) === 'right' && 'w-full',
                      activeSort?.key === header.key && 'text-[#974400] dark:text-[#E08B4C]'
                    )
                  "
                  @click="toggleSort(header)"
                >
                  <span>{{ headerLabel(header) }}</span>
                  <ArrowUp
                    v-if="activeSort?.key === header.key && activeSort.direction === 'asc'"
                    class="size-3.5 shrink-0"
                    aria-hidden="true"
                  />
                  <ArrowDown
                    v-else-if="activeSort?.key === header.key && activeSort.direction === 'desc'"
                    class="size-3.5 shrink-0"
                    aria-hidden="true"
                  />
                  <ChevronsUpDown v-else class="size-3.5 shrink-0 opacity-40" aria-hidden="true" />
                </button>

                <span v-else :aria-label="header.ariaLabel">{{ headerLabel(header) }}</span>
              </slot>
            </TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          <!-- ── Loading skeleton ──────────────────────────────────────────── -->
          <template v-if="props.loading">
            <TableRow
              v-for="skeletonRow in skeletonCount"
              :key="`skeleton-${skeletonRow}`"
              class="animate-pulse border-stone-50 hover:bg-transparent dark:border-stone-800"
            >
              <TableCell v-if="props.selectable" :class="cellPadding">
                <div class="size-5 rounded bg-stone-100 dark:bg-stone-800" />
              </TableCell>
              <TableCell
                v-for="header in props.headers"
                :key="header.key"
                :class="cn(cellPadding, responsiveClass(header))"
              >
                <div
                  class="h-3 rounded bg-stone-100 dark:bg-stone-800"
                  :class="alignOf(header) === 'right' ? 'ml-auto w-16' : 'w-24'"
                />
              </TableCell>
            </TableRow>
          </template>

          <!-- ── Rows ──────────────────────────────────────────────────────── -->
          <template v-else-if="visibleRows.length > 0">
            <TableRow
              v-for="(row, rowIndex) in visibleRows"
              :key="rowKeyOf(row, rowIndex)"
              :data-state="isSelected(row, rowIndex) ? 'selected' : undefined"
              :aria-selected="props.selectable ? isSelected(row, rowIndex) : undefined"
              :tabindex="props.clickableRows ? 0 : undefined"
              :class="
                cn(
                  'border-stone-50 hover:bg-stone-50/50 dark:border-stone-800 dark:hover:bg-stone-800/50',
                  props.clickableRows &&
                    'cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#D2691E]/40',
                  isSelected(row, rowIndex) && 'bg-[#FFF6EF] dark:bg-stone-800/70',
                  props.rowClass?.(row, rowIndex)
                )
              "
              @click="handleRowClick(row, rowIndex)"
              @keydown.enter.prevent="handleRowClick(row, rowIndex)"
              @keydown.space.prevent="handleRowClick(row, rowIndex)"
            >
              <TableCell v-if="props.selectable" :class="cellPadding">
                <CheckboxRoot
                  :model-value="isSelected(row, rowIndex)"
                  :aria-label="t('dataTable.select.row')"
                  class="flex size-5 shrink-0 items-center justify-center rounded border border-stone-300 bg-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D2691E]/40 data-[state=checked]:border-[#D2691E] data-[state=checked]:bg-[#D2691E] dark:border-stone-600 dark:bg-stone-900"
                  @click.stop
                  @update:model-value="toggleRow(row, rowIndex)"
                >
                  <CheckboxIndicator class="text-white">
                    <Check class="size-3.5" />
                  </CheckboxIndicator>
                </CheckboxRoot>
              </TableCell>

              <TableCell
                v-for="header in props.headers"
                :key="header.key"
                :class="
                  cn(
                    cellPadding,
                    'text-sm text-stone-900 dark:text-stone-100',
                    ALIGN_CLASS[alignOf(header)],
                    showsCurrency(header) && 'tabular-nums',
                    responsiveClass(header),
                    header.cellClass
                  )
                "
              >
                <slot :name="`cell:${header.key}`" v-bind="cellContext(header, row, rowIndex)">
                  <RenderCell v-if="header.cell" :node="renderCellNode(header, row, rowIndex)" />
                  <template v-else>{{ formatCell(header, row, rowIndex) }}</template>
                </slot>
              </TableCell>
            </TableRow>
          </template>

          <!-- ── Empty state ───────────────────────────────────────────────── -->
          <TableEmpty v-else :colspan="totalColumnCount" class="px-6 text-center">
            <slot name="empty">
              <div class="flex flex-col items-center gap-3">
                <div
                  class="flex size-16 items-center justify-center rounded-full bg-stone-100 dark:bg-stone-800"
                >
                  <Inbox class="size-7 text-stone-400 dark:text-stone-500" aria-hidden="true" />
                </div>
                <div>
                  <p class="text-sm font-bold text-stone-700 dark:text-stone-300">
                    {{ props.emptyTitle ?? t('dataTable.empty.title') }}
                  </p>
                  <p class="mt-1 text-xs text-stone-400 dark:text-stone-500">
                    {{ props.emptyDescription ?? t('dataTable.empty.description') }}
                  </p>
                </div>
              </div>
            </slot>
          </TableEmpty>
        </TableBody>
      </table>
    </div>

    <!-- ── Pagination footer ─────────────────────────────────────────────── -->
    <div
      v-if="isPaginated"
      class="flex flex-col items-center justify-between gap-3 bg-stone-50/30 px-3 py-3 md:flex-row md:px-6 md:py-4 dark:bg-stone-800/30"
    >
      <div class="flex flex-col items-center gap-3 sm:flex-row sm:gap-5">
        <slot name="footer-start" />

        <!-- Page-size selector: a native select keeps it keyboard/touch native -->
        <label
          v-if="paginationConfig?.showPageSizeSelector && pageSizeOptions.length > 0"
          class="flex items-center gap-2 text-xs text-stone-500 dark:text-stone-400"
        >
          <span>{{ t('dataTable.pagination.rowsPerPage') }}</span>
          <select
            :value="pageSize"
            class="h-9 min-w-16 rounded-lg border border-stone-200 bg-white px-2 text-xs font-bold text-stone-600 transition-colors hover:border-stone-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D2691E]/40 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300"
            @change="setPageSize(($event.target as HTMLSelectElement).value)"
          >
            <option v-for="option in pageSizeOptions" :key="option" :value="option">
              {{ option }}
            </option>
          </select>
        </label>

        <span
          v-if="paginationConfig?.showSummary"
          class="text-xs text-stone-500 md:text-sm dark:text-stone-400"
          aria-live="polite"
        >
          {{ summaryText }}
        </span>
      </div>

      <PaginationRoot
        :page="currentPage"
        :total="totalRows"
        :items-per-page="pageSize"
        :sibling-count="paginationConfig?.siblingCount"
        :show-edges="paginationConfig?.showEdges"
        @update:page="handlePageUpdate"
      >
        <PaginationList
          v-slot="{ items }"
          class="flex items-center gap-1"
          :aria-label="t('dataTable.pagination.label')"
        >
          <PaginationFirst
            v-if="paginationConfig?.showEdges"
            :title="t('dataTable.pagination.firstPage')"
            :aria-label="t('dataTable.pagination.firstPage')"
            class="flex size-9 items-center justify-center rounded-lg border border-stone-200 bg-white text-stone-400 transition-colors hover:border-stone-300 hover:text-stone-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D2691E]/40 disabled:cursor-not-allowed disabled:opacity-40 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-500 dark:hover:border-stone-600 dark:hover:text-stone-300"
          >
            <ChevronsLeft class="size-4" aria-hidden="true" />
          </PaginationFirst>

          <PaginationPrev
            :title="t('dataTable.pagination.previousPage')"
            :aria-label="t('dataTable.pagination.previousPage')"
            class="flex size-9 items-center justify-center rounded-lg border border-stone-200 bg-white text-stone-400 transition-colors hover:border-stone-300 hover:text-stone-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D2691E]/40 disabled:cursor-not-allowed disabled:opacity-40 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-500 dark:hover:border-stone-600 dark:hover:text-stone-300"
          >
            <ChevronLeft class="size-4" aria-hidden="true" />
          </PaginationPrev>

          <template v-for="(item, index) in items" :key="index">
            <PaginationEllipsis
              v-if="item.type === 'ellipsis'"
              :index="index"
              class="flex size-9 items-center justify-center text-xs text-stone-400 select-none dark:text-stone-500"
            >
              &#8230;
            </PaginationEllipsis>

            <PaginationListItem
              v-else
              :value="item.value"
              :aria-label="t('dataTable.pagination.goToPage', { page: item.value })"
              class="flex size-9 items-center justify-center rounded-lg border border-stone-200 bg-white text-xs font-bold text-stone-600 transition-colors hover:border-stone-300 hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D2691E]/40 data-[selected]:border-transparent data-[selected]:bg-[#D2691E] data-[selected]:text-white dark:border-stone-700 dark:bg-stone-800 dark:text-stone-400 dark:hover:border-stone-600 dark:hover:bg-stone-700"
            >
              {{ item.value }}
            </PaginationListItem>
          </template>

          <PaginationNext
            :title="t('dataTable.pagination.nextPage')"
            :aria-label="t('dataTable.pagination.nextPage')"
            class="flex size-9 items-center justify-center rounded-lg border border-stone-200 bg-white text-stone-400 transition-colors hover:border-stone-300 hover:text-stone-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D2691E]/40 disabled:cursor-not-allowed disabled:opacity-40 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-500 dark:hover:border-stone-600 dark:hover:text-stone-300"
          >
            <ChevronRight class="size-4" aria-hidden="true" />
          </PaginationNext>

          <PaginationLast
            v-if="paginationConfig?.showEdges"
            :title="t('dataTable.pagination.lastPage')"
            :aria-label="t('dataTable.pagination.lastPage')"
            class="flex size-9 items-center justify-center rounded-lg border border-stone-200 bg-white text-stone-400 transition-colors hover:border-stone-300 hover:text-stone-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D2691E]/40 disabled:cursor-not-allowed disabled:opacity-40 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-500 dark:hover:border-stone-600 dark:hover:text-stone-300"
          >
            <ChevronsRight class="size-4" aria-hidden="true" />
          </PaginationLast>
        </PaginationList>
      </PaginationRoot>
    </div>
  </div>
</template>
