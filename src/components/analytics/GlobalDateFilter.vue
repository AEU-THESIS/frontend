<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { PopoverRoot, PopoverTrigger, PopoverPortal, PopoverContent } from 'reka-ui'
import { CalendarRange, ChevronDown, Check } from 'lucide-vue-next'
import { resolveGlobalRange, toDateInput } from './globalRange'
import type {
  GlobalRangeKey,
  GlobalRangeValue,
  GlobalDateFilterProps,
} from '@/types/analytics.types'

const props = defineProps<GlobalDateFilterProps>()
const emit = defineEmits<{ 'update:modelValue': [value: GlobalRangeValue] }>()

const { t, tm, locale } = useI18n()

// Short month names for the active locale, so custom-range labels localize even
// where the runtime's Intl lacks Khmer (km) data.
const monthNames = computed(() => tm('analytics.monthsShort') as unknown as string[])

// One calendar day, ordered per locale and without a year: "Jul 16" (en) /
// "16 កក្កដា" (kh).
const formatDay = (d: Date) => {
  const m = monthNames.value[d.getMonth()] ?? ''
  const day = d.getDate()
  return locale.value === 'kh' ? `${day} ${m}` : `${m} ${day}`
}

const options: { key: GlobalRangeKey; label: string }[] = [
  { key: 'today', label: 'analytics.globalFilter.today' },
  { key: 'yesterday', label: 'analytics.globalFilter.yesterday' },
  { key: 'last7', label: 'analytics.globalFilter.last7Days' },
  { key: 'thisMonth', label: 'analytics.globalFilter.thisMonth' },
  { key: 'thisYear', label: 'analytics.globalFilter.thisYear' },
  { key: 'custom', label: 'analytics.globalFilter.custom' },
]

const isOpen = ref(false)

// Whether the custom-range pickers are revealed. Driven locally (not by the
// committed value) so they appear the instant "Custom Range" is clicked, before
// the user has applied a window.
const showCustom = ref(props.modelValue.key === 'custom')

// Draft custom bounds, seeded from the current value.
const customStart = ref('')
const customEnd = ref('')

watch(
  () => props.modelValue,
  v => {
    if (v.key === 'custom') {
      customStart.value = toDateInput(new Date(v.startDate))
      customEnd.value = toDateInput(new Date(v.endDate))
      showCustom.value = true
    }
  },
  { immediate: true }
)

// Reflect the committed mode each time the popover (re)opens.
watch(isOpen, open => {
  if (open) showCustom.value = props.modelValue.key === 'custom'
})

const currentLabel = computed(() => {
  if (props.modelValue.key === 'custom') {
    const s = new Date(props.modelValue.startDate)
    const e = new Date(props.modelValue.endDate)
    return `${formatDay(s)} – ${formatDay(e)}`
  }
  const match = options.find(o => o.key === props.modelValue.key)
  return match ? t(match.label) : ''
})

const selectPreset = (key: GlobalRangeKey) => {
  if (key === 'custom') {
    // Reveal the pickers and seed draft bounds; keep the popover open.
    showCustom.value = true
    if (!customStart.value || !customEnd.value) {
      const seeded = resolveGlobalRange('last7')
      customStart.value = toDateInput(new Date(seeded.startDate))
      customEnd.value = toDateInput(new Date(seeded.endDate))
    }
    return
  }
  showCustom.value = false
  emit('update:modelValue', resolveGlobalRange(key))
  isOpen.value = false
}

const customValid = computed(
  () => !!customStart.value && !!customEnd.value && customStart.value <= customEnd.value
)

const applyCustom = () => {
  if (!customValid.value) return
  emit('update:modelValue', resolveGlobalRange('custom', customStart.value, customEnd.value))
  isOpen.value = false
}

const todayInput = toDateInput(new Date())
</script>

<template>
  <PopoverRoot v-model:open="isOpen">
    <PopoverTrigger
      class="flex items-center gap-2 rounded-xl border border-slate-100 bg-white px-3.5 py-2 text-xs font-bold text-[#1A1C1C] shadow-sm transition-all hover:bg-slate-50 dark:border-stone-800 dark:bg-stone-900/50 dark:text-stone-100 dark:hover:bg-stone-800"
    >
      <CalendarRange class="size-4 text-[#D2691E]" />
      <span class="whitespace-nowrap">{{ currentLabel }}</span>
      <ChevronDown
        class="size-3.5 text-[#A3A3A3] transition-transform"
        :class="isOpen ? 'rotate-180' : ''"
      />
    </PopoverTrigger>

    <PopoverPortal>
      <PopoverContent
        align="end"
        :side-offset="8"
        class="z-50 w-56 overflow-hidden rounded-xl border border-slate-100 bg-white p-1.5 shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 dark:border-stone-800 dark:bg-stone-900"
      >
        <Button
          v-for="opt in options"
          :key="opt.key"
          type="button"
          variant="tertiary"
          :class="[
            'flex h-auto w-full items-center justify-between rounded-lg px-3 py-2 text-xs font-bold transition-colors',
            (opt.key === 'custom' ? showCustom : modelValue.key === opt.key)
              ? 'bg-[#FDF2F0] text-[#D2691E] dark:bg-[#D2691E]/15'
              : 'text-[#737373] hover:bg-slate-50 dark:text-stone-300 dark:hover:bg-stone-800',
          ]"
          @click="selectPreset(opt.key)"
        >
          {{ t(opt.label) }}
          <Check
            v-if="opt.key === 'custom' ? showCustom : modelValue.key === opt.key"
            class="size-3.5"
          />
        </Button>

        <!-- Custom date-range pickers -->
        <div
          v-if="showCustom"
          class="mt-1.5 space-y-2 border-t border-slate-100 px-2 pb-1 pt-2.5 dark:border-stone-800"
        >
          <label class="block">
            <span class="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[#A3A3A3]">
              {{ t('analytics.globalFilter.from') }}
            </span>
            <Input
              v-model="customStart"
              type="date"
              :max="customEnd || todayInput"
              class="h-9 w-full rounded-lg border border-slate-100 bg-[#FAFAFA] px-2.5 text-xs font-semibold text-[#1A1C1C] outline-none focus:border-[#D2691E] dark:border-stone-800 dark:bg-stone-800/50 dark:text-stone-100 dark:[color-scheme:dark]"
            />
          </label>
          <label class="block">
            <span class="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[#A3A3A3]">
              {{ t('analytics.globalFilter.to') }}
            </span>
            <Input
              v-model="customEnd"
              type="date"
              :min="customStart"
              :max="todayInput"
              class="h-9 w-full rounded-lg border border-slate-100 bg-[#FAFAFA] px-2.5 text-xs font-semibold text-[#1A1C1C] outline-none focus:border-[#D2691E] dark:border-stone-800 dark:bg-stone-800/50 dark:text-stone-100 dark:[color-scheme:dark]"
            />
          </label>
          <Button
            type="button"
            variant="tertiary"
            :disabled="!customValid"
            class="mt-1 h-9 w-full rounded-lg bg-[#D2691E] text-xs font-bold text-white transition-all hover:bg-[#B35919] disabled:cursor-not-allowed disabled:text-white disabled:opacity-40"
            @click="applyCustom"
          >
            {{ t('analytics.globalFilter.apply') }}
          </Button>
        </div>
      </PopoverContent>
    </PopoverPortal>
  </PopoverRoot>
</template>
