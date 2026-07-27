<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  ComboboxRoot,
  ComboboxAnchor,
  ComboboxInput,
  ComboboxTrigger,
  ComboboxContent,
  ComboboxViewport,
  ComboboxItem,
  ComboboxItemIndicator,
  ComboboxEmpty,
  type ComboboxRootEmits,
  type ComboboxRootProps,
  useForwardProps,
} from 'reka-ui'
import { Check, ChevronsUpDown } from 'lucide-vue-next'

interface Option {
  value: string | number
  label: string
}

interface Props extends Omit<ComboboxRootProps, 'filterFunction' | 'displayValue'> {
  options: Option[]
  placeholder?: string
  label?: string
  allOptionLabel?: string
  allOptionValue?: string
  hasSelectedAllOption?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: undefined,
  label: undefined,
  allOptionLabel: undefined,
  allOptionValue: 'all',
  hasSelectedAllOption: true,
})

const emit = defineEmits<ComboboxRootEmits>()

// useForwardProps only (not emits) so we can intercept update:modelValue ourselves
const forwardedProps = useForwardProps(props)

const { t } = useI18n()

const isOpen = ref(false)
const searchTerm = ref('')

const resolvedPlaceholder = computed(() => props.placeholder ?? t('common.select'))

const resolvedAllOptionLabel = computed(() => props.allOptionLabel ?? t('common.all'))

const allOptions = computed<Option[]>(() => [
  ...(props.hasSelectedAllOption
    ? [{ value: props.allOptionValue, label: resolvedAllOptionLabel.value }]
    : []),
  ...props.options,
])

// The label string for the current modelValue — used as ComboboxRoot's internal value
const selectedLabel = computed(() => {
  const val = props.modelValue
  if (val === undefined || val === null || val === '') return ''
  return allOptions.value.find(opt => String(opt.value) === String(val))?.label ?? ''
})

// ComboboxItem uses option.label as value, so reka-ui emits the label string.
// We remap it back to the actual option value before emitting to the parent.
const handleSelect = (value: string | number | bigint | Record<string, string> | null) => {
  if (typeof value !== 'string') {
    emit('update:modelValue', value)
    return
  }

  const option = allOptions.value.find(opt => opt.label === value)
  if (option) emit('update:modelValue', option.value)
}

// When dropdown closes, restore the selected label into the input
watch(isOpen, open => {
  if (!open) searchTerm.value = selectedLabel.value
  else searchTerm.value = ''
})

// Sync on mount and when modelValue changes externally
watch(
  selectedLabel,
  label => {
    if (!isOpen.value) searchTerm.value = label
  },
  { immediate: true }
)
</script>

<template>
  <div :class="label ? 'flex flex-col gap-1' : ''">
    <label v-if="label" class="text-xs font-semibold uppercase tracking-wide text-[#1A1C1C]/50">
      {{ label }}
    </label>

    <ComboboxRoot
      v-bind="forwardedProps"
      v-model:open="isOpen"
      :model-value="selectedLabel"
      class="relative"
      @update:model-value="handleSelect"
    >
      <ComboboxAnchor
        class="flex w-full items-center justify-between rounded-md bg-[#FAFAFA] px-5 py-2 text-sm text-[#1A1C1C]"
      >
        <ComboboxInput
          :placeholder="resolvedPlaceholder"
          class="flex-1 text-sm text-[#000000] outline-none placeholder:text-stone-400 font-bold"
          @click="isOpen = true"
          @focus="isOpen = true"
        />
        <ComboboxTrigger class="ml-2 text-[#1A1C1C]/40 transition-colors hover:text-[#1A1C1C]/70">
          <ChevronsUpDown class="h-4 w-4 shrink-0" />
        </ComboboxTrigger>
      </ComboboxAnchor>

      <ComboboxContent
        class="absolute z-50 mt-1 w-full overflow-hidden rounded-md border border-stone-200 bg-white shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
      >
        <ComboboxViewport class="max-h-60 overflow-y-auto p-1">
          <ComboboxEmpty class="py-6 text-center text-sm text-stone-400">
            {{ t('common.noResults') }}
          </ComboboxEmpty>

          <ComboboxItem
            v-for="option in allOptions"
            :key="option.value"
            :value="option.label"
            class="relative flex cursor-pointer select-none items-center rounded-sm py-1.5 pl-8 pr-4 text-sm text-[#1A1C1C] outline-none data-[highlighted]:bg-stone-100 data-[highlighted]:text-[#1A1C1C] data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
          >
            <ComboboxItemIndicator class="absolute left-2 flex items-center justify-center">
              <Check class="h-4 w-4" />
            </ComboboxItemIndicator>
            {{ option.label }}
          </ComboboxItem>
        </ComboboxViewport>
      </ComboboxContent>
    </ComboboxRoot>
  </div>
</template>
