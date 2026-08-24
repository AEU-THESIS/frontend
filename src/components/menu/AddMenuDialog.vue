<script setup lang="ts">
import { ref } from 'vue'
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

// Remove DialogTrigger — parent owns the trigger
const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

const form = ref({ name: 'Pedro Duarte', username: '@peduarte' })

const inputClass = [
  'text-grass11 bg-stone-50',
  'inline-flex h-9 w-full flex-1 items-center justify-center',
  'rounded-lg px-2.5 text-sm leading-none',
  'shadow shadow-green7 outline-none',
  'focus:ring-2 focus:ring-green8',
].join(' ')

const labelClass = 'text-grass11 w-24 text-right text-sm'
</script>

<template>
  <DialogRoot :open="props.open" @update:open="emit('update:open', $event)">
    <DialogPortal>
      <DialogOverlay
        class="fixed inset-0 z-30 bg-black/60 data-[state=open]:animate-overlay-show data-[state=closed]:animate-overlay-hide"
      />

      <DialogContent
        class="fixed left-1/2 top-1/2 z-50 max-h-[85vh] w-11/12 max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg bg-white shadow-2xl focus:outline-none data-[state=open]:animate-content-show data-[state=closed]:animate-content-hide"
      >
        <!-- Header -->
        <div class="px-6 pt-6 pb-4">
          <DialogTitle class="text-mauve12 m-0 text-lg font-semibold"> Edit profile </DialogTitle>
          <DialogDescription class="text-mauve11 text-xs leading-normal">
            Make changes to your profile here. Click save when you're done.
          </DialogDescription>
        </div>

        <!-- ✅ reka-ui Separator -->
        <Separator decorative orientation="horizontal" class="h-px bg-stone-100" />

        <!-- Body -->
        <div class="px-6 py-5">
          <fieldset class="mb-4 flex items-center gap-5">
            <label :class="labelClass" for="name">Name</label>
            <input id="name" v-model="form.name" :class="inputClass" />
          </fieldset>

          <fieldset class="mb-4 flex items-center gap-5">
            <label :class="labelClass" for="username">Username</label>
            <input id="username" v-model="form.username" :class="inputClass" />
          </fieldset>
        </div>

        <!-- ✅ reka-ui Separator -->
        <Separator decorative orientation="horizontal" class="h-px bg-stone-100" />

        <!-- Footer -->
        <div class="px-6 py-4 flex justify-end">
          <DialogClose as-child>
            <button
              class="bg-green4 text-green11 inline-flex h-9 items-center justify-center rounded-lg px-4 text-sm font-semibold leading-none hover:bg-green5 focus:ring-2 focus:ring-green7 focus:outline-none"
            >
              Cancel
            </button>
          </DialogClose>
          <DialogClose as-child>
            <button
              class="bg-green4 text-green11 inline-flex h-9 items-center justify-center rounded-lg px-4 text-sm font-semibold leading-none hover:bg-green5 focus:ring-2 focus:ring-green7 focus:outline-none"
            >
              Save changes
            </button>
          </DialogClose>
        </div>

        <!-- Close Icon -->
        <DialogClose
          class="text-grass11 absolute right-2.5 top-2.5 inline-flex size-6 appearance-none items-center justify-center rounded-full hover:bg-green4 focus:ring-2 focus:ring-green7 focus:outline-none"
          aria-label="Close"
        >
          <X class="size-4" />
        </DialogClose>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
