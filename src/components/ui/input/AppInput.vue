<script setup lang="ts">
import { computed, useId, useSlots } from 'vue'
import { useVModel } from '@vueuse/core'
import { Search } from 'lucide-vue-next'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import type { AppInputProps, AppInputValue } from '@/types/input.types'

const props = defineProps<AppInputProps>()

const emits = defineEmits<{
  (e: 'update:modelValue', payload: AppInputValue): void
}>()

// The labelled and iconned variants wrap the input in a div, so attrs like
// `placeholder`, `type` or `aria-invalid` have to be forwarded by hand.
defineOptions({ inheritAttrs: false })

const slots = useSlots()

const modelValue = useVModel(props, 'modelValue', emits, {
  passive: true,
  defaultValue: props.defaultValue,
})

const generatedId = useId()

const inputId = computed(() => props.id ?? generatedId)

const hasIcon = computed(() => props.searchIcon || Boolean(slots.icon))

const inputClass = computed(() =>
  cn(
    'file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
    'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
    'aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive',
    // Room for the icon; listed before `props.class` so callers can still override.
    hasIcon.value && 'pl-10',
    props.class
  )
)
</script>

<template>
  <!-- Without a label or an icon the input stays the root element, so callers
       keep full control of layout and the grid/flex classes they put on it. -->
  <input
    v-if="!label && !hasIcon"
    :id="inputId"
    v-model="modelValue"
    data-slot="input"
    :class="inputClass"
    v-bind="$attrs"
  />

  <div v-else :class="cn('w-full', label && 'flex flex-col gap-1', containerClass)">
    <Label v-if="label" :for="inputId" :class="labelClass">{{ label }}</Label>

    <div class="relative">
      <span
        v-if="hasIcon"
        class="pointer-events-none absolute left-3 top-1/2 flex -translate-y-1/2 items-center text-stone-400 dark:text-stone-500"
      >
        <slot name="icon">
          <Search class="size-4" />
        </slot>
      </span>

      <input
        :id="inputId"
        v-model="modelValue"
        data-slot="input"
        :class="inputClass"
        v-bind="$attrs"
      />
    </div>
  </div>
</template>
