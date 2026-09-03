<script setup lang="ts">
import { X, Mail, Info, ShieldCheck, Database } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
import type { StaffMember } from '@/types/user.types'
import { getImageUrl } from '@/utils/image'

const { t } = useI18n()

defineProps<{
  isOpen: boolean
  staff: StaffMember | null
  getInitials: (name: string) => string
}>()

defineEmits<{
  (e: 'close'): void
  (e: 'edit', member: StaffMember): void
  (e: 'delete', id: number): void
}>()
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="isOpen && staff"
        class="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-[2px]"
        @click.self="$emit('close')"
      >
        <Transition name="scale">
          <div
            v-if="isOpen && staff"
            class="relative w-full max-w-4xl overflow-hidden rounded-xl bg-white p-10 shadow-2xl dark:border dark:border-stone-800 dark:bg-stone-900"
          >
            <Button
              variant="ghost"
              size="icon"
              class="absolute right-8 top-8 text-[#5F5E5E] transition-colors hover:text-[#1A1C1C] dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-100"
              aria-label="Close staff details"
              @click="$emit('close')"
            >
              <X class="size-6" />
            </Button>

            <!-- Profile Header -->
            <div class="mb-12 flex items-center gap-8">
              <div class="relative shrink-0">
                <div
                  class="size-[92px] overflow-hidden rounded-full border-4 border-[#EEEEEE] bg-[#F3F3F4] shadow-sm dark:border-stone-800 dark:bg-stone-800"
                >
                  <img
                    v-if="staff.imageUrl"
                    :src="getImageUrl(staff.imageUrl)"
                    class="h-full w-full object-cover"
                  />
                  <div
                    v-else
                    class="flex h-full w-full items-center justify-center text-2xl font-bold text-[#5F5E5E] dark:text-stone-300"
                  >
                    {{ getInitials(staff.name) }}
                  </div>
                </div>
                <div
                  class="absolute bottom-1 right-1 size-4 rounded-full border-2 border-white dark:border-stone-900"
                  :class="staff.isActive ? 'bg-[#22C55E]' : 'bg-[#EF4444]'"
                ></div>
              </div>

              <div class="space-y-1">
                <div class="flex items-center gap-3">
                  <h3 class="text-2xl font-bold text-[#1A1C1C] dark:text-stone-100">
                    {{ staff.name }}
                  </h3>
                  <span
                    v-if="staff.isActive"
                    class="rounded-full bg-[#DCFCE7] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#15803D] dark:bg-emerald-950/60 dark:text-emerald-400"
                  >
                    {{ t('staff.table.active') }}
                  </span>
                </div>
                <p class="text-lg font-bold text-[#5F5E5E] dark:text-stone-400">
                  {{ staff.role }}
                </p>
              </div>
            </div>

            <!-- General Information Section -->
            <div class="mb-8 flex items-center gap-3">
              <div
                class="flex size-6 items-center justify-center rounded-full border-2 border-[#974400]/40 dark:border-[#B35900]"
              >
                <span class="text-xs font-black text-[#974400] dark:text-[#974400]">i</span>
              </div>
              <h4 class="text-xl font-bold text-[#1A1C1C] dark:text-stone-100">
                {{ t('staff.detail.generalInfo') }}
              </h4>
            </div>

            <div class="grid grid-cols-2 gap-x-8 gap-y-6">
              <!-- Information Card -->
              <div class="flex items-center gap-4 rounded-xl bg-[#F3F3F4] p-5 dark:bg-stone-800/60">
                <div
                  class="shrink-0 rounded-lg bg-white p-2.5 text-[#5F5E5E] dark:bg-stone-800 dark:text-stone-300"
                >
                  <Info class="size-6" />
                </div>
                <div class="overflow-hidden">
                  <p
                    class="mb-0.5 text-[10px] font-bold uppercase tracking-widest text-[#5F5E5E] dark:text-stone-400"
                  >
                    {{ t('staff.detail.information') }}
                  </p>
                  <p class="truncate text-[14px] font-bold text-[#1A1C1C] dark:text-stone-100">
                    {{ staff.name }}
                  </p>
                </div>
              </div>

              <!-- Contact Card -->
              <div class="flex items-center gap-4 rounded-xl bg-[#F3F3F4] p-5 dark:bg-stone-800/60">
                <div
                  class="shrink-0 rounded-lg bg-white p-2.5 text-[#5F5E5E] dark:bg-stone-800 dark:text-stone-300"
                >
                  <Mail class="size-6" />
                </div>
                <div class="overflow-hidden">
                  <p
                    class="mb-0.5 text-[10px] font-bold uppercase tracking-widest text-[#5F5E5E] dark:text-stone-400"
                  >
                    {{ t('staff.detail.contact') }}
                  </p>
                  <p class="truncate text-[14px] font-bold text-[#1A1C1C] dark:text-stone-100">
                    {{ staff.email }}
                  </p>
                </div>
              </div>

              <!-- Security Card -->
              <div class="flex items-center gap-4 rounded-xl bg-[#F3F3F4] p-5 dark:bg-stone-800/60">
                <div
                  class="shrink-0 rounded-lg bg-white p-2.5 text-[#5F5E5E] dark:bg-stone-800 dark:text-stone-300"
                >
                  <ShieldCheck class="size-6" />
                </div>
                <div class="overflow-hidden">
                  <p
                    class="mb-0.5 text-[10px] font-bold uppercase tracking-widest text-[#5F5E5E] dark:text-stone-400"
                  >
                    {{ t('staff.detail.security') }}
                  </p>
                  <p class="truncate text-[14px] font-bold text-[#1A1C1C] dark:text-stone-100">
                    {{ staff.role }}
                  </p>
                </div>
              </div>

              <!-- System Card -->
              <div class="flex items-center gap-4 rounded-xl bg-[#F3F3F4] p-5 dark:bg-stone-800/60">
                <div
                  class="shrink-0 rounded-lg bg-white p-2.5 text-[#5F5E5E] dark:bg-stone-800 dark:text-stone-300"
                >
                  <Database class="size-6" />
                </div>
                <div class="overflow-hidden">
                  <p
                    class="mb-0.5 text-[10px] font-bold uppercase tracking-widest text-[#5F5E5E] dark:text-stone-400"
                  >
                    {{ t('staff.detail.system') }}
                  </p>
                  <p class="truncate text-[14px] font-bold text-[#1A1C1C] dark:text-stone-100">
                    {{ t('staff.employeeId') }}: {{ staff.employeeId }}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.scale-enter-active {
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}
.scale-leave-active {
  transition: all 0.2s ease-in;
}
.scale-enter-from {
  opacity: 0;
  transform: scale(0.95) translateY(10px);
}
.scale-leave-to {
  opacity: 0;
  transform: scale(0.98) translateY(5px);
}
</style>
