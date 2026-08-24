<script setup lang="ts">
import { ref, watch } from 'vue'
import AppDialog from '@/components/common/AppDialog.vue'

// Confirmation dialog for the two money-reversing actions (void an order / cancel a
// line item). Optionally collects a free-text reason (used by void). Purpose-built so
// both the Order History drawer and the Order Management board can share it.
const props = withDefaults(
  defineProps<{
    open: boolean
    title: string
    message: string
    confirmLabel: string
    cancelLabel: string
    withReason?: boolean
    reasonPlaceholder?: string
    busy?: boolean
  }>(),
  { withReason: false, busy: false }
)

const emit = defineEmits<{
  'update:open': [value: boolean]
  confirm: [reason: string | undefined]
}>()

const reason = ref('')

// Start each fresh open with an empty reason.
watch(
  () => props.open,
  open => {
    if (open) reason.value = ''
  }
)

const onConfirm = () => {
  const trimmed = reason.value.trim()
  emit('confirm', trimmed ? trimmed : undefined)
}
</script>

<template>
  <AppDialog :open="open" :title="title" @update:open="value => emit('update:open', value)">
    <div class="flex flex-col gap-3">
      <p class="text-sm text-stone-600 dark:text-stone-300">{{ message }}</p>
      <textarea
        v-if="withReason"
        v-model="reason"
        :placeholder="reasonPlaceholder"
        rows="3"
        maxlength="255"
        class="w-full resize-none rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-primary dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
      />
    </div>

    <template #footer>
      <button
        type="button"
        :disabled="busy"
        class="inline-flex h-9 items-center justify-center rounded-lg border border-zinc-200 px-4 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-zinc-300 disabled:opacity-50 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800"
        @click="emit('update:open', false)"
      >
        {{ cancelLabel }}
      </button>
      <button
        type="button"
        :disabled="busy"
        class="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-rose-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-400 disabled:opacity-60"
        @click="onConfirm"
      >
        <span v-if="busy" class="material-symbols-outlined animate-spin text-[16px] leading-none"
          >progress_activity</span
        >
        {{ confirmLabel }}
      </button>
    </template>
  </AppDialog>
</template>
