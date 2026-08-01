import type { Component } from 'vue'

export type GlobalRangeKey = 'today' | 'yesterday' | 'last7' | 'thisMonth' | 'thisYear' | 'custom'

/** A resolved global range: the chosen preset plus its concrete ISO window. */
export interface GlobalRangeValue {
  key: GlobalRangeKey
  startDate: string
  endDate: string
}

export type ItemPeriod = 'thisWeek' | 'thisMonth' | 'thisYear' | 'range'

/**
 * An atomic item-period selection emitted by the period filter: the chosen
 * period together with its companion range value ("YYYY-MM-DD..YYYY-MM-DD" when
 * period is 'range', otherwise ''). Emitted as one unit so a consumer applies
 * both fields in a single update and fires exactly one request.
 */
export interface ItemPeriodSelection {
  period: ItemPeriod
  value: string
}

/** A best/lowest-selling row as rendered in the analytics item tables. */
export interface DisplayItem {
  id: number
  name: string
  category: string
  catClass: string
  units: number
}

/** A low-stock alert row as rendered in the analytics inventory table. */
export interface StockAlert {
  id: number
  name: string
  status: 'critical' | 'low'
  remaining: number
  unit: string
}

/** A single bar in the sales bar chart (a label and its value). */
export interface BarDatum {
  label: string
  value: number
}

/** Props for the global date-range filter (v-model of the resolved range). */
export interface GlobalDateFilterProps {
  modelValue: GlobalRangeValue
}

/** Props for the per-table item-period filter. */
export interface ItemPeriodFilterProps {
  /** Selected period. */
  period: ItemPeriod
  /** Companion value: "YYYY-MM-DD..YYYY-MM-DD" when period is 'range'. */
  value: string
}

/** Props for a KPI stat card. */
export interface AnalyticsStatCardProps {
  label: string
  value: string
  icon: Component
  iconBgClass: string
  iconColorClass: string
  /** e.g. 12.5 for +12.5%, -1.7 for a decline. Omit for a neutral card. */
  trend?: number | null
  trendLabel?: string
}

/** Props for the sales bar chart. */
export interface SalesBarChartProps {
  data: BarDatum[]
  /** Currency prefix used in tooltips / axis labels. */
  prefix?: string
}
