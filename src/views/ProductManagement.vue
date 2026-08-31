<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'
import { ref, reactive, onMounted, computed, onUnmounted } from 'vue'
import { useProductStore } from '@/store/useProductStore'
import { OPTIONS_SET_TYPE } from '@/constants/product'
import type {
  Product,
  ProductFilters,
  ProductOptionSet,
  ProductTableItem,
} from '@/types/product.types'
import NoImage from '@/assets/no-image.jpg'
import AddProductForm from '@/components/menu/AddProductForm.vue'
import ProductTable from '@/components/menu/table/ProductTable.vue'
import { Card } from '@/components/ui/card'
import { AppInput } from '@/components/ui/input'
import FilterPanel from '@/components/common/FilterPanel.vue'
import AppSelect from '@/components/ui/select/AppSelect.vue'
import AppDialog from '@/components/common/AppDialog.vue'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import ProductDetail from '@/components/menu/ProductDetail.vue'
import { getImageUrl } from '@/utils/image'
import { getErrorMessage } from '@/utils/error'
const dialogRef = ref<InstanceType<typeof AppDialog>>()

const PAGE_SIZE = 10

const { t } = useI18n()
const productStore = useProductStore()

const statusFilterOptions = computed(() => [
  { value: 'active', label: t('menuManagement.statusOptions.active') },
  { value: 'not-active', label: t('menuManagement.statusOptions.inactive') },
])

const categoryFilterOptions = computed(() =>
  productStore.categories.map(category => ({ value: category.name, label: category.name }))
)

const hasActiveFilters = computed(
  () => filters.name.trim() !== '' || filters.category !== 'all' || filters.status !== 'all'
)

const productId = ref<number | null>(null)
const isDetailDialogOpen = ref(false)
const isAddDialogOpen = ref(false)
const isFilterOpen = ref(false)
const isDeleteDialogOpen = ref(false)
const editingProduct = ref<Product | null>(null)
const productPendingDelete = ref<ProductTableItem | null>(null)

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
    cannotDelete: item.cannotDelete, // used in an order → delete is blocked
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

const handleDeleteProduct = (item: ProductTableItem) => {
  productPendingDelete.value = item
  isDeleteDialogOpen.value = true
}

const confirmDeleteProduct = async () => {
  const item = productPendingDelete.value
  if (!item) return

  try {
    await productStore.deleteProduct(item.id)
    toast.success(t('menuManagement.messages.deleteSuccess', { name: item.name }))

    // Step back a page when the last row of the current page was removed.
    const currentPage = queryParams.paginationParams?.page ?? 1
    const nextPage =
      productStore.products.length === 0 && currentPage > 1 ? currentPage - 1 : currentPage
    await fetchProducts(nextPage)
  } catch (error) {
    // The API rejects products that already appear in orders — show that reason.
    toast.error(getErrorMessage(error, t('menuManagement.messages.deleteError')))
  } finally {
    isDeleteDialogOpen.value = false
    productPendingDelete.value = null
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
    <div class="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
      <button
        class="flex h-10 shrink-0 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90"
        @click="openAddDialog()"
      >
        <span class="material-symbols-outlined text-[18px]">add</span>
        {{ t('menuManagement.newItem') }}
      </button>
    </div>

    <Card
      class="gap-0 overflow-hidden rounded-xl border-none bg-white p-0 text-[#1A1C1C] shadow-sm dark:border dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100"
    >
      <!-- Filter -->
      <FilterPanel
        :has-active-filters="hasActiveFilters"
        @submit="applyFilters"
        @clear="clearFilters"
      >
        <AppInput
          id="filter-item-name"
          v-model="filters.name"
          search-icon
          type="text"
          :label="t('menuManagement.filterPanel.itemName')"
          label-class="text-xs font-semibold uppercase tracking-wide text-[#1A1C1C]/50 dark:text-stone-400"
          container-class="col-span-4 lg:col-span-5"
          :placeholder="t('menuManagement.filterPanel.search')"
          class="h-10 border-none bg-[#FAFAFA] pr-4 text-sm text-[#1A1C1C] shadow-none placeholder:text-stone-400 focus-visible:ring-2 focus-visible:ring-primary dark:bg-stone-800 dark:text-stone-100 dark:placeholder:text-stone-500"
        />

        <app-select
          v-model="filters.category"
          :options="categoryFilterOptions"
          :label="t('menuManagement.filterPanel.category')"
          :all-option-label="t('menuManagement.filterPanel.allCategories')"
          class="w-full col-span-4 lg:col-span-2"
        />

        <app-select
          v-model="filters.status"
          :options="statusFilterOptions"
          :label="t('menuManagement.filterPanel.status')"
          :all-option-label="t('menuManagement.filterPanel.allStatuses')"
          class="w-full col-span-4 lg:col-span-2"
        />
      </FilterPanel>

      <!-- PRODUCT TABLE  -->
      <ProductTable
        :products="filteredProducts"
        :total="productStore.totalProducts"
        :page-size="PAGE_SIZE"
        :page="queryParams.paginationParams?.page ?? 1"
        @page-change="fetchProducts"
        @toggle-available="handleToggleAvailable"
        @edit-product="handleEditProduct"
        @delete-product="handleDeleteProduct"
        @view-product="handleViewProduct"
      />
    </Card>
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

  <!-- ============ DELETE CONFIRMATION ============= -->
  <confirm-dialog
    v-model:open="isDeleteDialogOpen"
    :title="t('menuManagement.dialog.deleteTitle')"
    :message="
      t('menuManagement.messages.deleteConfirm', { name: productPendingDelete?.name ?? '' })
    "
    :confirm-label="t('common.delete')"
    :loading="productStore.isDeletingProduct"
    variant="danger"
    @confirm="confirmDeleteProduct"
  />
</template>

<style scoped>
.modal-overlay {
  background-color: rgba(26, 28, 28, 0.4);
  backdrop-filter: blur(4px);
}
</style>
