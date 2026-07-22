<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Search, X, Check } from 'lucide-vue-next'
import type { Category, Product } from '@/types/product.types'

const props = defineProps<{
  isOpen: boolean
  categories: Category[]
  products: Product[]
  selectedCategoryIds: number[]
  selectedProductIds: number[]
  // Ids already claimed by another promotion — shown disabled so an item can only
  // ever belong to one promotion at a time.
  disabledCategoryIds?: number[]
  disabledProductIds?: number[]
  currencySymbol?: string
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'confirm', payload: { categoryIds: number[]; productIds: number[] }): void
}>()

const { t } = useI18n()

type Tab = 'items' | 'categories'
const activeTab = ref<Tab>('items')
const search = ref('')
const selectedProducts = ref<Set<number>>(new Set())
const selectedCategories = ref<Set<number>>(new Set())

// Re-seed the local selection every time the modal opens.
watch(
  () => props.isOpen,
  open => {
    if (open) {
      selectedProducts.value = new Set(props.selectedProductIds)
      selectedCategories.value = new Set(props.selectedCategoryIds)
      search.value = ''
      activeTab.value = 'items'
    }
  },
  { immediate: true }
)

const filteredProducts = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return props.products
  return props.products.filter(p => p.name.toLowerCase().includes(q))
})

const filteredCategories = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return props.categories
  return props.categories.filter(c => c.name.toLowerCase().includes(q))
})

const disabledProducts = computed(() => new Set(props.disabledProductIds ?? []))
const disabledCategories = computed(() => new Set(props.disabledCategoryIds ?? []))

// Only products/categories that aren't locked to another promotion can be bulk-selected.
const selectableProducts = computed(() =>
  filteredProducts.value.filter(p => !disabledProducts.value.has(p.id))
)

const allProductsSelected = computed(
  () =>
    selectableProducts.value.length > 0 &&
    selectableProducts.value.every(p => selectedProducts.value.has(p.id))
)

// Per-tab counts so the footer total is never a mystery: if it reads "2 selected"
// while the Items tab shows one checkbox, the Categories tab badge shows the other.
const selectedProductsCount = computed(() => selectedProducts.value.size)
const selectedCategoriesCount = computed(() => selectedCategories.value.size)
const totalSelected = computed(() => selectedProductsCount.value + selectedCategoriesCount.value)

