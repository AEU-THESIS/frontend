import type { HTMLAttributes } from 'vue'

/** What a text/number field can hold; `null` covers a cleared or not-yet-loaded value. */
export type AppInputValue = string | number | null

export interface AppInputProps {
  defaultValue?: AppInputValue
  modelValue?: AppInputValue
  /** Renders a label above the input and ties it to the field. Omit for a bare input. */
  label?: string
  /** Renders the search icon inside the field; the `icon` slot overrides which icon. */
  searchIcon?: boolean
  /** Falls back to a generated id so the label can point at the input. */
  id?: string
  class?: HTMLAttributes['class']
  /** Extra classes for the label; ignored without a label. */
  labelClass?: HTMLAttributes['class']
  /** Extra classes for the label + input wrapper; ignored on a bare input. */
  containerClass?: HTMLAttributes['class']
}
