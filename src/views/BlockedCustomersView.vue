<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'
import { Button } from '@/components/ui/button'
import CancelActionDialog from '@/components/order/CancelActionDialog.vue'
import { getBlockedCustomers, unblockCustomer, type BlockedCustomer } from '@/api/blockedCustomer'
import { formatDateTime } from '@/utils/datetime'

const { t } = useI18n()

const rows = ref<BlockedCustomer[]>([])
const loading = ref(false)
const busy = ref(false)
const unblockTarget = ref<BlockedCustomer | null>(null)
const unblockDialogOpen = ref(false)

const load = async () => {
  loading.value = true
  try {
    rows.value = await getBlockedCustomers()
  } catch {
    toast.error(t('blockedCustomers.loadFailed'))
  } finally {
    loading.value = false
  }
}

const isActive = (r: BlockedCustomer) =>
  r.blockedUntil === null || new Date(r.blockedUntil).getTime() > Date.now()

const durationLabel = (r: BlockedCustomer) =>
  r.blockedUntil === null ? t('blockedCustomers.forever') : formatDateTime(r.blockedUntil)

const openUnblock = (r: BlockedCustomer) => {
  unblockTarget.value = r
  unblockDialogOpen.value = true
}

const confirmUnblock = async () => {
  if (!unblockTarget.value) return
  busy.value = true
  try {
    await unblockCustomer(unblockTarget.value.telegramUserId)
    toast.success(t('blockedCustomers.unblocked'))
    unblockDialogOpen.value = false
    unblockTarget.value = null
    load()
  } catch {
    toast.error(t('orderActions.actionFailed'))
  } finally {
    busy.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="p-4 sm:p-6">
    <div class="mb-5 flex items-center justify-between">
      <div>
        <h1 class="text-xl font-extrabold text-stone-900 dark:text-stone-50">
          {{ t('blockedCustomers.title') }}
        </h1>
        <p class="text-sm text-stone-500 dark:text-stone-400">
          {{ t('blockedCustomers.subtitle') }}
        </p>
      </div>
      <Button variant="secondary" size="icon" :disabled="loading" @click="load">
        <span class="material-symbols-outlined" :class="{ 'animate-spin': loading }">refresh</span>
      </Button>
    </div>

    <p
      v-if="!loading && rows.length === 0"
      class="rounded-2xl border border-dashed border-stone-200 py-16 text-center text-sm text-stone-400 dark:border-stone-700"
    >
      {{ t('blockedCustomers.empty') }}
    </p>

    <div v-else class="overflow-hidden rounded-2xl border border-stone-100 dark:border-stone-800">
      <table class="w-full text-sm">
        <thead
          class="bg-stone-50 text-left text-xs uppercase tracking-wide text-stone-400 dark:bg-stone-900/50"
        >
          <tr>
            <th class="px-4 py-3 font-bold">{{ t('blockedCustomers.customer') }}</th>
            <th class="px-4 py-3 font-bold">{{ t('blockedCustomers.duration') }}</th>
            <th class="px-4 py-3 font-bold">{{ t('blockedCustomers.reason') }}</th>
            <th class="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in rows" :key="r.id" class="border-t border-stone-100 dark:border-stone-800">
            <td class="px-4 py-3">
              <div class="font-bold text-stone-800 dark:text-stone-100">
                <span v-if="r.telegramUsername">@{{ r.telegramUsername }}</span>
                <span v-else class="text-stone-400">ID {{ r.telegramUserId }}</span>
              </div>
              <div class="text-[11px] text-stone-400">{{ r.telegramUserId }}</div>
            </td>
            <td class="px-4 py-3">
              <span
                class="rounded-full px-2.5 py-0.5 text-[11px] font-bold"
                :class="
                  isActive(r)
                    ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400'
                    : 'bg-stone-100 text-stone-500 dark:bg-stone-800'
                "
              >
                {{ isActive(r) ? durationLabel(r) : t('blockedCustomers.expired') }}
              </span>
            </td>
            <td class="px-4 py-3 text-stone-500 dark:text-stone-400">{{ r.reason || '—' }}</td>
            <td class="px-4 py-3 text-right">
              <Button variant="secondary" size="sm" :disabled="busy" @click="openUnblock(r)">
                {{ t('blockedCustomers.unblock') }}
              </Button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <CancelActionDialog
      v-model:open="unblockDialogOpen"
      :title="t('blockedCustomers.unblock')"
      :message="t('blockedCustomers.confirmUnblock')"
      :confirm-label="t('blockedCustomers.unblock')"
      :cancel-label="t('orderActions.keep')"
      :busy="busy"
      @confirm="confirmUnblock"
    />
  </div>
</template>
