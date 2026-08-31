<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { SwitchRoot, SwitchThumb } from 'reka-ui'
import { useProductStore } from '@/store/useProductStore'
import { toast } from 'vue-sonner'
import type { Category, CategoryType } from '@/types/product.types'
import { createCategoryPayloadSchema } from '@/validations/productValidation'

const emit = defineEmits<{
  (e: 'success'): void
  (e: 'close'): void
}>()

const props = withDefaults(
  defineProps<{
    category?: Category
    defaultType?: CategoryType
  }>(),
  {
    defaultType: 'product',
  }
)

const productStore = useProductStore()
const { t } = useI18n()
const isLoading = ref(false)

const typeOptions: { value: CategoryType; labelKey: string; hintKey: string }[] = [
  {
    value: 'product',
    labelKey: 'category.form.typeProduct',
    hintKey: 'category.form.typeProductHint',
  },
  {
    value: 'inventory',
    labelKey: 'category.form.typeInventory',
    hintKey: 'category.form.typeInventoryHint',
  },
]

const form = reactive({
  name: '',
  isActive: true,
  isDragging: false,
  type: props.defaultType as CategoryType,
})

// Watch for category prop changes to populate form when editing
watch(
  () => props.category,
  newCategory => {
    if (newCategory) {
      form.name = newCategory.name
      form.isActive = newCategory.isActive
      form.type = newCategory.type
    } else {
      form.name = ''
      form.isActive = true
      form.type = props.defaultType
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
      type: form.type,
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
        type: form.type,
      })
      toast.success(t('category.form.toastUpdateSuccess'))
    } else {
      // Create new category
      await productStore.createCategory({
        name: form.name.trim(),
        isActive: form.isActive,
        type: form.type,
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
    <div
      class="bg-white dark:bg-stone-900 rounded-2xl px-5 py-5 shadow-sm border border-stone-100 dark:border-stone-800"
    >
      <label class="block text-sm font-semibold text-stone-800 dark:text-stone-100 mb-3">{{
        $t('category.form.categoryNameLabel')
      }}</label>
      <input
        v-model="form.name"
        type="text"
        :placeholder="$t('category.form.categoryPlaceholder')"
        class="w-full px-4 py-3 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-sm text-stone-800 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:outline-none focus:border-[#C26A1A] focus:ring-2 focus:ring-[#C26A1A]/10 transition"
      />
    </div>

    <!-- Category Type -->
    <div
      class="bg-white dark:bg-stone-900 rounded-2xl px-5 py-5 shadow-sm border border-stone-100 dark:border-stone-800"
    >
      <label class="block text-sm font-semibold text-stone-800 dark:text-stone-100 mb-1">{{
        $t('category.form.categoryTypeLabel')
      }}</label>
      <p class="text-xs text-stone-400 dark:text-stone-500 mb-3">
        {{ $t('category.form.categoryTypeHint') }}
      </p>
      <div class="grid grid-cols-2 gap-3">
        <button
          v-for="option in typeOptions"
          :key="option.value"
          type="button"
          class="rounded-xl border px-4 py-3 text-left transition-colors"
          :class="
            form.type === option.value
              ? 'border-[#C26A1A] bg-[#fdf4ef] dark:bg-[#C26A1A]/10'
              : 'border-stone-200 dark:border-stone-700 hover:border-stone-300 dark:hover:border-stone-600'
          "
          @click="form.type = option.value"
        >
          <p
            class="text-sm font-semibold"
            :class="
              form.type === option.value ? 'text-[#C26A1A]' : 'text-stone-700 dark:text-stone-300'
            "
          >
            {{ $t(option.labelKey) }}
          </p>
          <p class="text-xs text-stone-400 dark:text-stone-500 mt-0.5">
            {{ $t(option.hintKey) }}
          </p>
        </button>
      </div>
    </div>

    <!-- Item Status -->
    <div
      class="bg-stone-100/80 dark:bg-stone-800/50 rounded-2xl px-5 py-4 shadow-sm border border-stone-100 dark:border-stone-800 flex items-center justify-between"
    >
      <div>
        <p class="text-sm font-semibold text-stone-800 dark:text-stone-100">
          {{ $t('category.form.categoryStatusLabel') }}
        </p>
        <p
          class="text-xs font-semibold mt-0.5 transition-colors"
          :class="form.isActive ? 'text-[#C26A1A]' : 'text-stone-400 dark:text-stone-500'"
        >
          {{ form.isActive ? $t('category.active') : $t('category.inactive') }}
        </p>
      </div>

      <SwitchRoot
        v-model="form.isActive"
        class="relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C26A1A] focus-visible:ring-offset-2 data-[state=checked]:bg-[#C26A1A] data-[state=unchecked]:bg-slate-300 dark:data-[state=unchecked]:bg-stone-700"
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
        class="h-11 w-36 rounded-xl bg-stone-100 text-sm font-semibold text-stone-700 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700 dark:hover:text-stone-100 transition-colors"
        @click="emit('close')"
      >
        {{ $t('category.cancel') }}
      </button>
      <button
        type="submit"
        :disabled="isLoading"
        class="h-11 w-36 rounded-xl bg-stone-900 text-sm font-semibold text-white hover:bg-stone-800 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-200 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
