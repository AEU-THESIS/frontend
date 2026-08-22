/** Prop shapes for the shared components in `@/components/common`. */

export interface ConfirmDialogProps {
  /** Controlled visibility — pair with `v-model:open`. */
  open: boolean
  title: string
  /** Body text. Override with the default slot for richer content. */
  message?: string
  confirmLabel?: string
  cancelLabel?: string
  /** `danger` for destructive actions (default), `primary` for neutral ones. */
  variant?: 'danger' | 'primary'
  /** Shows a spinner and blocks dismissal while the action is in flight. */
  loading?: boolean
}

export interface AppTooltipProps {
  /** Tooltip text. Empty or omitted renders the trigger with no tooltip. */
  content?: string
  side?: 'top' | 'right' | 'bottom' | 'left'
  /** Milliseconds to hover before the tooltip opens. */
  delayDuration?: number
}
