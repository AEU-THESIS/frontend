<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { SwitchRoot, SwitchThumb } from 'reka-ui'
import { useProductStore } from '@/store/useProductStore'
import { toast } from 'vue-sonner'
import type { Category } from '@/types/product.types'
import { createCategoryPayloadSchema } from '@/validations/productValidation'

const emit = defineEmits<{
  (e: 'success'): void
  (e: 'close'): void
}>()

const props = defineProps<{
  category?: Category
}>()

const productStore = useProductStore()
const { t } = useI18n()
const isLoading = ref(false)

const form = reactive({
  name: '',
  isActive: true,
  isDragging: false,
})

// Watch for category prop changes to populate form when editing
watch(
  () => props.category,
  newCategory => {
    if (newCategory) {
      form.name = newCategory.name
      form.isActive = newCategory.isActive
    } else {
      form.name = ''
      form.isActive = true
    }
  },
  { immediate: true }
)

const isEditMode = () => !!props.category

async function handleSubmit() {
  if (!form.name.trim()) {
    toast.error(t('category.form.nameRequiredError'))
    return
  }

  isLoading.value = true
  try {
    const validationResult = createCategoryPayloadSchema.safeParse({
      name: form.name.trim(),
      isActive: form.isActive,
    })
    if (!validationResult.success) {
      toast.error(t('category.form.invalidDataError'))
      return
    }

    if (isEditMode()) {
      // Update existing category
      await productStore.updateCategory(props.category!.id, {
        name: form.name.trim(),
        isActive: form.isActive,
      })
      toast.success(t('category.form.toastUpdateSuccess'))
    } else {
      // Create new category
      await productStore.createCategory({
        name: form.name.trim(),
        isActive: form.isActive,
      })
      toast.success(t('category.form.toastCreateSuccess'))
    }
    emit('success')
  } catch (error: unknown) {
    const fallbackMsg = isEditMode() ? t('toastUpdateError') : t('toastCreateError')
    const errorMessage =
      error && typeof error === 'object' && 'message' in error && typeof error.message === 'string'
        ? error.message
        : fallbackMsg
    toast.error(errorMessage)
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <form class="w-full space-y-4 font-sans" @submit.prevent="handleSubmit">
    <!-- Item Name -->
    <div class="bg-white rounded-2xl px-5 py-5 shadow-sm border border-stone-100">
      <label class="block text-sm font-semibold text-stone-800 mb-3">{{
        $t('category.form.categoryNameLabel')
      }}</label>
      <input
        v-model="form.name"
        type="text"
        :placeholder="$t('category.form.categoryPlaceholder')"
        class="w-full px-4 py-3 rounded-xl bg-stone-50 border border-stone-200 text-sm text-stone-800 placeholder:text-stone-400 focus:outline-none focus:border-[#C26A1A] focus:ring-2 focus:ring-[#C26A1A]/10 transition"
      />
    </div>

    <!-- Item Status -->
    <div
      class="bg-stone-100/80 rounded-2xl px-5 py-4 shadow-sm border border-stone-100 flex items-center justify-between"
    >
      <div>
        <p class="text-sm font-semibold text-stone-800">
          {{ $t('category.form.categoryStatusLabel') }}
        </p>
        <p
          class="text-xs font-semibold mt-0.5 transition-colors"
          :class="form.isActive ? 'text-[#C26A1A]' : 'text-stone-400'"
        >
          {{ form.isActive ? $t('category.active') : $t('category.inactive') }}
        </p>
      </div>

      <SwitchRoot
        v-model="form.isActive"
        class="relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C26A1A] focus-visible:ring-offset-2 data-[state=checked]:bg-[#C26A1A] data-[state=unchecked]:bg-slate-300"
      >
        <SwitchThumb
          class="block size-5 self-center rounded-full bg-white shadow transition-transform duration-200 ease-in-out data-[state=checked]:translate-x-6 data-[state=unchecked]:translate-x-1"
        />
      </SwitchRoot>
    </div>

    <!-- Form Actions -->
    <div class="flex items-center justify-end gap-3 pt-2">
      <button
        type="button"
        class="px-5 py-2.5 rounded-xl text-sm font-semibold text-stone-500 hover:bg-stone-100 transition-colors"
        @click="emit('close')"
      >
        {{ $t('category.cancel') }}
      </button>
      <button
        type="submit"
        :disabled="isLoading"
        class="px-6 py-2.5 rounded-xl text-sm font-semibold bg-stone-900 text-white hover:bg-stone-850 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
      >
        <span
          v-if="isLoading"
          class="animate-spin inline-block size-4 border-2 border-current border-t-transparent rounded-full"
        />
        {{ isEditMode() ? $t('category.form.updateCategory') : $t('category.form.saveCategory') }}
      </button>
    </div>
  </form>
</template>
