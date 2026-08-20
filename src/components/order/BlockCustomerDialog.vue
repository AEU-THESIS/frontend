<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'
import { Button } from '@/components/ui/button'
import { blockCustomer } from '@/api/blockedCustomer'

const props = defineProps<{
  open: boolean
  telegramUserId: string | null
  telegramUsername?: string | null
}>()

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'blocked'): void
}>()

const { t } = useI18n()

const mode = ref<'forever' | 'until'>('forever')
const until = ref('') // datetime-local value
const reason = ref('')
const busy = ref(false)

// Reset the form each time the dialog opens.
watch(
  () => props.open,
  isOpen => {
    if (isOpen) {
      mode.value = 'forever'
      until.value = ''
      reason.value = ''
    }
  }
)

const canSubmit = computed(
  () => !!props.telegramUserId && !busy.value && (mode.value === 'forever' || !!until.value)
)

const close = () => emit('update:open', false)

const submit = async () => {
  if (!props.telegramUserId) return
  busy.value = true
  try {
    await blockCustomer({
      telegramUserId: props.telegramUserId,
      telegramUsername: props.telegramUsername ?? null,
      blockedUntil:
        mode.value === 'until' && until.value ? new Date(until.value).toISOString() : null,
      reason: reason.value.trim() || null,
    })
    toast.success(t('blockedCustomers.blocked'))
    emit('blocked')
    close()
  } catch {
    toast.error(t('orderActions.actionFailed'))
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <Transition name="fade">
    <div v-if="open" class="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-stone-900/50 backdrop-blur-sm" @click="close"></div>

      <div class="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-stone-900">
        <div class="mb-4 flex items-start gap-3">
          <div
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-600 dark:bg-rose-950/40"
          >
            <span class="material-symbols-outlined">block</span>
          </div>
          <div>
            <h2 class="text-lg font-extrabold text-stone-900 dark:text-stone-50">
              {{ t('blockedCustomers.blockTitle') }}
            </h2>
            <p class="text-xs text-stone-500 dark:text-stone-400">
              {{ t('blockedCustomers.blockMessage') }}
              <span v-if="telegramUsername" class="font-bold text-stone-700 dark:text-stone-300">
                @{{ telegramUsername }}
              </span>
            </p>
          </div>
        </div>

        <!-- Duration -->
        <div class="space-y-2">
          <label
            class="flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition-colors"
            :class="
              mode === 'forever'
                ? 'border-rose-400 bg-rose-50/50 dark:bg-rose-950/20'
                : 'border-stone-200 dark:border-stone-700'
            "
          >
            <input v-model="mode" type="radio" value="forever" class="accent-rose-600" />
            <span class="text-sm font-bold text-stone-800 dark:text-stone-200">
              {{ t('blockedCustomers.forever') }}
            </span>
          </label>

          <label
            class="flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition-colors"
            :class="
              mode === 'until'
                ? 'border-rose-400 bg-rose-50/50 dark:bg-rose-950/20'
                : 'border-stone-200 dark:border-stone-700'
            "
          >
            <input v-model="mode" type="radio" value="until" class="accent-rose-600" />
            <span class="text-sm font-bold text-stone-800 dark:text-stone-200">
              {{ t('blockedCustomers.until') }}
            </span>
          </label>

          <input
            v-if="mode === 'until'"
            v-model="until"
            type="datetime-local"
            class="w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-rose-400 dark:border-stone-700 dark:bg-stone-800"
          />
        </div>

        <textarea
          v-model="reason"
          rows="2"
          :placeholder="t('blockedCustomers.reasonPlaceholder')"
          class="mt-3 w-full resize-none rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-rose-400 dark:border-stone-700 dark:bg-stone-800"
        ></textarea>

        <div class="mt-5 flex justify-end gap-2">
          <Button variant="secondary" @click="close">{{ t('orderActions.keep') }}</Button>
          <Button
            class="bg-rose-600 text-white hover:bg-rose-700"
            :disabled="!canSubmit"
            @click="submit"
          >
            {{ t('blockedCustomers.blockAction') }}
          </Button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
