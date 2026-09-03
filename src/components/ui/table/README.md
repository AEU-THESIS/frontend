# Table & `DataTable`

Generic, config-driven table built on the shadcn-vue table primitives in this folder.
Columns are declared as data — sorting, paging, selection, formatting and the empty
and loading states are handled by the component.

```ts
import { DataTable } from '@/components/ui/table'
import type { DataTableHeader, DataTableSort } from '@/types/table.types'
```

Primitives (`TableHeader`, `TableBody`, `TableRow`, `TableHead`, `TableCell`,
`TableFooter`, `TableCaption`, `TableEmpty`) are exported from the same barrel for the
rare layout `DataTable` cannot express.

---

## Quick start

```vue
<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { DataTable } from '@/components/ui/table'
import type { DataTableHeader } from '@/types/table.types'

interface CafeSaleRow {
  id: number
  item: string
  soldAt: string
  total: number
}

const { t } = useI18n()
const rows = ref<CafeSaleRow[]>([])

const headers = computed<DataTableHeader<CafeSaleRow>[]>(() => [
  { key: 'item', header: t('reports.table.item'), sortable: true, minWidth: '200px' },
  { key: 'soldAt', header: t('reports.table.time'), format: 'datetime', sortable: true },
  { key: 'total', header: t('reports.table.total'), format: 'currency', sortable: true },
])
</script>

<template>
  <DataTable :headers="headers" :data="rows" row-key="id" />
</template>
```

Header labels are already-translated strings — build `headers` inside a `computed` so
they re-render when the locale changes.

---

## Props

