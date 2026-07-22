<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { X, LoaderCircle, Tags } from 'lucide-vue-next'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Category, Product } from '@/types/product.types'
import type {
  DiscountType,
  Promotion,
  PromotionPayload,
  PromotionScope,
} from '@/types/promotion.types'
import ItemSelectorModal from './ItemSelectorModal.vue'

const props = defineProps<{
  isOpen: boolean
  editing: Promotion | null
  categories: Category[]
  products: Product[]
  // Ids already claimed by OTHER promotions (excludes the one being edited) so the
  // item selector can lock them — an item may belong to one promotion at a time.
  claimedCategoryIds?: number[]
  claimedProductIds?: number[]
  isSubmitting: boolean
  currencySymbol?: string
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'submit', payload: PromotionPayload): void
}>()

const { t } = useI18n()

const DISCOUNT_TYPES: DiscountType[] = ['PERCENTAGE', 'FIXED_AMOUNT', 'BOGO']

const name = ref('')
const code = ref('')
const discountType = ref<DiscountType>('PERCENTAGE')
const discountValue = ref<number>(0)
const scope = ref<PromotionScope>('ALL')
const isActive = ref(false)
const startDate = ref('')
const endDate = ref('')
const categoryIds = ref<number[]>([])
const productIds = ref<number[]>([])
const errors = ref<Record<string, string>>({})
const isSelectorOpen = ref(false)

const toDateInput = (value: string | null) => (value ? value.slice(0, 10) : '')

const reset = () => {
  const p = props.editing
  name.value = p?.name ?? ''
  code.value = p?.code ?? ''
  discountType.value = p?.discountType ?? 'PERCENTAGE'
  discountValue.value = p?.discountValue ?? 0
  scope.value = p?.scope ?? 'ALL'
  isActive.value = p?.isActive ?? false
  startDate.value = toDateInput(p?.startDate ?? null)
  endDate.value = toDateInput(p?.endDate ?? null)
  categoryIds.value = [...(p?.categoryIds ?? [])]
  productIds.value = [...(p?.productIds ?? [])]
  errors.value = {}
}

watch(
  () => props.isOpen,
  open => {
    if (open) reset()
  },
  { immediate: true }
)

const isBogo = computed(() => discountType.value === 'BOGO')
const selectionCount = computed(() => categoryIds.value.length + productIds.value.length)

const typeLabel = (type: DiscountType) => t(`promotions.types.${type}`)

const applySelection = (payload: { categoryIds: number[]; productIds: number[] }) => {
  categoryIds.value = payload.categoryIds
  productIds.value = payload.productIds
  isSelectorOpen.value = false
}

const validate = () => {
  const next: Record<string, string> = {}
  if (!name.value.trim()) next.name = t('promotions.form.errors.nameRequired')
  if (!isBogo.value) {
    // v-model.number yields '' when the field is cleared, which coerces to 0 — treat a
    // missing/zero/negative value as invalid rather than silently saving a 0 discount.
    const value = Number(discountValue.value)
    if (Number.isNaN(value) || value <= 0) {
      next.discountValue = t('promotions.form.errors.valueInvalid')
    } else if (discountType.value === 'PERCENTAGE' && value > 100) {
      next.discountValue = t('promotions.form.errors.percentageMax')
    }
  }
  if (startDate.value && endDate.value && endDate.value < startDate.value) {
    next.endDate = t('promotions.form.errors.dateOrder')
  }
  if (scope.value === 'SPECIFIC' && selectionCount.value === 0) {
    next.scope = t('promotions.form.errors.scopeRequired')
  }
  errors.value = next
  return Object.keys(next).length === 0
}

