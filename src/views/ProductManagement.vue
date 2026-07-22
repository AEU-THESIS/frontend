<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { ref, reactive, onMounted, computed, onUnmounted } from 'vue'
import {
  DropdownMenuRoot,
  DropdownMenuTrigger,
  DropdownMenuPortal,
  DropdownMenuContent,
} from 'reka-ui'
import { useProductStore } from '@/store/useProductStore'
import { OPTIONS_SET_TYPE } from '@/constants/product'
import type { Product, ProductFilters, ProductOptionSet } from '@/types/product.types'
import NoImage from '@/assets/no-image.jpg'
import AddProductForm from '@/components/menu/AddProductForm.vue'
import ProductTable from '@/components/menu/table/ProductTable.vue'
import AppSelect from '@/components/ui/select/AppSelect.vue'
import AppDialog from '@/components/common/AppDialog.vue'
import ProductDetail from '@/components/menu/ProductDetail.vue'
import { getImageUrl } from '@/utils/image'
const dialogRef = ref<InstanceType<typeof AppDialog>>()

const PAGE_SIZE = 5

const { t } = useI18n()
const productStore = useProductStore()

const statusFilterOptions = computed(() => [
  { value: 'active', label: t('menuManagement.statusOptions.active') },
  { value: 'not-active', label: t('menuManagement.statusOptions.inactive') },
])

const productId = ref<number | null>(null)
const isDetailDialogOpen = ref(false)
const isAddDialogOpen = ref(false)
const isFilterOpen = ref(false)
const editingProduct = ref<Product | null>(null)

const filters = reactive({
  name: '',
  category: 'all',
  status: 'all',
  page: 1,
  pageSize: PAGE_SIZE,
})
const queryParams = reactive<ProductFilters>({
  name: '',
  categoryId: undefined,
  isAvailable: undefined,
  paginationParams: { page: 1, pageSize: PAGE_SIZE },
})

// ------- Computed ---------
const filteredProducts = computed(() => {
  return productStore.products.map(item => ({
    id: item.id,
    name: item.name,
    sku: buildSku(item.id),
    category: item.category.name,
    price: resolvePrice(item),
    isAvailable: item.isAvailable, // has customisation options → on sale
    image: item.imageUrl ? getImageUrl(item.imageUrl) : NoImage,
    optionSets: item.optionSets, // keep original for the detail dialog
  }))
})

// ---------- Functions -------------
function resolvePrice(item: Product): string {
  const sizeOptionSet = item.optionSets.find(
    (os: ProductOptionSet) => os.optionSet.type === OPTIONS_SET_TYPE.SIZE
  )

  if (sizeOptionSet) {
    const firstElement = sizeOptionSet.optionSet.elements[0]

    if (firstElement) {
      return formatPrice(firstElement.priceModifier)
    }
  }

  return formatPrice(item.price || 0)
}

function formatPrice(price: number): string {
  return `$${price.toFixed(2)}`
}

function buildSku(id: number): string {
  const prefix = 'test'
  return `${prefix}-${String(id).padStart(3, '0')}`
}

const openAddDialog = () => {
  isAddDialogOpen.value = true
}

const handleEditProduct = (item: Product) => {
  editingProduct.value = item
  isAddDialogOpen.value = true
}

const handleViewProduct = async (id: number) => {
  isDetailDialogOpen.value = true
  productId.value = id
}

const handleDeleteProduct = async (item: Product) => {
  const confirmMessage = t('menuManagement.messages.deleteConfirm', { name: item.name })
  if (confirm(confirmMessage)) {
    try {
      await productStore.deleteProduct(item.id)
      // Product will be removed from the list automatically via store
    } catch (error) {
      console.error(t('menuManagement.messages.deleteError'), error)
    }
  }
}

const handleToggleAvailable = async (item: Product) => {
  try {
    await productStore.updateProduct(item.id, { isAvailable: !item.isAvailable })
    // Toggle the availability and send the inverted value
  } catch (error) {
    console.error(t('menuManagement.messages.toggleError'), error)
  }
}

const closeFilter = () => {
  isFilterOpen.value = false
}

const applyFilters = async () => {
  queryParams.name = filters.name.trim()

  // Apply category filter
  queryParams.categoryId =
    filters.category !== 'all'
      ? productStore.categories.find(c => c.name === filters.category)?.id
      : undefined

  // Apply availability filter
  queryParams.isAvailable =
    filters.status === 'active' ? true : filters.status === 'not-active' ? false : undefined

  await fetchProducts()

  // closeFilter()
}

const clearFilters = async () => {
  filters.name = ''
  filters.category = 'all'
  filters.status = 'all'

  queryParams.name = ''
  queryParams.categoryId = undefined
  queryParams.isAvailable = undefined

  await fetchProducts()
}