| Prop                              | Type                                         | Default             | Notes                                                                                                                                                                    |
| --------------------------------- | -------------------------------------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `headers`                         | `DataTableHeader<TRow>[]`                    | —                   | Column config, in render order.                                                                                                                                          |
| `data`                            | `TRow[]`                                     | —                   | Rows for the current view. In server mode this is already the page.                                                                                                      |
| `rowKey`                          | `string \| (row, index) => string \| number` | `'id'`              | Row identity for `:key` and selection; falls back to the index.                                                                                                          |
| `loading`                         | `boolean`                                    | `false`             | Swaps the body for skeleton rows.                                                                                                                                        |
| `selectable`                      | `boolean`                                    | `false`             | Adds the leading checkbox column.                                                                                                                                        |
| `selected`                        | `(string \| number)[]`                       | —                   | Selected row keys — use with `v-model:selected`.                                                                                                                         |
| `sort`                            | `DataTableSort \| null`                      | —                   | Active sort — use with `v-model:sort`. Omit to let the table own it.                                                                                                     |
| `stickyHeader`                    | `boolean`                                    | `true`              | Pins the header while the body scrolls.                                                                                                                                  |
| `maxHeight`                       | `string`                                     | `'450px'`           | Scroll-container ceiling, e.g. `'70vh'`. `'none'` grows unbounded; a short page shrinks to fit.                                                                          |
| `minWidth`                        | `string`                                     | `'640px'`           | Width at which horizontal scrolling kicks in.                                                                                                                            |
| `fillHeight`                      | `boolean`                                    | `false`             | Fills the parent's height: the body scrolls in the space left over and the footer pins to the bottom. Pair with `maxHeight: 'none'`, in a parent with a definite height. |
| `pagination`                      | `DataTablePaginationConfig \| false`         | —                   | `false` drops the footer.                                                                                                                                                |
| `totalCount`                      | `number`                                     | —                   | Total rows across all pages. **Providing it switches to server mode.**                                                                                                   |
| `serverSide`                      | `boolean`                                    | `false`             | Forces server mode when `totalCount` is unknown.                                                                                                                         |
| `clientSort`                      | `boolean`                                    | `false`             | Sorts locally _within_ the server-supplied page. See [Sorting a server-paged table](#sorting-a-server-paged-table).                                                      |
| `currencySymbol`                  | `string`                                     | `'$'`               | Shown in currency column headers.                                                                                                                                        |
| `locale`                          | `string`                                     | i18n locale         | BCP-47 locale for the built-in formatters (`kh` → `km-KH`, else `en-US`).                                                                                                |
| `emptyValue`                      | `string`                                     | `'—'`               | Placeholder for `null` / `undefined` / `''` cells.                                                                                                                       |
| `emptyTitle` / `emptyDescription` | `string`                                     | `dataTable.empty.*` | Overrides the empty-state copy.                                                                                                                                          |
| `caption`                         | `string`                                     | —                   | Screen-reader caption; also labels the scroll region.                                                                                                                    |
| `rowClass`                        | `(row, index) => class`                      | —                   | Extra classes per row, e.g. to flag a negative balance.                                                                                                                  |
| `clickableRows`                   | `boolean`                                    | `false`             | Rows activate on click, Enter and Space; emits `row-click`.                                                                                                              |
| `skeletonRows`                    | `number`                                     | page size           | Skeleton count, so loading is as tall as loaded.                                                                                                                         |
| `dense`                           | `boolean`                                    | `false`             | Tightens row padding for data-heavy tables.                                                                                                                              |
| `summaryFormatter`                | `({ from, to, total }) => string`            | —                   | Overrides the "showing X–Y of Z" text.                                                                                                                                   |
| `class`                           | `HTMLAttributes['class']`                    | —                   | Merged over the wrapper's own classes by `cn()`.                                                                                                                         |

## Column config — `DataTableHeader<TRow>`

| Field                       | Type                                                                    | Notes                                                                                                 |
| --------------------------- | ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `key`                       | `string`                                                                | Property name on the row, or a virtual key paired with `accessor` / `cell`.                           |
| `header`                    | `string`                                                                | Translated label.                                                                                     |
| `align`                     | `'left' \| 'center' \| 'right'`                                         | Defaults to `'right'` for numeric formats, `'left'` otherwise.                                        |
| `width` / `minWidth`        | `string`                                                                | Any CSS width.                                                                                        |
| `sortable`                  | `boolean`                                                               | Enables the keyboard-operable sort control.                                                           |
| `format`                    | `'text' \| 'number' \| 'currency' \| 'percent' \| 'date' \| 'datetime'` | Built-in formatter.                                                                                   |
| `decimals`                  | `number`                                                                | Fraction digits — `number` `0`, `currency` `2`, `percent` `1`.                                        |
| `currency`                  | `boolean`                                                               | Appends the currency symbol to the _header_; implied by `format: 'currency'`, set `false` to opt out. |
| `formatter`                 | `(ctx) => string`                                                       | Full control over the displayed string; wins over `format`.                                           |
| `cell`                      | `(ctx) => VNodeChild`                                                   | Custom renderer. The `cell:<key>` slot wins over this.                                                |
| `accessor`                  | `(row) => unknown`                                                      | Reads the value for nested or computed columns.                                                       |
| `sortAccessor`              | `(row) => string \| number \| boolean \| Date \| null`                  | Sort key when the displayed value is not what should be compared.                                     |
| `headerClass` / `cellClass` | `class`                                                                 | Per-column classes.                                                                                   |
| `hideBelow`                 | `'sm' \| 'md' \| 'lg' \| 'xl'`                                          | Hides the column below the breakpoint instead of forcing a scroll.                                    |
| `ariaLabel`                 | `string`                                                                | Accessible column description.                                                                        |

`ctx` is `DataTableCellContext<TRow>`: `{ value, row, index, column }`, where `index` is
0-based within the rendered page.

**Currency columns carry the symbol once, in the header** — `Cash ($)`, with bare
numbers in the cells.

## Pagination config — `DataTablePaginationConfig`

| Field                  | Default           | Notes                                                  |
| ---------------------- | ----------------- | ------------------------------------------------------ |
| `enabled`              | `true`            | `false` (or `:pagination="false"`) drops the footer.   |
| `page`                 | —                 | Controlled 1-based page. Omit to let the table own it. |
| `pageSize`             | `10`              | Controlled page size. Omit to let the table own it.    |
| `pageSizeOptions`      | `[5, 10, 25, 50]` | Choices in the page-size selector.                     |
| `showPageSizeSelector` | `true`            |                                                        |
| `showEdges`            | `true`            | First/last page buttons.                               |
| `siblingCount`         | `1`               | Page numbers kept either side of the current page.     |
| `showSummary`          | `true`            | The "showing X–Y of Z" indicator.                      |

## Events

| Event              | Payload                 | Notes                                                   |
| ------------------ | ----------------------- | ------------------------------------------------------- |
| `update:selected`  | `(string \| number)[]`  | `v-model:selected`.                                     |
| `update:sort`      | `DataTableSort \| null` | `v-model:sort`.                                         |
| `page-change`      | `page: number`          | 1-based. In server mode the parent must refetch.        |
| `page-size-change` | `pageSize: number`      | Always paired with a reset to page 1.                   |
| `sort-change`      | `DataTableSort \| null` | `null` once a tri-state header cycles back to unsorted. |
| `row-click`        | `(row, index)`          | Only when `clickableRows` is set.                       |

## Slots

| Slot           | Scope                           | Notes                                                      |
| -------------- | ------------------------------- | ---------------------------------------------------------- |
| `cell:<key>`   | `{ value, row, index, column }` | Per-column cell override; wins over the column's `cell()`. |
| `header:<key>` | `{ column }`                    | Per-column header override.                                |
| `empty`        | —                               | Replaces the whole empty state.                            |
| `footer-start` | —                               | Extra controls to the left of the pagination footer.       |

---

## Client-side mode

The table sorts and pages `data` itself. Selection is tracked by row key and survives
paging — the header checkbox toggles **only the current page**, and goes
`indeterminate` when the page is partly selected.

```vue
<script setup lang="ts">
const selected = ref<(string | number)[]>([])
const sort = ref<DataTableSort | null>({ key: 'total', direction: 'desc' })
</script>

<template>
  <DataTable
    v-model:selected="selected"
    v-model:sort="sort"
    :headers="headers"
    :data="rows"
    :loading="isLoading"
    :currency-symbol="currency_symbol"
    :caption="t('reports.subtitle')"
    row-key="id"
    selectable
    sticky-header
    max-height="70vh"
    :pagination="{ pageSize: 5, pageSizeOptions: [5, 10, 25] }"
  >
    <template #[`cell:total`]="{ row }">
      <span :class="row.total >= 40 ? 'font-bold text-emerald-600' : 'font-bold'">
        {{ row.total.toFixed(2) }}
      </span>
    </template>

    <template #footer-start>
      <span v-if="selected.length" class="text-xs font-bold text-[#974400]">
        {{ selected.length }} · {{ currency_symbol }}{{ selectedTotal.toFixed(2) }}
      </span>
    </template>
  </DataTable>
</template>
```

Sorting is tri-state: asc → desc → unsorted. Blanks sort last in both directions, and
re-sorting resets to page 1.

## Server-side mode

Providing `totalCount` puts the parent in control: the table renders `data` as-is —
no local sorting or slicing — and hands paging and sorting back through the handlers.
Per the layered architecture, the fetch belongs in a Pinia store calling `src/api/`,
never in the view.

```vue
<script setup lang="ts">
const page = ref(1)
const pageSize = ref(10)
const sort = ref<DataTableSort | null>(null)

const fetchSales = () =>
  reportStore.fetchItemSales({
    page: page.value,
    limit: pageSize.value,
    sortBy: sort.value?.key,
    sortDir: sort.value?.direction,
  })

const handlePageChange = (next: number) => {
  page.value = next
  fetchSales()
}

const handlePageSizeChange = (next: number) => {
  pageSize.value = next
  page.value = 1
  fetchSales()
}

const handleSortChange = (next: DataTableSort | null) => {
  sort.value = next
  page.value = 1
  fetchSales()
}
</script>

<template>
  <DataTable
    :headers="headers"
    :data="serverRows"
    :total-count="serverTotal"
    :loading="isServerLoading"
    :sort="sort"
    :pagination="{ page, pageSize }"
    row-key="id"
    @page-change="handlePageChange"
    @page-size-change="handlePageSizeChange"
    @sort-change="handleSortChange"
  />
</template>
```

## Sorting a server-paged table

When the API pages but cannot sort, `clientSort` lets the table order the rows it was
handed:

```vue
<DataTable
  :headers="headers"
  :data="products"
  :total-count="total"
  :pagination="{ page, pageSize }"
  client-sort
  @page-change="fetchPage"
/>
```

**The sort covers the current page only** — the other pages live on the server, so
nothing outside `data` can move. On a 5-row page, clicking "Price" orders those 5 rows,
not the whole catalogue.

Two consequences follow, both handled for you:

- Sorting no longer resets to page 1 — re-ordering a page leaves its offset valid.
- **Changing the page clears the sort.** The next page arrives in the API's own order,
  so the table drops the sort (emitting `sort-change: null`) rather than implying an
  ordering it never applied. A new page size clears it for the same reason.

Use it when the page is the unit the viewer cares about. When they expect a true
ordering of everything, either sort server-side (`sort-change` → refetch) or drop
`totalCount` and page client-side.

## Custom cells

Two ways to render a cell, in precedence order:

1. **`cell:<key>` slot** — templates, other components, anything a template can hold.
2. **`cell()` on the column** — a render function, handy when the column config already
   lives in a `computed`:

```ts
{
  key: 'item',
  header: t('reports.table.item'),
  sortable: true,
  cell: ({ row }) =>
    h('div', { class: 'flex flex-col' }, [
      h('span', { class: 'font-bold text-stone-900 dark:text-stone-100' }, row.item),
      h('span', { class: 'text-xs text-stone-400 dark:text-stone-500' }, row.category),
    ]),
}
```

For text-only changes prefer `formatter` over `cell` — it keeps alignment and the
empty-value placeholder intact.

---

## I18n

The component's own chrome is translated from the `dataTable.*` namespace in
`src/i18n/locales/{en,kh}.json` — `regionLabel`, `empty.*`, `sort.action`, `select.*`
and `pagination.*`. Column labels and the caption are the consumer's job: pass
already-translated strings, never magic English.

## Accessibility

- Sort controls are buttons with `aria-sort` on the header cell.
- The scroll container is a labelled `region`, focusable for keyboard scrolling.
- Selection checkboxes carry `dataTable.select.*` labels; the header checkbox is tri-state.
- `clickableRows` rows respond to Enter and Space, not just click.