const toggleProduct = (id: number) => {
  if (disabledProducts.value.has(id)) return
  const next = new Set(selectedProducts.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  selectedProducts.value = next
}

const toggleCategory = (id: number) => {
  if (disabledCategories.value.has(id)) return
  const next = new Set(selectedCategories.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  selectedCategories.value = next
}

const toggleSelectAllProducts = () => {
  const next = new Set(selectedProducts.value)
  const selectAll = !allProductsSelected.value
  for (const p of selectableProducts.value) {
    if (selectAll) next.add(p.id)
    else next.delete(p.id)
  }
  selectedProducts.value = next
}

const confirm = () => {
  emit('confirm', {
    categoryIds: [...selectedCategories.value],
    productIds: [...selectedProducts.value],
  })
}

const formatPrice = (price: number | null) =>
  price == null ? '—' : `${props.currencySymbol || '$'}${price.toFixed(2)}`
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="isOpen"
        class="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
        @click.self="emit('close')"
      >
        <Transition name="scale" appear>
          <div
            v-if="isOpen"
            class="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-stone-900"
          >
            <!-- Header -->
            <div class="flex items-start justify-between px-8 pt-8 pb-4">
              <div>
                <h2 class="text-2xl font-bold text-[#1A1C1C] dark:text-stone-100">
                  {{ t('promotions.selector.title') }}
                </h2>
                <p class="mt-1 text-sm text-[#737373] dark:text-stone-400">
                  {{ t('promotions.selector.subtitle') }}
                </p>
              </div>
              <button
                class="rounded-full p-1 text-stone-400 transition-colors hover:bg-stone-100 dark:hover:bg-stone-800"
                @click="emit('close')"
              >
                <X class="size-6" />
              </button>
            </div>

            <!-- Search -->
            <div class="px-8 pb-4">
              <div class="relative">
                <Search class="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[#A3A3A3]" />
                <Input
                  v-model="search"
                  :placeholder="t('promotions.selector.searchPlaceholder')"
                  class="h-12 rounded-xl border border-stone-200 bg-white pl-11 pr-4 text-sm dark:border-stone-700 dark:bg-stone-800"
                />
              </div>
            </div>

            <!-- Tabs -->
            <div class="flex gap-2 px-8 pb-4">
              <button
                v-for="tab in ['items', 'categories'] as const"
                :key="tab"
                class="flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-bold transition-colors"
                :class="
                  activeTab === tab
                    ? 'bg-[#D2691E] text-white'
                    : 'bg-stone-100 text-stone-500 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-400'
                "
                @click="activeTab = tab"
              >
                {{
                  tab === 'items'
                    ? t('promotions.selector.itemsTab')
                    : t('promotions.selector.categoriesTab')
                }}
                <span
                  v-if="(tab === 'items' ? selectedProductsCount : selectedCategoriesCount) > 0"
                  class="flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-bold"
                  :class="activeTab === tab ? 'bg-white/25 text-white' : 'bg-[#D2691E] text-white'"
                >
                  {{ tab === 'items' ? selectedProductsCount : selectedCategoriesCount }}
                </span>
              </button>
            </div>

            <!-- Items list -->
            <div class="min-h-0 flex-1 overflow-y-auto px-8">
              <template v-if="activeTab === 'items'">
                <div
                  class="flex items-center justify-between border-b border-stone-100 py-3 dark:border-stone-800"
                >
                  <button
                    class="flex items-center gap-3 text-sm font-bold text-[#1A1C1C] dark:text-stone-100"
                    @click="toggleSelectAllProducts"
                  >
                    <span
                      class="flex size-6 items-center justify-center rounded-md border transition-colors"
                      :class="
                        allProductsSelected
                          ? 'border-[#D2691E] bg-[#D2691E] text-white'
                          : 'border-stone-300 dark:border-stone-600'
                      "
                    >
                      <Check v-if="allProductsSelected" class="size-4" />
                    </span>
                    {{ t('promotions.selector.selectAll') }}
                  </button>
                  <span class="text-[11px] font-bold uppercase tracking-wider text-[#A3A3A3]">
                    {{
                      t('promotions.selector.itemsAvailable', { count: filteredProducts.length })
                    }}
                  </span>
                </div>

                <p
                  v-if="filteredProducts.length === 0"
                  class="py-10 text-center text-sm text-stone-400"
                >
                  {{ t('promotions.selector.noItems') }}
                </p>

                <label
                  v-for="product in filteredProducts"
                  :key="product.id"
                  class="flex items-center gap-4 border-b border-stone-50 py-3 dark:border-stone-800/60"
                  :class="
                    disabledProducts.has(product.id)
                      ? 'cursor-not-allowed opacity-50'
                      : 'cursor-pointer'
                  "
                >
                  <span
                    class="flex size-6 shrink-0 items-center justify-center rounded-md border transition-colors"
                    :class="
                      selectedProducts.has(product.id)
                        ? 'border-[#D2691E] bg-[#D2691E] text-white'
                        : 'border-stone-300 dark:border-stone-600'
                    "
                  >
                    <Check v-if="selectedProducts.has(product.id)" class="size-4" />
                  </span>
                  <input
                    type="checkbox"
                    class="sr-only"
                    :checked="selectedProducts.has(product.id)"
                    :disabled="disabledProducts.has(product.id)"
                    @change="toggleProduct(product.id)"
                  />
                  <div class="min-w-0 flex-1">
                    <p class="truncate text-sm font-bold text-[#1A1C1C] dark:text-stone-100">
                      {{ product.name }}
                    </p>
                    <p
                      v-if="disabledProducts.has(product.id)"
                      class="text-[11px] font-bold uppercase tracking-wide text-amber-600 dark:text-amber-500"
                    >
                      {{ t('promotions.selector.inOtherPromotion') }}
                    </p>
                    <p v-else class="text-xs font-medium text-[#A3A3A3]">
                      {{ product.category?.name }}
                    </p>
                  </div>
                  <span class="shrink-0 text-sm font-bold text-[#D2691E]">
                    {{ formatPrice(product.price) }}
                  </span>
                </label>
              </template>

              <!-- Categories list -->
              <template v-else>
                <p
                  v-if="filteredCategories.length === 0"
                  class="py-10 text-center text-sm text-stone-400"
                >
                  {{ t('promotions.selector.noCategories') }}
                </p>

                <label
                  v-for="category in filteredCategories"
                  :key="category.id"
                  class="flex items-center gap-4 border-b border-stone-50 py-3.5 dark:border-stone-800/60"
                  :class="
                    disabledCategories.has(category.id)
                      ? 'cursor-not-allowed opacity-50'
                      : 'cursor-pointer'
                  "
                >
                  <span
                    class="flex size-6 shrink-0 items-center justify-center rounded-md border transition-colors"
                    :class="
                      selectedCategories.has(category.id)
                        ? 'border-[#D2691E] bg-[#D2691E] text-white'
                        : 'border-stone-300 dark:border-stone-600'
                    "
                  >
                    <Check v-if="selectedCategories.has(category.id)" class="size-4" />
                  </span>
                  <input
                    type="checkbox"
                    class="sr-only"
                    :checked="selectedCategories.has(category.id)"
                    :disabled="disabledCategories.has(category.id)"
                    @change="toggleCategory(category.id)"
                  />
                  <div class="min-w-0 flex-1">
                    <p class="text-sm font-bold text-[#1A1C1C] dark:text-stone-100">
                      {{ category.name }}
                    </p>
                    <p
                      v-if="disabledCategories.has(category.id)"
                      class="text-[11px] font-bold uppercase tracking-wide text-amber-600 dark:text-amber-500"
                    >
                      {{ t('promotions.selector.inOtherPromotion') }}
                    </p>
                  </div>
                </label>
              </template>
            </div>

            <!-- Footer -->
            <div
              class="flex items-center justify-between border-t border-stone-100 px-8 py-5 dark:border-stone-800"
            >
              <p class="text-sm font-bold text-[#D2691E]">
                {{ t('promotions.selector.selectedCount', { count: totalSelected }) }}
                <span
                  v-if="selectedProductsCount > 0 && selectedCategoriesCount > 0"
                  class="text-xs font-medium text-[#A3A3A3]"
                >
                  ({{
                    t('promotions.selector.breakdown', {
                      items: selectedProductsCount,
                      categories: selectedCategoriesCount,
                    })
                  }})
                </span>
              </p>
              <div class="flex items-center gap-3">
                <Button variant="outline" class="rounded-xl px-6" @click="emit('close')">
                  {{ t('common.cancel') }}
                </Button>
                <Button
                  class="rounded-xl bg-[#D2691E] px-6 font-bold text-white hover:bg-[#B35919]"
                  @click="confirm"
                >
                  {{ t('promotions.selector.addSelected') }}
                </Button>
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
