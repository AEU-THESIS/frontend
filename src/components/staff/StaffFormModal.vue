<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { X, ChevronDown, Mail, Phone, Home, LoaderCircle } from 'lucide-vue-next'
import type { CreateStaffInput } from '@/types/staff.types'
import { Label } from '@/components/ui/label'
import ImageUpload from '@/components/common/ImageUpload.vue'

interface Props {
  isOpen: boolean
  editingId: number | null
  form: CreateStaffInput
  errors: Record<string, string>
  roles: { id: number; name: string }[]
  isSubmitting: boolean
}

const { t } = useI18n()

defineProps<Props>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'submit'): void
  (
    e: 'update:field',
    payload: { field: keyof CreateStaffInput; value: string | number | boolean | null }
  ): void
  (e: 'fileChange', file: File | null): void
}>()

const handleImageChange = (file: File | null) => {
  emit('fileChange', file)
  if (!file) {
    emit('update:field', { field: 'imageUrl', value: null })
    return
  }

  // Local preview
  const reader = new FileReader()
  reader.onload = e => {
    emit('update:field', { field: 'imageUrl', value: e.target?.result as string })
  }
  reader.readAsDataURL(file)
}
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="isOpen"
        class="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-[2px]"
        @click.self="$emit('close')"
      >
        <Transition name="scale">
          <div
            v-if="isOpen"
            class="w-full max-w-[760px] bg-white rounded-2xl shadow-2xl overflow-hidden relative flex flex-col mx-4"
          >
            <!-- Header -->
            <div class="px-10 pt-10 pb-6 relative text-start border-b border-[#EEEEEE]">
              <h3 class="text-[24px] font-bold text-[#1A1C1C] title-case tracking-wider">
                {{ editingId ? t('staff.editStaffTitle') : t('staff.addStaffTitle') }}
              </h3>
              <p class="mt-1 text-[14px] text-[#737373] font-medium">
                {{ t('staff.form.subtitle') }}
              </p>
              <Button
                variant="ghost"
                size="icon"
                class="absolute right-8 top-10 text-[#A3A3A3] hover:text-[#1A1C1C] transition-colors"
                :aria-label="t('staff.closeView')"
                @click="$emit('close')"
              >
                <X class="size-6" />
              </Button>
            </div>

            <!-- Content -->
            <div class="px-10 pt-8 pb-10 overflow-y-auto max-h-[80vh] custom-scrollbar">
              <form class="space-y-8" @submit.prevent="$emit('submit')">
                <!-- Row 1: Full Name -->
                <div class="space-y-2.5">
                  <Label
                    for="staff-name"
                    class="text-[11px] font-black text-[#564338] uppercase tracking-widest ml-0.5"
                  >
                    {{ t('staff.form.name') }}
                  </Label>
                  <Input
                    id="staff-name"
                    class="h-14 rounded-xl border-[#DDC1B3] bg-white px-6 text-sm font-semibold text-[#1A1C1C] placeholder:text-[#E2DFDE] focus-visible:ring-1 focus-visible:ring-[#DDC1B3] transition-all shadow-sm"
                    :placeholder="t('staff.form.namePlaceholder')"
                    :model-value="form.name"
                    @update:model-value="emit('update:field', { field: 'name', value: $event })"
                  />
                  <p v-if="errors.name" class="text-[11px] font-bold text-rose-500 ml-1">
                    {{ errors.name }}
                  </p>
                </div>

                <!-- Row 2: Role and Active -->
                <div class="grid grid-cols-12 gap-8 items-end">
                  <div class="col-span-7 space-y-2.5">
                    <Label
                      for="staff-role"
                      class="text-[11px] font-black text-[#564338] uppercase tracking-widest ml-0.5"
                    >
                      {{ t('staff.form.role') }}
                    </Label>
                    <div class="relative">
                      <select
                        id="staff-role"
                        class="h-14 w-full appearance-none rounded-xl border border-[#DDC1B3] bg-white px-6 text-sm font-semibold text-[#1A1C1C] focus:outline-none focus:ring-1 focus:ring-[#DDC1B3] transition-all shadow-sm"
                        :value="form.roleId"
                        @change="
                          emit('update:field', {
                            field: 'roleId',
                            value: Number(($event.target as HTMLSelectElement).value),
                          })
                        "
                      >
                        <option :value="0" disabled>{{ t('staff.form.selectRole') }}</option>
                        <option v-for="role in roles" :key="role.id" :value="role.id">
                          {{ role.name }}
                        </option>
                      </select>
                      <ChevronDown
                        class="absolute right-6 top-1/2 size-5 -translate-y-1/2 text-[#A3A3A3] pointer-events-none"
                      />
                    </div>
                    <p v-if="errors.roleId" class="text-[11px] font-bold text-rose-500 ml-1">
                      {{ errors.roleId }}
                    </p>
                  </div>
                  <div class="col-span-5 flex items-center justify-start gap-4 h-14 pb-1 ml-4">
                    <div
                      class="relative h-6 w-11 rounded-full transition-all duration-300 cursor-pointer shadow-inner"
                      :class="form.isActive ? 'bg-[#974400]' : 'bg-[#E2DFDE]'"
                      @click="emit('update:field', { field: 'isActive', value: !form.isActive })"
                    >
                      <div
                        class="absolute top-1 size-4 rounded-full bg-white transition-transform duration-300 shadow-md"
                        :class="form.isActive ? 'translate-x-6' : 'translate-x-1'"
                      ></div>
                    </div>
                    <span class="text-[11px] font-black text-[#564338] uppercase tracking-widest">
                      {{ t('staff.form.active') }}
                    </span>
                  </div>
                </div>

                <!-- Row 3: Email and Phone -->
                <div class="grid grid-cols-2 gap-8">
                  <div class="space-y-2.5">
                    <Label
                      for="staff-email"
                      class="text-[11px] font-black text-[#564338] uppercase tracking-widest ml-0.5"
                    >
                      {{ t('staff.form.email') }}
                    </Label>
                    <div class="relative group">
                      <Mail
                        class="absolute left-6 top-1/2 size-5 -translate-y-1/2 text-[#A3A3A3] transition-colors group-focus-within:text-[#DDC1B3]"
                      />
                      <Input
                        id="staff-email"
                        class="h-14 rounded-xl border-[#DDC1B3] bg-white pl-14 pr-6 text-sm font-semibold text-[#1A1C1C] placeholder:text-[#E2DFDE] focus-visible:ring-1 focus-visible:ring-[#DDC1B3] transition-all shadow-sm disabled:bg-slate-50 disabled:opacity-50"
                        :placeholder="t('staff.form.emailPlaceholder')"
                        :disabled="!!editingId"
                        :model-value="form.email"
                        @update:model-value="
                          emit('update:field', { field: 'email', value: $event })
                        "
                      />
                    </div>
                    <p v-if="!editingId" class="text-[11px] font-bold text-[#737373] ml-1 mt-1">
                      {{ t('staff.form.emailNotice') }}
                    </p>
                    <p v-if="errors.email" class="text-[11px] font-bold text-rose-500 ml-1">
                      {{ errors.email }}
                    </p>
                  </div>

                  <div class="space-y-2.5">
                    <Label
                      for="staff-phone"
                      class="text-[11px] font-black text-[#564338] uppercase tracking-widest ml-0.5"
                    >
                      {{ t('staff.form.phoneOptional') }}
                    </Label>
                    <div class="relative group">
                      <Phone
                        class="absolute left-6 top-1/2 size-5 -translate-y-1/2 text-[#A3A3A3] transition-colors group-focus-within:text-[#DDC1B3]"
                      />
                      <Input
                        id="staff-phone"
                        class="h-14 rounded-xl border-[#DDC1B3] bg-white pl-14 pr-6 text-sm font-semibold text-[#1A1C1C] placeholder:text-[#E2DFDE] focus-visible:ring-1 focus-visible:ring-[#DDC1B3] transition-all shadow-sm"
                        :placeholder="t('staff.form.phonePlaceholder')"
                        :model-value="form.phone || ''"
                        @update:model-value="
                          emit('update:field', { field: 'phone', value: $event })
                        "
                      />
                    </div>
                  </div>
                </div>

                <!-- Row 4: Address -->
                <div class="space-y-2.5">
                  <Label
                    for="staff-address"
                    class="text-[11px] font-black text-[#564338] uppercase tracking-widest ml-0.5"
                  >
                    {{ t('staff.form.addressOptional') }}
                  </Label>
                  <div class="relative group">
                    <Home
                      class="absolute left-6 top-1/2 size-5 -translate-y-1/2 text-[#A3A3A3] transition-colors group-focus-within:text-[#DDC1B3]"
                    />
                    <Input
                      id="staff-address"
                      class="h-14 rounded-xl border-[#DDC1B3] bg-white pl-14 pr-6 text-sm font-semibold text-[#1A1C1C] placeholder:text-[#E2DFDE] focus-visible:ring-1 focus-visible:ring-[#DDC1B3] transition-all shadow-sm"
                      :placeholder="t('staff.form.addressPlaceholder')"
                      :model-value="form.address || ''"
                      @update:model-value="
                        emit('update:field', { field: 'address', value: $event })
                      "
                    />
                  </div>
                </div>

                <!-- Row 5: Profile Image -->
                <div class="space-y-2.5 pb-2">
                  <Label
                    class="text-[11px] font-black text-[#564338] uppercase tracking-widest ml-0.5"
                  >
                    {{ t('staff.form.profileImageOptional') }}
                  </Label>
                  <ImageUpload
                    :model-value="form.imageUrl"
                    :label="t('staff.form.profileImageOptional')"
                    :recommendation="t('staff.form.uploadRecommendation')"
                    :error="errors.imageUrl"
                    @change="handleImageChange"
                    @update:model-value="
                      val => {
                        if (!val) emit('fileChange', null)
                        emit('update:field', { field: 'imageUrl', value: val })
                      }
                    "
                  />
                </div>

                <!-- Footer Actions -->
                <div
                  class="mt-4 flex items-center justify-end gap-10 pt-10 border-t border-[#EEEEEE]"
                >
                  <Button
                    variant="link"
                    type="button"
                    class="text-sm font-bold text-[#737373] hover:text-[#1A1C1C] transition-colors"
                    @click="$emit('close')"
                  >
                    {{ t('staff.form.cancel') }}
                  </Button>
                  <Button
                    type="submit"
                    class="h-14 rounded-xl bg-[#974400] px-14 font-bold text-white shadow-xl shadow-[#974400]/20 hover:bg-[#7a3400] hover:shadow-[#974400]/30 transition-all active:scale-[0.98] min-w-[200px]"
                    :disabled="isSubmitting"
                  >
                    <LoaderCircle v-if="isSubmitting" class="mr-2 size-5 animate-spin" />
                    {{ editingId ? t('staff.updateProfile') : t('staff.form.submit') }}
                  </Button>
                </div>
              </form>
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

.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #e2dfde;
  border-radius: 10px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #ddc1b3;
}
</style>
