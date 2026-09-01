import type { HTMLAttributes, VNodeChild } from 'vue'

/**
 * Shared by every table primitive in `src/components/ui/table/`. They all take
 * the same single pass-through class, merged over their own defaults by `cn()`.
 */
export interface TablePrimitiveProps {
  class?: HTMLAttributes['class']
}

/** `TableEmpty` additionally spans the table's columns for its placeholder row. */
export interface TableEmptyProps extends TablePrimitiveProps {
  /** Columns the empty-state cell spans. Defaults to 1. */
  colspan?: number
}

/* -------------------------------------------------------------------------- */
/* DataTable — generic, config-driven table built on the primitives above.     */
/* -------------------------------------------------------------------------- */

/** Horizontal alignment applied to both a column's header and its cells. */
export type DataTableAlign = 'left' | 'center' | 'right'

/** Tri-state sorting: a third activation of a header clears the sort entirely. */
export type SortDirection = 'asc' | 'desc'

export interface DataTableSort {
  /** `key` of the sorted column. */
  key: string
  direction: SortDirection
}

/** Built-in value formatters. Anything else goes through `formatter`. */
export type DataTableFormat = 'text' | 'number' | 'currency' | 'percent' | 'date' | 'datetime'

/** Tailwind breakpoint below which a column is hidden, for narrow tablets/phones. */
export type DataTableBreakpoint = 'sm' | 'md' | 'lg' | 'xl'

/** Context handed to `cell`, `formatter` and the `cell:<key>` scoped slots. */
export interface DataTableCellContext<TRow> {
  /** Raw value read off the row (via `accessor` when provided). */
  value: unknown
  row: TRow
  /** Index within the currently rendered page, 0-based. */
  index: number
  column: DataTableHeader<TRow>
}

/**
 * Configuration for one column: its header cell plus how every cell beneath
 * it reads, formats and renders its value.
 */
export interface DataTableHeader<TRow> {
  /** Property name on the row, or a virtual key when paired with `accessor`/`cell`. */
  key: string
  /** Header label. Already translated by the consumer. */
  header: string
  /** Defaults to `'right'` for numeric formats, `'left'` otherwise. */
  align?: DataTableAlign
  /** Any CSS width, e.g. `'160px'` or `'20%'`. */
  width?: string
  /** Floor for the column while the table scrolls horizontally. */
  minWidth?: string
  /** Enables the keyboard-operable sort control in this column's header. */
  sortable?: boolean
  /** Built-in formatter applied to the cell value. */
  format?: DataTableFormat
  /** Fraction digits for `number` / `currency` / `percent`. */
  decimals?: number
  /**
   * Appends the table's currency symbol to the *header* so cells stay clean —
   * implied by `format: 'currency'`, set `false` to opt a column out.
   */
  currency?: boolean
  /** Full control over the displayed string; wins over `format`. */
  formatter?: (context: DataTableCellContext<TRow>) => string
  /** Custom renderer returning a VNode. The `cell:<key>` slot wins over this. */
  cell?: (context: DataTableCellContext<TRow>) => VNodeChild
  /** Reads the value for nested or computed columns. */
  accessor?: (row: TRow) => unknown
  /** Sort key when the displayed value is not what should be compared. */
  sortAccessor?: (row: TRow) => string | number | boolean | Date | null | undefined
  headerClass?: HTMLAttributes['class']
  cellClass?: HTMLAttributes['class']
  /** Hides the column below this breakpoint instead of forcing a scroll. */
  hideBelow?: DataTableBreakpoint
  /** Accessible column description, announced on the header cell. */
  ariaLabel?: string
}

export interface DataTablePaginationConfig {
  /** Set `false` to render the table without a pagination footer. */
  enabled?: boolean
  /** Controlled 1-based page. Omit to let the table own the page. */
  page?: number
  /** Controlled page size. Omit to let the table own it. Defaults to 10. */
  pageSize?: number
  /** Choices in the page-size selector. Defaults to `[5, 10, 25, 50]`. */
  pageSizeOptions?: number[]
  /** Hides the page-size selector when `false`. Defaults to `true`. */
  showPageSizeSelector?: boolean
  /** Renders first/last page buttons. Defaults to `true`. */
  showEdges?: boolean
  /** Page numbers kept either side of the current page. Defaults to 1. */
  siblingCount?: number
  /** Hides the "showing X–Y of Z" indicator when `false`. Defaults to `true`. */
  showSummary?: boolean
}

