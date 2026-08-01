<script setup lang="ts">
import { X } from 'lucide-vue-next'
import {
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
  Separator,
} from 'reka-ui'

const props = defineProps<{
  open: boolean
  title: string
  description?: string
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  close: []
}>()

function close() {
  emit('update:open', false)
  emit('close')
}

function onOpenChange(value: boolean) {
  emit('update:open', value)
  if (!value) {
    emit('close')
  }
}

defineExpose({ close })
</script>

<template>
  <DialogRoot :open="props.open" @update:open="onOpenChange">
    <DialogPortal>
      <DialogOverlay
        class="fixed inset-0 z-30 bg-black/60 data-[state=open]:animate-overlay-show data-[state=closed]:animate-overlay-hide"
      />

      <DialogContent
        class="fixed left-1/2 top-1/2 z-50 w-full max-w-3xl -translate-x-1/2 -translate-y-1/2 rounded-xl bg-white dark:bg-stone-900 shadow-2xl focus:outline-none flex flex-col max-h-[90vh] data-[state=open]:animate-content-show data-[state=closed]:animate-content-hide"
      >
        <!-- Close icon -->
        <DialogClose
          aria-label="Close"
          class="absolute right-3 top-3 z-10 inline-flex size-7 items-center justify-center rounded-full text-zinc-400 dark:text-stone-500 hover:bg-zinc-100 dark:hover:bg-stone-800 hover:text-zinc-700 dark:hover:text-stone-200 focus:outline-none focus:ring-2 focus:ring-zinc-300 transition-colors"
          @click="close"
        >
          <X class="size-4" />
        </DialogClose>

        <!-- Header -->
        <div class="px-6 pt-5 pb-4 shrink-0 pr-10">
          <DialogTitle class="text-base font-semibold text-zinc-900 dark:text-stone-100">
            {{ title }}
          </DialogTitle>
          <DialogDescription
            v-if="description"
            class="mt-0.5 text-xs text-zinc-500 dark:text-stone-400 leading-normal"
          >
            {{ description }}
          </DialogDescription>
        </div>

        <Separator
          decorative
          orientation="horizontal"
          class="h-px bg-zinc-100 dark:bg-stone-800 shrink-0"
        />

        <!-- Scrollable body -->
        <div class="px-6 py-5 overflow-y-auto flex-1 min-h-0">
          <slot />
        </div>

        <Separator
          decorative
          orientation="horizontal"
          class="h-px bg-zinc-100 dark:bg-stone-800 shrink-0"
        />

        <!-- Footer -->
        <div class="px-6 py-4 flex justify-end gap-2 shrink-0">
          <slot name="footer">
            <button
              class="inline-flex h-9 items-center justify-center rounded-lg border border-zinc-200 dark:border-stone-700 px-4 text-sm font-medium text-zinc-600 dark:text-stone-300 hover:bg-zinc-50 dark:hover:bg-stone-800 focus:ring-2 focus:ring-zinc-300 focus:outline-none transition-colors"
              @click="close"
            >
              Cancel
            </button>
          </slot>
        </div>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
