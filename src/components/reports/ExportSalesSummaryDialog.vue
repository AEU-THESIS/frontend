<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'
import AppDialog from '@/components/common/AppDialog.vue'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { useReportStore } from '@/store/useReportStore'
import {
  salesSummaryExportFormSchema,
  type SalesSummaryExportRangeError,
} from '@/validations/reportValidation'

// Date picker for the Sales Summary Excel export. The workbook lays out one
// row-block per day, so the export takes a range — it opens with both ends on the
// date the report already shows, which keeps a single-day export to one click.
const props = defineProps<{
  open: boolean
  /** Date the report is currently showing; seeds both ends of the range. */
  defaultDate: string
  /** Latest selectable date (the shop's today). */
  maxDate: string
}>()

const emit = defineEmits<{ 'update:open': [value: boolean] }>()

const { t } = useI18n()
const reportStore = useReportStore()

const startDate = ref(props.defaultDate)
const endDate = ref(props.defaultDate)

// Reset on every open so a previous pick never leaks into the next export.
watch(
  () => props.open,
  isOpen => {
    if (!isOpen) return
    startDate.value = props.defaultDate
    endDate.value = props.defaultDate
  }
)

// The schema owns the rules; this only turns its codes into copy.
const ERROR_KEYS: Record<SalesSummaryExportRangeError, string> = {
  required: 'reports.export.errors.required',
  invalidRange: 'reports.export.errors.invalidRange',
  future: 'reports.export.errors.future',
}

const validationError = computed(() => {
  const result = salesSummaryExportFormSchema(props.maxDate).safeParse({
    startDate: startDate.value,
    endDate: endDate.value,
  })
  if (result.success) return null

  // Issues arrive in declaration order, so the first is the most specific
  // failure. An unrecognised code can only mean a missing/blank field.
  const code = result.error.issues[0]?.message as SalesSummaryExportRangeError
  return t(ERROR_KEYS[code] ?? ERROR_KEYS.required)
})

const close = () => emit('update:open', false)

const submit = async () => {
  if (validationError.value || reportStore.isExporting) return

  try {
    const outcome = await reportStore.exportSalesSummary(startDate.value, endDate.value)
    if (outcome === 'empty') {
      toast.warning(t('reports.export.warnings.noData'))
      return
    }
    toast.success(t('reports.export.success'))
    close()
  } catch {
    toast.error(t('reports.export.errors.failed'))
  }
}
</script>

<template>
  <AppDialog
    :open="open"
    :title="t('reports.export.title')"
    :description="t('reports.export.description')"
    @update:open="value => emit('update:open', value)"
  >
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div class="flex flex-col gap-1">
        <Label
          for="export-start-date"
          class="text-xs font-semibold uppercase tracking-wide text-[#1A1C1C]/50 dark:text-stone-400"
        >
          {{ t('reports.export.startDate') }}
        </Label>
        <AppInput
          id="export-start-date"
          v-model="startDate"
          type="date"
          :max="maxDate"
          :disabled="reportStore.isExporting"
          class="h-10 w-full cursor-pointer rounded-md border-none bg-stone-50 px-3 text-sm text-[#1A1C1C] shadow-none transition-colors focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-60 dark:bg-stone-800 dark:text-stone-100"
        />
      </div>

      <div class="flex flex-col gap-1">
        <Label
          for="export-end-date"
          class="text-xs font-semibold uppercase tracking-wide text-[#1A1C1C]/50 dark:text-stone-400"
        >
          {{ t('reports.export.endDate') }}
        </Label>
        <AppInput
          id="export-end-date"
          v-model="endDate"
          type="date"
          :min="startDate || undefined"
          :max="maxDate"
          :disabled="reportStore.isExporting"
          class="h-10 w-full cursor-pointer rounded-md border-none bg-stone-50 px-3 text-sm text-[#1A1C1C] shadow-none transition-colors focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-60 dark:bg-stone-800 dark:text-stone-100"
        />
      </div>
    </div>

    <p v-if="validationError" class="mt-3 text-xs font-medium text-red-500">
      {{ validationError }}
    </p>

    <template #footer>
      <Button
        type="button"
        variant="outline"
        size="sm"
        :disabled="reportStore.isExporting"
        class="disabled:opacity-50"
        @click="close"
      >
        {{ t('common.cancel') }}
      </Button>
      <Button
        type="button"
        variant="primary"
        size="sm"
        :disabled="reportStore.isExporting || Boolean(validationError)"
        @click="submit"
      >
        <span
          v-if="reportStore.isExporting"
          class="material-symbols-outlined animate-spin text-[16px] leading-none"
          >progress_activity</span
        >
        {{ reportStore.isExporting ? t('reports.export.exporting') : t('reports.export.submit') }}
      </Button>
    </template>
  </AppDialog>
</template>