/**
 * Resolves a stable identity for a row — required for selection. A plain
 * property name, or a function for composite keys. Kept as `string` rather than
 * `keyof TRow` so Vue can still infer the runtime prop type through the generic.
 */
export type DataTableRowKey<TRow> = string | ((row: TRow, index: number) => string | number)

export interface DataTableProps<TRow> {
  /** Column configuration, in render order. */
  headers: DataTableHeader<TRow>[]
  /** Rows for the current view. In server mode this is already the page. */
  data: TRow[]
  /** Identity for `:key` and selection. Defaults to `'id'`, falling back to the index. */
  rowKey?: DataTableRowKey<TRow>
  /** Swaps the body for skeleton rows. */
  loading?: boolean
  /** Adds the leading checkbox column. */
  selectable?: boolean
  /** Selected row keys — use with `v-model:selected`. */
  selected?: (string | number)[]
  /** Active sort — use with `v-model:sort`. Omit to let the table own it. */
  sort?: DataTableSort | null
  /** Pins the header while the body scrolls. Pair with `maxHeight`. */
  stickyHeader?: boolean
  /**
   * Ceiling for the scroll container, e.g. `'300px'` (the default) or `'70vh'`.
   * Past it the body scrolls under the sticky header while the pagination
   * footer stays put; a page with fewer rows shrinks to fit rather than
   * padding out to this height. Set `'none'` to let the table grow unbounded.
   */
  maxHeight?: string
  /** Width at which horizontal scrolling kicks in. Defaults to `'640px'`. */
  minWidth?: string
  /**
   * Fills the parent's height instead of sizing to content: the body takes the
   * space left over and scrolls, and the pagination footer pins to the bottom.
   * The parent must give the table a definite height — a flex/grid child, or
   * `h-full`. Pair with `maxHeight: 'none'`.
   */
  fillHeight?: boolean
  /** Pagination config, or `false` to drop the footer. */
  pagination?: DataTablePaginationConfig | false
  /**
   * Total rows across all pages. Providing it switches the table to server
   * mode: `data` is rendered as-is and paging/sorting are delegated upward.
   */
  totalCount?: number
  /** Forces server mode even when `totalCount` is unknown. */
  serverSide?: boolean
  /**
   * Sorts `data` locally even in server mode, for an API that pages but cannot
   * sort. `data` is only the current page, so the order applies to that page
   * alone — and sorting no longer resets to page 1, since the offset still holds.
   */
  clientSort?: boolean
  /** Symbol shown in currency column headers. Defaults to `'$'`. */
  currencySymbol?: string
  /** BCP-47 locale for the built-in formatters. Defaults to the i18n locale. */
  locale?: string
  /** Placeholder for `null` / `undefined` cell values. Defaults to `'—'`. */
  emptyValue?: string
  /** Overrides for the empty state copy. */
  emptyTitle?: string
  emptyDescription?: string
  /** Screen-reader caption describing the table's purpose. */
  caption?: string
  /** Extra classes per row, e.g. to flag a negative balance. */
  rowClass?: (row: TRow, index: number) => HTMLAttributes['class']
  /** Makes rows activatable via click, Enter and Space; emits `row-click`. */
  clickableRows?: boolean
  /** Skeleton row count while loading. Defaults to the page size, so the
   *  loading state is exactly as tall as the loaded one. */
  skeletonRows?: number
  /** Tightens row padding for dense, data-heavy tables. */
  dense?: boolean
  /** Overrides the built-in "showing X–Y of Z" text. */
  summaryFormatter?: (range: { from: number; to: number; total: number }) => string
  class?: HTMLAttributes['class']
}
