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
defineProps<Props>()

const { t } = useI18n()

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
            class="relative mx-4 flex max-w-[760px] w-full flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-stone-900 dark:border dark:border-stone-800"
          >
            <!-- Header -->
            <div
              class="relative border-b border-[#EEEEEE] px-10 pb-6 pt-10 text-start dark:border-stone-800"
            >
              <h3
                class="text-[24px] font-bold tracking-wider text-[#1A1C1C] title-case dark:text-stone-100"
              >
                {{ editingId ? t('staff.editStaffTitle') : t('staff.addStaffTitle') }}
              </h3>
              <p class="mt-1 text-[14px] font-medium text-[#737373] dark:text-stone-400">
                {{ t('staff.form.subtitle') }}
              </p>
              <Button
                variant="ghost"
                size="icon"
                class="absolute right-8 top-10 text-[#A3A3A3] transition-colors hover:text-[#1A1C1C] dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-100"
                :aria-label="t('staff.closeView')"
                @click="$emit('close')"
              >
                <X class="size-6" />
              </Button>
            </div>

            <!-- Content -->
            <div class="custom-scrollbar max-h-[80vh] overflow-y-auto px-10 pb-10 pt-8">
              <form class="space-y-8" @submit.prevent="$emit('submit')">
                <!-- Row 1: Full Name -->
                <div class="space-y-2.5">
                  <Label
                    for="staff-name"
                    class="ml-0.5 text-[11px] font-black uppercase tracking-widest text-[#564338] dark:text-stone-300"
                  >
                    {{ t('staff.form.name') }}
                  </Label>
                  <AppInput
                    id="staff-name"
                    class="h-14 rounded-xl border-[#DDC1B3] bg-white px-6 text-sm font-semibold text-[#1A1C1C] shadow-sm transition-all placeholder:text-[#E2DFDE] focus-visible:ring-1 focus-visible:ring-[#DDC1B3] dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100 dark:placeholder:text-stone-500 dark:focus-visible:ring-stone-600"
                    :placeholder="t('staff.form.namePlaceholder')"
                    :model-value="form.name"
                    @update:model-value="emit('update:field', { field: 'name', value: $event })"
                  />
                  <p
                    v-if="errors.name"
                    class="ml-1 text-[11px] font-bold text-rose-500 dark:text-rose-400"
                  >
                    {{ errors.name }}
                  </p>
                </div>

                <!-- Row 2: Role and Active -->
                <div class="grid grid-cols-12 items-end gap-8">
                  <div class="col-span-7 space-y-2.5">
                    <Label
                      for="staff-role"
                      class="ml-0.5 text-[11px] font-black uppercase tracking-widest text-[#564338] dark:text-stone-300"
                    >
                      {{ t('staff.form.role') }}
                    </Label>
                    <div class="relative">
                      <select
                        id="staff-role"
                        class="h-14 w-full appearance-none rounded-xl border border-[#DDC1B3] bg-white px-6 text-sm font-semibold text-[#1A1C1C] shadow-sm transition-all focus:outline-none focus:ring-1 focus:ring-[#DDC1B3] dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100 dark:focus:ring-stone-600"
                        :value="form.roleId"
                        @change="
                          emit('update:field', {
                            field: 'roleId',
                            value: Number(($event.target as HTMLSelectElement).value),
                          })
                        "
                      >
                        <option :value="0" disabled class="dark:bg-stone-800 dark:text-stone-400">
                          {{ t('staff.form.selectRole') }}
                        </option>
                        <option
                          v-for="role in roles"
                          :key="role.id"
                          :value="role.id"
                          class="dark:bg-stone-800 dark:text-stone-100"
                        >
                          {{ role.name }}
                        </option>
                      </select>
                      <ChevronDown
                        class="pointer-events-none absolute right-6 top-1/2 size-5 -translate-y-1/2 text-[#A3A3A3] dark:text-stone-400"
                      />
                    </div>
                    <p
                      v-if="errors.roleId"
                      class="ml-1 text-[11px] font-bold text-rose-500 dark:text-rose-400"
                    >
                      {{ errors.roleId }}
                    </p>
                  </div>
                  <!-- <div class="col-span-7 space-y-2.5">
                    <app-select 
                    v-model="form.roleId"
                    label="Role" 
                    placeholder="Select a role…"
                    :options="roles.map(role => ({ value: String(role.id), label: role.name }))" />
                  </div> -->
                  <div class="col-span-5 flex items-center justify-start gap-4 h-14 pb-1 ml-4">
                    <div
                      class="relative h-6 w-11 cursor-pointer rounded-full shadow-inner transition-all duration-300"
                      :class="form.isActive ? 'bg-[#974400]' : 'bg-[#E2DFDE]'"
                      @click="emit('update:field', { field: 'isActive', value: !form.isActive })"
                    >
                      <div
                        class="absolute top-1 size-4 rounded-full bg-white shadow-md transition-transform duration-300"
                        :class="form.isActive ? 'translate-x-6' : 'translate-x-1'"
                      ></div>
                    </div>
                    <span
                      class="text-[11px] font-black uppercase tracking-widest text-[#564338] dark:text-stone-300"
                    >
                      {{ t('staff.form.active') }}
                    </span>
                  </div>
                </div>

                <!-- Row 3: Email and Phone -->
                <div class="grid grid-cols-2 gap-8">
                  <div class="space-y-2.5">
                    <Label
                      for="staff-email"
                      class="ml-0.5 text-[11px] font-black uppercase tracking-widest text-[#564338] dark:text-stone-300"
                    >
                      {{ t('staff.form.email') }}
                    </Label>
                    <div class="group relative">
                      <Mail
                        class="absolute left-6 top-1/2 size-5 -translate-y-1/2 text-[#A3A3A3] transition-colors group-focus-within:text-[#DDC1B3] dark:text-stone-400 dark:group-focus-within:text-stone-300"
                      />
                      <AppInput
                        id="staff-email"
                        class="h-14 rounded-xl border-[#DDC1B3] bg-white pl-14 pr-6 text-sm font-semibold text-[#1A1C1C] shadow-sm transition-all placeholder:text-[#E2DFDE] focus-visible:ring-1 focus-visible:ring-[#DDC1B3] disabled:bg-slate-50 disabled:opacity-50 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100 dark:placeholder:text-stone-500 dark:focus-visible:ring-stone-600 dark:disabled:bg-stone-900/50"
                        :placeholder="t('staff.form.emailPlaceholder')"
                        :disabled="!!editingId"
                        :model-value="form.email"
                        @update:model-value="
                          emit('update:field', { field: 'email', value: $event })
                        "
                      />
                    </div>
                    <p
                      v-if="!editingId"
                      class="ml-1 mt-1 text-[11px] font-bold text-[#737373] dark:text-stone-400"
                    >
                      {{ t('staff.form.emailNotice') }}
                    </p>
                    <p
                      v-if="errors.email"
                      class="ml-1 text-[11px] font-bold text-rose-500 dark:text-rose-400"
                    >
                      {{ errors.email }}
                    </p>
                  </div>

                  <div class="space-y-2.5">
                    <Label
                      for="staff-phone"
                      class="ml-0.5 text-[11px] font-black uppercase tracking-widest text-[#564338] dark:text-stone-300"
                    >
                      {{ t('staff.form.phoneOptional') }}
                    </Label>
                    <div class="group relative">
                      <Phone
                        class="absolute left-6 top-1/2 size-5 -translate-y-1/2 text-[#A3A3A3] transition-colors group-focus-within:text-[#DDC1B3] dark:text-stone-400 dark:group-focus-within:text-stone-300"
                      />
                      <AppInput
                        id="staff-phone"
                        class="h-14 rounded-xl border-[#DDC1B3] bg-white pl-14 pr-6 text-sm font-semibold text-[#1A1C1C] shadow-sm transition-all placeholder:text-[#E2DFDE] focus-visible:ring-1 focus-visible:ring-[#DDC1B3] dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100 dark:placeholder:text-stone-500 dark:focus-visible:ring-stone-600"
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
                    class="ml-0.5 text-[11px] font-black uppercase tracking-widest text-[#564338] dark:text-stone-300"
                  >
                    {{ t('staff.form.addressOptional') }}
                  </Label>
                  <div class="group relative">
                    <Home
                      class="absolute left-6 top-1/2 size-5 -translate-y-1/2 text-[#A3A3A3] transition-colors group-focus-within:text-[#DDC1B3] dark:text-stone-400 dark:group-focus-within:text-stone-300"
                    />
                    <AppInput
                      id="staff-address"
                      class="h-14 rounded-xl border-[#DDC1B3] bg-white pl-14 pr-6 text-sm font-semibold text-[#1A1C1C] shadow-sm transition-all placeholder:text-[#E2DFDE] focus-visible:ring-1 focus-visible:ring-[#DDC1B3] dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100 dark:placeholder:text-stone-500 dark:focus-visible:ring-stone-600"
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
                    class="ml-0.5 text-[11px] font-black uppercase tracking-widest text-[#564338] dark:text-stone-300"
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
                  class="mt-4 flex items-center justify-end gap-3 border-t border-[#EEEEEE] pt-8 dark:border-stone-800"
                >
                  <Button
                    type="button"
                    variant="tertiary"
                    class="h-14 w-44 rounded-xl bg-stone-100 font-bold text-stone-700 transition-colors hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700 dark:hover:text-stone-100"
                    @click="$emit('close')"
                  >
                    {{ t('staff.form.cancel') }}
                  </Button>
                  <Button
                    type="submit"
                    class="h-14 w-44 gap-2 rounded-xl bg-[#974400] font-bold text-white shadow-xl shadow-[#974400]/20 transition-all hover:bg-[#7a3400] hover:shadow-[#974400]/30 active:scale-[0.98] dark:bg-[#974400] dark:hover:bg-[#7a3400]"
                    :disabled="isSubmitting"
                  >
                    <LoaderCircle v-if="isSubmitting" class="size-5 animate-spin" />
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
