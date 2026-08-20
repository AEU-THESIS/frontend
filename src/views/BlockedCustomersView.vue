<template>
  <div class="flex h-full flex-col bg-[#F9FAFB] dark:bg-stone-900 font-body overflow-hidden">
    <div class="flex-1 overflow-y-auto custom-scrollbar px-10 py-10">
      <div class="w-full space-y-8">
        <!-- Header -->
        <div>
          <h1 class="text-3xl font-bold text-[#1A1C1C] dark:text-stone-50">
            {{ t('blockedCustomers.title') }}
          </h1>
          <p class="mt-1 text-sm text-[#737373] dark:text-stone-400">
            {{ t('blockedCustomers.subtitle') }}
          </p>
        </div>

        <Card
          class="gap-0 overflow-hidden rounded-xl border-none bg-white p-0 text-[#1A1C1C] shadow-sm flex flex-col dark:bg-stone-800 dark:text-stone-100"
        >
          <div v-if="loading" class="p-10 text-center text-sm text-[#A3A3A3]">
            {{ t('common.loading') }}
          </div>

          <div v-else-if="rows.length === 0" class="p-16 text-center text-sm text-[#A3A3A3]">
            {{ t('blockedCustomers.empty') }}
          </div>

          <div v-else class="overflow-x-auto">
            <table class="w-full min-w-[720px] text-left">
              <thead>
                <tr
                  class="bg-[#FCFCFC] text-[11px] font-black uppercase text-[#A3A3A3] dark:bg-stone-900/50"
                >
                  <th class="px-6 py-4">{{ t('blockedCustomers.customer') }}</th>
                  <th class="px-6 py-4">{{ t('blockedCustomers.duration') }}</th>
                  <th class="px-6 py-4">{{ t('blockedCustomers.reason') }}</th>
                  <th class="px-6 py-4"></th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="r in rows"
                  :key="r.id"
                  class="border-t border-[#F2F2F2] text-sm dark:border-stone-700"
                >
                  <td class="px-6 py-4">
                    <div class="font-semibold text-[#1A1C1C] dark:text-stone-100">
                      <span v-if="r.telegramUsername">@{{ r.telegramUsername }}</span>
                      <span v-else class="text-[#A3A3A3]">ID {{ r.telegramUserId }}</span>
                    </div>
                    <div class="text-[11px] text-[#A3A3A3]">{{ r.telegramUserId }}</div>
                  </td>
                  <td class="px-6 py-4">
                    <span
                      class="inline-flex rounded-full px-3 py-1 text-[11px] font-bold"
                      :class="
                        isActive(r)
                          ? 'bg-[#FDF2F0] text-[#E26D5C]'
                          : 'bg-stone-100 text-[#A3A3A3] dark:bg-stone-700 dark:text-stone-400'
                      "
                    >
                      {{ isActive(r) ? durationLabel(r) : t('blockedCustomers.expired') }}
                    </span>
                  </td>
                  <td class="px-6 py-4 text-[#6B6B6B] dark:text-stone-400">
                    {{ r.reason || '—' }}
                  </td>
                  <td class="px-6 py-4 text-right">
                    <Button variant="secondary" size="sm" :disabled="busy" @click="openUnblock(r)">
                      {{ t('blockedCustomers.unblock') }}
                    </Button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>
      </div>
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

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
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
