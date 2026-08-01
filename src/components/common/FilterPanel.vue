<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Plus, SlidersHorizontal, X } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/**
 * Shared filter panel shell used by every management screen.
 *
 * Owns the card section, the 12-column field grid and the action buttons so the
 * pages only declare their own fields. Fields go in the default slot and carry
 * their own `col-span-*` classes; the actions cell is always last in the grid.
 */
interface Props {
  /** Shows the Clear button. Pages compute this from their own filter state. */
  hasActiveFilters?: boolean
  /** Explicit-apply screens submit the form; live-filter screens hide it. */
  showApply?: boolean
  showClear?: boolean
  /** Renders a primary "add" action in the actions cell when set. */
  addLabel?: string
  applyLabel?: string
  clearLabel?: string
  /** Grid span for the actions cell. */
  actionsClass?: string
  /** Extra classes for the section, e.g. rounding when not nested in a card. */
  sectionClass?: string
}

const props = withDefaults(defineProps<Props>(), {
  hasActiveFilters: false,
  showApply: true,
  showClear: true,
  addLabel: undefined,
  applyLabel: undefined,
  clearLabel: undefined,
  actionsClass: 'col-span-12 lg:col-span-3',
  sectionClass: undefined,
})

const emit = defineEmits<{
  submit: []
  clear: []
  add: []
}>()

const { t } = useI18n()

const resolvedApplyLabel = computed(() => props.applyLabel ?? t('common.applyFilters'))
const resolvedClearLabel = computed(() => props.clearLabel ?? t('common.clearFilters'))

// Buttons stay on one line and shrink their text/padding with the actions cell,
// which is far narrower on a wide screen (a 2-3 column slot) than on a phone
// (a full-width row) — a media query would read the wrong width.
const actionsCellClass =
  '@container flex flex-wrap items-center justify-end gap-2 text-[11px] @min-[240px]:text-xs @min-[320px]:text-[13px] @min-[380px]:text-sm'

// Button's cva base hardcodes `text-sm`, which beats the size inherited from the
// actions cell — so each button carries the container-query text scale itself.
const buttonBaseClass =
  'h-10 shrink-0 gap-1 rounded-md px-3 text-[11px] font-bold @min-[240px]:text-xs @min-[260px]:px-4 @min-[320px]:gap-1.5 @min-[320px]:text-[13px] @min-[380px]:text-sm lg:flex-1 lg:px-2 @min-[320px]:lg:px-4'
</script>

<template>
  <section
    :class="
      cn(
        'shrink-0 border border-stone-200/60 bg-white p-5 dark:border-stone-800/60 dark:bg-stone-900',
        sectionClass
      )
    "
  >
    <form class="grid grid-cols-12 gap-4 sm:items-end" @submit.prevent="emit('submit')">
      <slot />

      <!-- filter actions -->
      <div :class="cn(actionsCellClass, actionsClass)">
        <slot name="actions" />

        <Button
          v-if="showClear && hasActiveFilters"
          type="button"
          variant="tertiary"
          :title="resolvedClearLabel"
          :aria-label="resolvedClearLabel"
          :class="
            cn(
              buttonBaseClass,
              'text-stone-500 hover:bg-stone-100 hover:text-stone-700 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-200'
            )
          "
          @click="emit('clear')"
        >
          <X class="size-4 @min-[320px]:size-[18px]" />
          {{ resolvedClearLabel }}
        </Button>

        <Button
          v-if="showApply"
          type="submit"
          variant="tertiary"
          :class="
            cn(
              buttonBaseClass,
              'border border-primary text-primary hover:bg-primary/10 dark:hover:bg-primary/20'
            )
          "
        >
          <SlidersHorizontal class="size-4 @min-[320px]:size-[18px]" />
          {{ resolvedApplyLabel }}
        </Button>

        <Button
          v-if="addLabel"
          type="button"
          variant="primary"
          :class="buttonBaseClass"
          @click="emit('add')"
        >
          <Plus class="size-4 @min-[320px]:size-[18px]" />
          {{ addLabel }}
        </Button>
      </div>
    </form>
  </section>
</template>