const submit = () => {
  if (!validate()) return
  const payload: PromotionPayload = {
    name: name.value.trim(),
    code: code.value.trim() || null,
    discountType: discountType.value,
    discountValue: isBogo.value ? 0 : Number(discountValue.value) || 0,
    scope: scope.value,
    isActive: isActive.value,
    startDate: startDate.value || null,
    endDate: endDate.value || null,
    categoryIds: scope.value === 'SPECIFIC' ? categoryIds.value : [],
    productIds: scope.value === 'SPECIFIC' ? productIds.value : [],
  }
  emit('submit', payload)
}
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="isOpen"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
        @click.self="emit('close')"
      >
        <Transition name="scale" appear>
          <div
            v-if="isOpen"
            class="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-stone-900"
          >
            <!-- Header -->
            <div
              class="flex items-center justify-between border-b border-stone-100 px-8 py-6 dark:border-stone-800"
            >
              <h2 class="text-2xl font-bold text-[#1A1C1C] dark:text-stone-100">
                {{ editing ? t('promotions.form.editTitle') : t('promotions.form.addTitle') }}
              </h2>
              <button
                class="rounded-full p-1 text-stone-400 transition-colors hover:bg-stone-100 dark:hover:bg-stone-800"
                @click="emit('close')"
              >
                <X class="size-6" />
              </button>
            </div>

            <!-- Body: two columns -->
            <div class="grid min-h-0 flex-1 gap-8 overflow-y-auto p-8 md:grid-cols-2">
              <!-- Left: details -->
              <div class="space-y-5">
                <div>
                  <label class="mb-1.5 block text-sm font-bold text-[#1A1C1C] dark:text-stone-200">
                    {{ t('promotions.form.name') }}
                  </label>
                  <Input
                    v-model="name"
                    :placeholder="t('promotions.form.namePlaceholder')"
                    class="h-12 rounded-xl border border-stone-200 dark:border-stone-700"
                  />
                  <p v-if="errors.name" class="mt-1 text-xs font-medium text-rose-500">
                    {{ errors.name }}
                  </p>
                </div>

                <div>
                  <label class="mb-1.5 block text-sm font-bold text-[#1A1C1C] dark:text-stone-200">
                    {{ t('promotions.form.code') }}
                  </label>
                  <Input
                    v-model="code"
                    :placeholder="t('promotions.form.codePlaceholder')"
                    class="h-12 rounded-xl border border-stone-200 dark:border-stone-700"
                  />
                </div>

                <div>
                  <label class="mb-1.5 block text-sm font-bold text-[#1A1C1C] dark:text-stone-200">
                    {{ t('promotions.form.type') }}
                  </label>
                  <Select v-model="discountType">
                    <SelectTrigger
                      class="h-12 w-full rounded-xl border border-stone-200 dark:border-stone-700"
                    >
                      <SelectValue :placeholder="t('promotions.form.type')" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem v-for="type in DISCOUNT_TYPES" :key="type" :value="type">
                        {{ typeLabel(type) }}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label class="mb-1.5 block text-sm font-bold text-[#1A1C1C] dark:text-stone-200">
                    {{ t('promotions.form.value') }}
                  </label>
                  <div class="relative">
                    <span
                      v-if="discountType === 'FIXED_AMOUNT'"
                      class="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-[#A3A3A3]"
                    >
                      {{ currencySymbol || '$' }}
                    </span>
                    <Input
                      v-model.number="discountValue"
                      type="number"
                      min="0"
                      :disabled="isBogo"
                      :placeholder="isBogo ? t('promotions.value.freeItem') : '0'"
                      class="h-12 rounded-xl border border-stone-200 dark:border-stone-700"
                      :class="discountType === 'FIXED_AMOUNT' ? 'pl-9' : ''"
                    />
                    <span
                      v-if="discountType === 'PERCENTAGE'"
                      class="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-[#A3A3A3]"
                    >
                      %
                    </span>
                  </div>
                  <p v-if="isBogo" class="mt-1 text-xs font-medium text-[#A3A3A3]">
                    {{ t('promotions.form.bogoHint') }}
                  </p>
                  <p v-if="errors.discountValue" class="mt-1 text-xs font-medium text-rose-500">
                    {{ errors.discountValue }}
                  </p>
                </div>

                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <label
                      class="mb-1.5 block text-sm font-bold text-[#1A1C1C] dark:text-stone-200"
                    >
                      {{ t('promotions.form.startDate') }}
                    </label>
                    <Input
                      v-model="startDate"
                      type="date"
                      class="h-12 rounded-xl border border-stone-200 dark:border-stone-700"
                    />
                  </div>
                  <div>
                    <label
                      class="mb-1.5 block text-sm font-bold text-[#1A1C1C] dark:text-stone-200"
                    >
                      {{ t('promotions.form.endDate') }}
                    </label>
                    <Input
                      v-model="endDate"
                      type="date"
                      class="h-12 rounded-xl border border-stone-200 dark:border-stone-700"
                    />
                    <p v-if="errors.endDate" class="mt-1 text-xs font-medium text-rose-500">
                      {{ errors.endDate }}
                    </p>
                  </div>
                </div>
              </div>

              <!-- Right: conditions & scope -->
              <div class="space-y-5">
                <div
                  class="rounded-2xl border border-stone-100 bg-[#FAFAFA] p-6 dark:border-stone-800 dark:bg-stone-800/40"
                >
                  <h3 class="mb-4 text-sm font-bold text-[#1A1C1C] dark:text-stone-100">
                    {{ t('promotions.form.conditionsTitle') }}
                  </h3>

                  <div class="space-y-3">
                    <label
                      class="flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors"
                      :class="
                        scope === 'ALL'
                          ? 'border-[#D2691E] bg-white dark:bg-stone-900'
                          : 'border-stone-200 dark:border-stone-700'
                      "
                    >
                      <input
                        v-model="scope"
                        type="radio"
                        value="ALL"
                        class="mt-0.5 accent-[#D2691E]"
                      />
                      <span>
                        <span class="block text-sm font-bold text-[#1A1C1C] dark:text-stone-100">
                          {{ t('promotions.form.scopeAll') }}
                        </span>
                        <span class="block text-xs text-[#737373] dark:text-stone-400">
                          {{ t('promotions.form.scopeAllHint') }}
                        </span>
                      </span>
                    </label>

                    <label
                      class="flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors"
                      :class="
                        scope === 'SPECIFIC'
                          ? 'border-[#D2691E] bg-white dark:bg-stone-900'
                          : 'border-stone-200 dark:border-stone-700'
                      "
                    >
                      <input
                        v-model="scope"
                        type="radio"
                        value="SPECIFIC"
                        class="mt-0.5 accent-[#D2691E]"
                      />
                      <span>
                        <span class="block text-sm font-bold text-[#1A1C1C] dark:text-stone-100">
                          {{ t('promotions.form.scopeSpecific') }}
                        </span>
                        <span class="block text-xs text-[#737373] dark:text-stone-400">
                          {{ t('promotions.form.scopeSpecificHint') }}
                        </span>
                      </span>
                    </label>
                  </div>

                  <div v-if="scope === 'SPECIFIC'" class="mt-4">
                    <Button
                      variant="outline"
                      class="h-12 w-full justify-center gap-2 rounded-xl border-dashed border-[#D2691E] text-[#D2691E]"
                      @click="isSelectorOpen = true"
                    >
                      <Tags class="size-5" />
                      {{
                        selectionCount > 0
                          ? t('promotions.form.editSelection', { count: selectionCount })
                          : t('promotions.form.chooseItems')
                      }}
                    </Button>
                    <p v-if="errors.scope" class="mt-1 text-xs font-medium text-rose-500">
                      {{ errors.scope }}
                    </p>
                  </div>
                </div>

                <!-- Active toggle -->
                <label
                  class="flex cursor-pointer items-center justify-between rounded-2xl border border-stone-100 p-5 dark:border-stone-800"
                >
                  <span>
                    <span class="block text-sm font-bold text-[#1A1C1C] dark:text-stone-100">
                      {{ t('promotions.form.activeLabel') }}
                    </span>
                    <span class="block text-xs text-[#737373] dark:text-stone-400">
                      {{ t('promotions.form.activeHint') }}
                    </span>
                  </span>
                  <button
                    type="button"
                    class="relative h-7 w-12 shrink-0 rounded-full transition-colors"
                    :class="isActive ? 'bg-[#D2691E]' : 'bg-stone-300 dark:bg-stone-600'"
                    role="switch"
                    :aria-checked="isActive"
                    @click="isActive = !isActive"
                  >
                    <span
                      class="absolute top-1 size-5 rounded-full bg-white transition-all"
                      :class="isActive ? 'left-6' : 'left-1'"
                    />
                  </button>
                </label>
              </div>
            </div>

            <!-- Footer -->
            <div
              class="flex items-center justify-end gap-3 border-t border-stone-100 px-8 py-5 dark:border-stone-800"
            >
              <Button variant="outline" class="rounded-xl px-6" @click="emit('close')">
                {{ t('common.cancel') }}
              </Button>
              <Button
                class="gap-2 rounded-xl bg-[#D2691E] px-8 font-bold text-white hover:bg-[#B35919]"
                :disabled="isSubmitting"
                @click="submit"
              >
                <LoaderCircle v-if="isSubmitting" class="size-4 animate-spin" />
                {{ editing ? t('promotions.form.saveChanges') : t('promotions.form.create') }}
              </Button>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>

    <ItemSelectorModal
      :is-open="isSelectorOpen"
      :categories="categories"
      :products="products"
      :selected-category-ids="categoryIds"
      :selected-product-ids="productIds"
      :disabled-category-ids="claimedCategoryIds"
      :disabled-product-ids="claimedProductIds"
      :currency-symbol="currencySymbol"
      @close="isSelectorOpen = false"
      @confirm="applySelection"
    />
  </Teleport>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
.scale-enter-active {
  transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1);
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
  transform: scale(0.98);
}
</style>
