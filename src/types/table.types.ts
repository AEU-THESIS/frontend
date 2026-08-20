import type { HTMLAttributes } from 'vue'

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
