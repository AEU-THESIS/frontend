<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  SelectRoot,
  type SelectRootEmits,
  type SelectRootProps,
  useForwardPropsEmits,
} from 'reka-ui'

interface Option {
  value: string | number
  label: string
}

interface Props extends SelectRootProps {
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

const emit = defineEmits<SelectRootEmits>()

const forwarded = useForwardPropsEmits(props, emit)

const { t } = useI18n()

const resolvedPlaceholder = computed(() => props.placeholder ?? t('common.select'))

const resolvedAllOptionLabel = computed(() => props.allOptionLabel ?? t('common.all'))
</script>

<template>
  <div :class="label ? 'flex flex-col gap-1' : ''">
    <label v-if="label" class="text-xs font-semibold uppercase tracking-wide text-[#1A1C1C]/50">
      {{ label }}
    </label>

    <SelectRoot v-bind="forwarded">
      <SelectTrigger
        class="SelectTrigger w-full border-none bg-[#FAFAFA] px-5 text-sm text-[#1A1C1C] focus:ring-0"
      >
        <SelectValue :placeholder="resolvedPlaceholder" />
      </SelectTrigger>

      <SelectContent>
        <SelectItem v-if="hasSelectedAllOption" :value="allOptionValue">
          {{ resolvedAllOptionLabel }}
        </SelectItem>
        <SelectItem v-for="option in options" :key="option.value" :value="option.value">
          {{ option.label }}
        </SelectItem>
      </SelectContent>
    </SelectRoot>
  </div>
</template>
<style scoped>
.SelectTrigger[data-placeholder] {
  color: var(--color-stone-400);
}
</style>