const fetchProducts = async (page: number = 1) => {
  queryParams.paginationParams = { page, pageSize: PAGE_SIZE }
  await productStore.fetchProductsManagement({ ...queryParams })
}

const handleDialogClose = () => {
  isAddDialogOpen.value = false
  editingProduct.value = null
}
const handleSuccess = async () => {
  await fetchProducts()
  editingProduct.value = null
  isAddDialogOpen.value = false
  dialogRef.value?.close()
}
const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && isFilterOpen.value) closeFilter()
}
// ------ On Mounted ----
onMounted(async () => {
  await productStore.fetchCategories()
  await fetchProducts()
})

document.addEventListener('keydown', handleKeydown)
onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <!-- Main Content (Canvas) -->
  <main class="p-8 mb-10 overflow-y-auto">
    <!-- Toolbar -->
    <div class="flex justify-between items-center mb-8">
      <div class="flex gap-3 items-center">
        <div class="w-auto">
          <h1 class="font-headline-lg text-[24px] font-bold text-on-background mb-[4px]">
            {{ t('menuManagement.title') }}
          </h1>
          <p class="text-[14px] truncate">{{ t('menuManagement.subtitle') }}</p>
        </div>
      </div>
      <div class="flex gap-2 w-auto">
        <DropdownMenuRoot>
          <DropdownMenuTrigger
            class="transition-opacity cursor-pointer hover:text-[#974400] focus:outline-none"
            @click.stop
          >
            <button
              class="px-4 py-2 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 rounded-lg text-[16px] font-bold text-sm flex items-center gap-2 shadow-sm relative z-[20]"
            >
              <span class="material-symbols-outlined text-[18px]">tune</span>
              <span class="max-sm:sr-only">{{ t('menuManagement.filters') }}</span>
              <span class="w-2 h-2 bg-primary rounded-full"></span>
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuPortal class="bg-black">
            <DropdownMenuContent
              class="z-50 min-w-[140px] bg-white dark:bg-stone-800 rounded-lg shadow-lg border border-[#edddd5] dark:border-stone-800 p-1 animate-in fade-in-0 zoom-in-95"
              :side-offset="4"
              align="end"
            >
              <div
                class="bg-white dark:bg-stone-900 w-full border border-stone-100 dark:border-stone-800 rounded-xl mb-8 shadow-sm p-6"
              >
                <div class="flex flex-col gap-6">
                  <!-- Filter Inputs Row -->
                  <div class="flex flex-wrap gap-4 items-end">
                    <!-- Search Field -->
                    <div class="flex-[2] min-w-[240px] flex flex-col gap-1">
                      <label
                        class="text-xs font-semibold uppercase tracking-wide text-[#1A1C1C]/50 dark:text-stone-400"
                        >{{ t('menuManagement.filterPanel.itemName') }}</label
                      >
                      <div class="relative">
                        <span
                          class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 dark:text-stone-500 text-[20px]"
                          >search</span
                        >
                        <input
                          v-model="filters.name"
                          class="w-full pl-10 pr-4 py-2.5 bg-stone-50 dark:bg-stone-800 border-stone-100 dark:border-stone-800 rounded-lg text-sm dark:text-stone-100 focus:ring-2 focus:ring-primary focus:bg-white dark:focus:bg-stone-900 transition-all placeholder:text-stone-400 dark:placeholder:text-stone-500"
                          :placeholder="t('menuManagement.filterPanel.search')"
                          type="text"
                        />
                      </div>
                    </div>
                    <!-- Category Dropdown -->
                    <div class="flex-1 min-w-[140px] flex flex-col gap-1">
                      <app-select
                        v-model="filters.category"
                        :options="[
                          ...productStore.categories.map(c => ({ value: c.name, label: c.name })),
                        ]"
                        :label="t('menuManagement.filterPanel.category')"
                        class="w-full"
                      />
                    </div>
                    <!-- Status Dropdown -->
                    <div class="flex-1 min-w-[140px] flex flex-col gap-1">
                      <app-select
                        v-model="filters.status"
                        :options="statusFilterOptions"
                        :label="t('menuManagement.filterPanel.status')"
                        class="w-full"
                      />
                    </div>
                  </div>
                  <!-- Actions Row -->
                  <div
                    class="flex justify-end items-center gap-4 pt-4 border-t border-stone-50 dark:border-stone-800"
                  >
                    <button
                      class="px-4 py-2.5 text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200 text-sm font-bold transition-colors"
                      @click="clearFilters"
                    >
                      {{ t('menuManagement.filterPanel.clearAll') }}
                    </button>
                    <button
                      class="px-8 py-2.5 bg-primary text-white rounded-lg text-sm font-bold shadow-sm hover:opacity-90 transition-opacity"
                      @click="applyFilters"
                    >
                      {{ t('menuManagement.filterPanel.applyFilters') }}
                    </button>
                  </div>
                </div>
              </div>
            </DropdownMenuContent>
          </DropdownMenuPortal>
        </DropdownMenuRoot>
        <button
          class="px-4 py-2 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 rounded-lg text-[16px] font-bold flex items-center gap-2"
          @click="openAddDialog()"
        >
          <span class="material-symbols-outlined text-[18px]">add</span>
          {{ t('menuManagement.newItem') }}
        </button>
      </div>
    </div>

    <!-- Updated Filter Bar Layout (Horizontal) -->
    <div
      v-if="isFilterOpen"
      id="filter-popover"
      class="bg-white dark:bg-stone-900 border border-stone-100 dark:border-stone-800 rounded-xl mb-8 shadow-sm p-6"
    >
      <div class="flex flex-col gap-6">
        <!-- Filter Inputs Row -->
        <div class="flex flex-wrap gap-4 items-end">
          <!-- Search Field -->
          <div class="flex-[2] min-w-[240px] flex flex-col gap-1">
            <label
              class="text-xs font-semibold uppercase tracking-wide text-[#1A1C1C]/50 dark:text-stone-400"
              >{{ t('menuManagement.filterPanel.itemName') }}</label
            >
            <div class="relative">
              <span
                class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 dark:text-stone-500 text-[20px]"
                >search</span
              >
              <input
                v-model="filters.name"
                class="w-full pl-10 pr-4 py-2.5 bg-stone-50 dark:bg-stone-800 border-stone-100 dark:border-stone-800 rounded-lg text-sm dark:text-stone-100 focus:ring-2 focus:ring-primary focus:bg-white dark:focus:bg-stone-900 transition-all placeholder:text-stone-400 dark:placeholder:text-stone-500"
                :placeholder="t('menuManagement.filterPanel.search')"
                type="text"
              />
            </div>
          </div>
          <!-- Category Dropdown -->
          <div class="flex-1 min-w-[140px] flex flex-col gap-1">
            <app-select
              v-model="filters.category"
              :options="[...productStore.categories.map(c => ({ value: c.name, label: c.name }))]"
              :label="t('menuManagement.filterPanel.category')"
              class="w-full"
            />
          </div>
          <!-- Status Dropdown -->
          <div class="flex-1 min-w-[140px] flex flex-col gap-1">
            <app-select
              v-model="filters.status"
              :options="statusFilterOptions"
              :label="t('menuManagement.filterPanel.status')"
              class="w-full"
            />
          </div>
        </div>
        <!-- Actions Row -->
        <div
          class="flex justify-end items-center gap-4 pt-4 border-t border-stone-50 dark:border-stone-800"
        >
          <button
            class="px-4 py-2.5 text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200 text-sm font-bold transition-colors"
            @click="clearFilters"
          >
            {{ t('menuManagement.filterPanel.clearAll') }}
          </button>
          <button
            class="px-8 py-2.5 bg-primary text-white rounded-lg text-sm font-bold shadow-sm hover:opacity-90 transition-opacity"
            @click="applyFilters"
          >
            {{ t('menuManagement.filterPanel.applyFilters') }}
          </button>
        </div>
      </div>
    </div>

    <!-- PRODUCT TABLE  -->
    <ProductTable
      :products="filteredProducts"
      :total="productStore.totalProducts"
      :items-per-page="5"
      :page="queryParams.paginationParams?.page ?? 1"
      @page-change="fetchProducts"
      @toggle-available="handleToggleAvailable"
      @edit-product="handleEditProduct"
      @delete-product="handleDeleteProduct"
      @view-product="handleViewProduct"
    />
  </main>

  <app-dialog
    v-model:open="isAddDialogOpen"
    :title="
      editingProduct ? t('menuManagement.dialog.editTitle') : t('menuManagement.dialog.addTitle')
    "
    :description="
      editingProduct
        ? t('menuManagement.dialog.editDescription')
        : t('menuManagement.dialog.addDescription')
    "
    @close="handleDialogClose"
  >
    <add-product-form
      :editing-product="editingProduct"
      @close="handleDialogClose"
      @success="handleSuccess"
    />
    <template #footer>
      <div class="hidden"></div>
    </template>
  </app-dialog>

  <!-- ============ DETAIL DIALOG ============= -->
  <app-dialog
    v-model:open="isDetailDialogOpen"
    :title="t('menuManagement.dialog.detailsTitle')"
    :description="t('menuManagement.dialog.detailsDescription')"
  >
    <ProductDetail :product-id="productId" />
  </app-dialog>
</template>

<style scoped>
.modal-overlay {
  background-color: rgba(26, 28, 28, 0.4);
  backdrop-filter: blur(4px);
}
</style>
