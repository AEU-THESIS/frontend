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
            class="w-full max-w-4xl bg-white rounded-xl shadow-2xl overflow-hidden p-10 relative"
          >
            <Button
              variant="ghost"
              size="icon"
              class="absolute right-8 top-8 text-[#5F5E5E] hover:text-[#1A1C1C] transition-colors"
              aria-label="Close staff details"
              @click="$emit('close')"
            >
              <X class="size-6" />
            </Button>

            <!-- Profile Header -->
            <div class="flex items-center gap-8 mb-12">
              <div class="relative shrink-0">
                <div
                  class="size-[92px] overflow-hidden rounded-full border-4 border-[#EEEEEE] shadow-sm bg-[#F3F3F4]"
                >
                  <img
                    v-if="staff.imageUrl"
                    :src="getImageUrl(staff.imageUrl)"
                    class="h-full w-full object-cover"
                  />
                  <div
                    v-else
                    class="flex h-full w-full items-center justify-center text-[#5F5E5E] text-2xl font-bold"
                  >
                    {{ getInitials(staff.name) }}
                  </div>
                </div>
                <div
                  class="absolute bottom-1 right-1 size-4 rounded-full border-2 border-white"
                  :class="staff.isActive ? 'bg-[#22C55E]' : 'bg-[#EF4444]'"
                ></div>
              </div>

              <div class="space-y-1">
                <div class="flex items-center gap-3">
                  <h3 class="text-2xl font-bold text-[#1A1C1C]">
                    {{ staff.name }}
                  </h3>
                  <span
                    v-if="staff.isActive"
                    class="px-3 py-1 rounded-full bg-[#DCFCE7] text-[#15803D] text-[10px] font-bold uppercase tracking-wider"
                  >
                    {{ t('staff.table.active') }}
                  </span>
                </div>
                <p class="text-lg font-bold text-[#5F5E5E]">
                  {{ staff.role }}
                </p>
              </div>
            </div>

            <!-- General Information Section -->
            <div class="flex items-center gap-3 mb-8">
              <div
                class="flex items-center justify-center size-6 rounded-full border-2 border-[#974400]/40"
              >
                <span class="text-[#974400] text-xs font-black">i</span>
              </div>
              <h4 class="text-xl font-bold text-[#1A1C1C]">{{ t('staff.detail.generalInfo') }}</h4>
            </div>

            <div class="grid grid-cols-2 gap-x-8 gap-y-6">
              <!-- Information Card -->
              <div class="bg-[#F3F3F4] rounded-xl p-5 flex items-center gap-4">
                <div class="shrink-0 text-[#5F5E5E] bg-white p-2.5 rounded-lg">
                  <Info class="size-6" />
                </div>
                <div class="overflow-hidden">
                  <p class="text-[10px] font-bold text-[#5F5E5E] uppercase tracking-widest mb-0.5">
                    {{ t('staff.detail.information') }}
                  </p>
                  <p class="text-[14px] font-bold text-[#1A1C1C] truncate">{{ staff.name }}</p>
                </div>
              </div>

              <!-- Contact Card -->
              <div class="bg-[#F3F3F4] rounded-xl p-5 flex items-center gap-4">
                <div class="shrink-0 text-[#5F5E5E] bg-white p-2.5 rounded-lg">
                  <Mail class="size-6" />
                </div>
                <div class="overflow-hidden">
                  <p class="text-[10px] font-bold text-[#5F5E5E] uppercase tracking-widest mb-0.5">
                    {{ t('staff.detail.contact') }}
                  </p>
                  <p class="text-[14px] font-bold text-[#1A1C1C] truncate">{{ staff.email }}</p>
                </div>
              </div>

              <!-- Security Card -->
              <div class="bg-[#F3F3F4] rounded-xl p-5 flex items-center gap-4">
                <div class="shrink-0 text-[#5F5E5E] bg-white p-2.5 rounded-lg">
                  <ShieldCheck class="size-6" />
                </div>
                <div class="overflow-hidden">
                  <p class="text-[10px] font-bold text-[#5F5E5E] uppercase tracking-widest mb-0.5">
                    {{ t('staff.detail.security') }}
                  </p>
                  <p class="text-[14px] font-bold text-[#1A1C1C] truncate">{{ staff.role }}</p>
                </div>
              </div>

              <!-- System Card -->
              <div class="bg-[#F3F3F4] rounded-xl p-5 flex items-center gap-4">
                <div class="shrink-0 text-[#5F5E5E] bg-white p-2.5 rounded-lg">
                  <Database class="size-6" />
                </div>
                <div class="overflow-hidden">
                  <p class="text-[10px] font-bold text-[#5F5E5E] uppercase tracking-widest mb-0.5">
                    {{ t('staff.detail.system') }}
                  </p>
                  <p class="text-[14px] font-bold text-[#1A1C1C] truncate">
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
