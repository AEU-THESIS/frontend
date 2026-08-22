<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { TriangleAlert } from 'lucide-vue-next'
import {
  AlertDialogRoot,
  AlertDialogPortal,
  AlertDialogOverlay,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
} from 'reka-ui'
import type { ConfirmDialogProps } from '@/types/common.types'

/**
 * Reusable confirmation dialog for destructive or irreversible actions.
 *
 * The dialog does NOT close itself on confirm — the parent owns `open` so it can
 * keep the dialog up (with `loading`) while the confirmed action runs, then close
 * it when the request settles:
 *
 * <ConfirmDialog
 *   v-model:open="isOpen"
 *   :title="t('...')"
 *   :message="t('...')"
 *   :confirm-label="t('common.delete')"
 *   :loading="store.isDeleting"
 *   @confirm="doTheThing"
 * />
 */
const props = withDefaults(defineProps<ConfirmDialogProps>(), {
  variant: 'danger',
  loading: false,
})

const emit = defineEmits<{
  'update:open': [value: boolean]
  confirm: []
  cancel: []
}>()

const { t } = useI18n()

const confirmButtonClass = computed(() =>
  props.variant === 'danger'
    ? 'bg-red-600 hover:bg-red-700 focus-visible:ring-red-500/40 text-white'
    : 'bg-primary hover:bg-primary/90 focus-visible:ring-primary/40 text-primary-foreground'
)

/**
 * Escape, the overlay and the cancel button all route through here. Ignoring the
 * change while `loading` keeps the dialog from vanishing mid-request.
 */
function onOpenChange(value: boolean) {
  if (props.loading) return
  emit('update:open', value)
  if (!value) emit('cancel')
}
</script>

<template>
  <AlertDialogRoot :open="props.open" @update:open="onOpenChange">
    <AlertDialogPortal>
      <AlertDialogOverlay
        class="fixed inset-0 z-30 bg-black/60 data-[state=open]:animate-overlay-show data-[state=closed]:animate-overlay-hide"
      />

      <AlertDialogContent
        class="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl bg-white dark:bg-stone-900 shadow-2xl focus:outline-none data-[state=open]:animate-content-show data-[state=closed]:animate-content-hide"
      >
        <div class="flex gap-4 px-6 pt-6">
          <div
            v-if="variant === 'danger'"
            class="flex size-10 shrink-0 items-center justify-center rounded-full bg-red-50 dark:bg-red-950/40"
          >
            <TriangleAlert class="size-5 text-red-600 dark:text-red-500" />
          </div>

          <div class="min-w-0 flex-1">
            <AlertDialogTitle class="text-base font-semibold text-zinc-900 dark:text-stone-100">
              {{ title }}
            </AlertDialogTitle>

            <AlertDialogDescription
              v-if="message"
              class="mt-1 text-sm leading-normal text-zinc-500 dark:text-stone-400"
            >
              {{ message }}
            </AlertDialogDescription>

            <div v-if="$slots.default" class="mt-3 text-sm text-zinc-600 dark:text-stone-300">
              <slot />
            </div>
          </div>
        </div>

        <div class="flex justify-end gap-2 px-6 pb-6 pt-5">
          <AlertDialogCancel
            :disabled="loading"
            class="inline-flex h-9 items-center justify-center rounded-lg border border-zinc-200 dark:border-stone-700 px-4 text-sm font-medium text-zinc-600 dark:text-stone-300 hover:bg-zinc-50 dark:hover:bg-stone-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {{ cancelLabel ?? t('common.cancel') }}
          </AlertDialogCancel>

          <!--
            A plain button rather than AlertDialogAction: that primitive wraps
            DialogClose and would dismiss the dialog before the action resolves.
          -->
          <button
            type="button"
            :disabled="loading"
            :class="confirmButtonClass"
            class="inline-flex h-9 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            @click="emit('confirm')"
          >
            <span
              v-if="loading"
              class="inline-block size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
            />
            {{ confirmLabel ?? t('common.confirm') }}
          </button>
        </div>
      </AlertDialogContent>
    </AlertDialogPortal>
  </AlertDialogRoot>
</template>
