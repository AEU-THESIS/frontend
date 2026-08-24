<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { PopoverRoot, PopoverTrigger, PopoverPortal, PopoverContent } from 'reka-ui'
import { CalendarDays, ChevronDown, Check } from 'lucide-vue-next'
import type {
  ItemPeriod,
  ItemPeriodFilterProps,
  ItemPeriodSelection,
} from '@/types/analytics.types'

const props = defineProps<ItemPeriodFilterProps>()

const emit = defineEmits<{
  'update:selection': [value: ItemPeriodSelection]
}>()

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

const options: { key: ItemPeriod; label: string }[] = [
  { key: 'thisWeek', label: 'analytics.period.thisWeek' },
  { key: 'thisMonth', label: 'analytics.period.thisMonth' },
  { key: 'thisYear', label: 'analytics.period.thisYear' },
  { key: 'range', label: 'analytics.period.dateRange' },
]

const now = new Date()

const pad = (n: number) => String(n).padStart(2, '0')
const toInput = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const todayInput = toInput(now)

const isOpen = ref(false)

// --- Custom date range ("YYYY-MM-DD..YYYY-MM-DD") ---
const showRange = ref(props.period === 'range')
const rangeStart = ref('')
const rangeEnd = ref('')

const seedRange = () => {
  const [s, e] = props.value.split('..')
  if (/^\d{4}-\d{2}-\d{2}$/.test(s) && /^\d{4}-\d{2}-\d{2}$/.test(e)) {
    rangeStart.value = s
    rangeEnd.value = e
  } else {
    const from = new Date(now)
    from.setDate(from.getDate() - 6)
    rangeStart.value = toInput(from)
    rangeEnd.value = todayInput
  }
}

watch(
  () => props.value,
  () => {
    if (props.period === 'range') seedRange()
  },
  { immediate: true }
)
watch(isOpen, open => {
  if (open) showRange.value = props.period === 'range'
})

const rangeValid = computed(
  () => !!rangeStart.value && !!rangeEnd.value && rangeStart.value <= rangeEnd.value
)

const currentLabel = computed(() => {
  if (props.period === 'range') {
    const [s, e] = props.value.split('..')
    if (s && e) {
      const fmt = (str: string) => {
        const [y, m, d] = str.split('-').map(Number)
        return formatDay(new Date(y, m - 1, d))
      }
      return `${fmt(s)} – ${fmt(e)}`
    }
  }
  const match = options.find(o => o.key === props.period)
  return match ? t(match.label) : ''
})

const selectPeriod = (key: ItemPeriod) => {
  if (key === 'range') {
    // Reveal the pickers and seed bounds; keep the popover open until applied.
    showRange.value = true
    if (!rangeStart.value || !rangeEnd.value) seedRange()
    return
  }
  showRange.value = false
  // Presets carry no companion value; emit an empty one so the selection is
  // still applied atomically.
  emit('update:selection', { period: key, value: '' })
  isOpen.value = false
}

const applyRange = () => {
  if (!rangeValid.value) return
  // Commit period + window as a single unit so the parent applies both and
  // fires exactly one request (no intermediate stale-value fetch).
  emit('update:selection', { period: 'range', value: `${rangeStart.value}..${rangeEnd.value}` })
  isOpen.value = false
}
</script>

<template>
  <PopoverRoot v-model:open="isOpen">
    <PopoverTrigger
      class="flex items-center gap-2 rounded-lg border border-slate-100 bg-[#FAFAFA] px-3 py-1.5 text-xs font-bold text-[#737373] transition-all hover:bg-slate-100 dark:border-stone-800 dark:bg-stone-800/50 dark:text-stone-300 dark:hover:bg-stone-800"
    >
      <CalendarDays class="size-3.5 text-[#A3A3A3]" />
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
        class="z-50 w-52 overflow-hidden rounded-xl border border-slate-100 bg-white p-1.5 shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 dark:border-stone-800 dark:bg-stone-900"
      >
        <Button
          v-for="opt in options"
          :key="opt.key"
          type="button"
          variant="tertiary"
          :class="[
            'flex h-auto w-full items-center justify-between rounded-lg px-3 py-2 text-xs font-bold transition-colors',
            (opt.key === 'range' ? showRange : period === opt.key)
              ? 'bg-[#FDF2F0] text-[#D2691E] dark:bg-[#D2691E]/15'
              : 'text-[#737373] hover:bg-slate-50 dark:text-stone-300 dark:hover:bg-stone-800',
          ]"
          @click="selectPeriod(opt.key)"
        >
          {{ t(opt.label) }}
          <Check v-if="opt.key === 'range' ? showRange : period === opt.key" class="size-3.5" />
        </Button>

        <!-- Custom date-range pickers -->
        <div
          v-if="showRange"
          class="mt-1.5 space-y-2 border-t border-slate-100 px-2 pb-1 pt-2.5 dark:border-stone-800"
        >
          <label class="block">
            <span class="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[#A3A3A3]">
              {{ t('analytics.globalFilter.from') }}
            </span>
            <AppInput
              v-model="rangeStart"
              type="date"
              :max="rangeEnd || todayInput"
              class="h-9 w-full rounded-lg border border-slate-100 bg-[#FAFAFA] px-2.5 text-xs font-semibold text-[#1A1C1C] outline-none focus:border-[#D2691E] dark:border-stone-800 dark:bg-stone-800/50 dark:text-stone-100 dark:[color-scheme:dark]"
            />
          </label>
          <label class="block">
            <span class="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[#A3A3A3]">
              {{ t('analytics.globalFilter.to') }}
            </span>
            <AppInput
              v-model="rangeEnd"
              type="date"
              :min="rangeStart"
              :max="todayInput"
              class="h-9 w-full rounded-lg border border-slate-100 bg-[#FAFAFA] px-2.5 text-xs font-semibold text-[#1A1C1C] outline-none focus:border-[#D2691E] dark:border-stone-800 dark:bg-stone-800/50 dark:text-stone-100 dark:[color-scheme:dark]"
            />
          </label>
          <Button
            type="button"
            variant="tertiary"
            :disabled="!rangeValid"
            class="mt-1 h-9 w-full rounded-lg bg-[#D2691E] text-xs font-bold text-white transition-all hover:bg-[#B35919] disabled:cursor-not-allowed disabled:text-white disabled:opacity-40"
            @click="applyRange"
          >
            {{ t('analytics.globalFilter.apply') }}
          </Button>
        </div>
      </PopoverContent>
    </PopoverPortal>
  </PopoverRoot>
</template>
