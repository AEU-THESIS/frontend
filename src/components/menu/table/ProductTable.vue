<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Pencil, Eye, Trash2 } from 'lucide-vue-next'
import {
  SwitchRoot,
  SwitchThumb,
  DropdownMenuRoot,
  DropdownMenuTrigger,
  DropdownMenuPortal,
  DropdownMenuContent,
  DropdownMenuItem,
} from 'reka-ui'
import type { ProductTableItem } from '@/types/product.types'
import type { DataTableHeader } from '@/types/table.types'
import AppTooltip from '@/components/common/AppTooltip.vue'
import { DataTable } from '@/components/ui/table'

const { t } = useI18n()

// ── Props ────────────────────────────────────────────────────────────────────
interface Props {
  /** Current page of products returned by the backend */
  products?: ProductTableItem[]
  /** Total record count from backend (e.g. response.meta.total) */
  total?: number
  page?: number
  /** Items per page — should match your backend's page_size */
  pageSize?: number
  /** Set to true while the API call is in-flight */
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  products: () => [],
  total: 0,
  page: 1,
  pageSize: 5,
  loading: false,
})

// ── Emits ────────────────────────────────────────────────────────────────────
// Left untyped on purpose: `ProductManagement` types its `toggle-available` /
// `edit-product` handlers as `Product`, while the rows it feeds in are
// `ProductTableItem`. Declaring payload types here would break that view.
const emit = defineEmits([
  /**
   * Fired whenever the page changes.
   * Parent should call the API with the new page number.
   * @param {number} page  1-based page number
   */
  'page-change',
  'toggle-available',
  'edit-product',
  'view-product',
  'delete-product',
])

// ── Headers ──────────────────────────────────────────────────────────────────
// Every cell is rendered through a `cell:<key>` slot, so `key` here is only an
// identity for the column — `actions` has no matching field on the row.
const headers = computed<DataTableHeader<ProductTableItem>[]>(() => [
  {
    key: 'name',
    header: t('menuManagement.productTable.tableHeaders.itemName'),
    minWidth: '220px',
    sortable: true,
  },
  {
    key: 'category',
    header: t('menuManagement.productTable.tableHeaders.category'),
    sortable: true,
  },
  {
    key: 'price',
    header: t('menuManagement.productTable.tableHeaders.price'),
    sortable: true,
    // Cells hold a formatted "$12.50" — compare the number behind it.
    sortAccessor: row => Number(String(row.price).replace(/[^0-9.-]/g, '')),
  },
  { key: 'isAvailable', header: t('menuManagement.productTable.tableHeaders.onSale') },
  {
    key: 'actions',
    header: t('menuManagement.productTable.tableHeaders.actions'),
    align: 'center',
    headerClass: 'min-w-max',
  },
])

// The backend owns paging, so the table runs controlled: it renders the page it
// is handed and reports the page the user asked for. Sorting stays local
// (`client-sort`) — the API cannot order rows, so it re-orders the page shown.
const paginationConfig = computed(() => ({
  page: props.page,
  pageSize: props.pageSize,
  showPageSizeSelector: false,
}))

const paginationSummary = (range: { from: number; to: number; total: number }) =>
  t('menuManagement.productTable.pagination.showing', range)

// ── Handlers ──────────────────────────────────────────────────────────────────
const handlePageChange = (page: number) => emit('page-change', page)
const handleToggleAvailable = (item: ProductTableItem) => emit('toggle-available', item)
const handleEditProduct = (item: ProductTableItem) => emit('edit-product', item)
const handleViewProduct = (id: number) => emit('view-product', id)
const handleDeleteProduct = (item: ProductTableItem) => {
  if (item.cannotDelete) return
  emit('delete-product', item)
}

/** Why deletion is blocked, or '' when the product can be deleted (no tooltip). */
const deleteBlockedReason = (item: ProductTableItem) =>
  item.cannotDelete ? t('menuManagement.productTable.dropdownMenu.deleteDisabledTooltip') : ''

// ── Helpers ───────────────────────────────────────────────────────────────────
function categoryBadgeClass(category: string) {
  const map: Record<string, string> = {
    Food: 'bg-amber-100 dark:bg-amber-950/30 text-amber-700 dark:text-amber-500',
    Beverage: 'bg-blue-100 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400',
    Dessert: 'bg-pink-100 dark:bg-pink-950/30 text-pink-700 dark:text-pink-400',
    Snack: 'bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-400',
  }
  return map[category] ?? 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400'
}
</script>

<template>
  <DataTable
    :headers="headers"
    :data="props.products"
    :total-count="props.total"
    :loading="props.loading"
    client-sort
    :pagination="paginationConfig"
    :summary-formatter="paginationSummary"
    :empty-title="t('menuManagement.productTable.emptyState.title')"
    :empty-description="t('menuManagement.productTable.emptyState.description')"
    @page-change="handlePageChange"
  >
    <!-- Item Details -->
    <template #[`cell:name`]="{ row }">
      <div class="flex items-center gap-2 md:gap-4">
        <div
          class="w-9 h-9 md:w-12 md:h-12 rounded-lg bg-stone-100 dark:bg-stone-800 overflow-hidden shrink-0"
        >
          <img :src="row.image" :alt="row.name" class="w-full h-full object-cover" />
        </div>
        <div class="min-w-0">
          <p class="text-sm md:text-[16px] font-bold text-stone-900 dark:text-stone-100 truncate">
            {{ row.name }}
          </p>
          <p class="hidden md:block text-xs text-stone-400 dark:text-stone-500">
            {{ t('menuManagement.productTable.skuLabel') }} {{ row.sku }}
          </p>
        </div>
      </div>
    </template>

    <!-- Category -->
    <template #[`cell:category`]="{ row }">
      <span
        :class="categoryBadgeClass(row.category)"
        class="px-2.5 py-1 text-xs font-bold rounded-md"
      >
        {{ row.category }}
      </span>
    </template>

    <!-- On Sale Toggle -->
    <template #[`cell:isAvailable`]="{ row }">
      <SwitchRoot
        :model-value="row.isAvailable"
        :aria-label="t('menuManagement.productTable.tableHeaders.onSale')"
        class="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full outline-none focus:ring-2 focus:ring-[#D2691E]/30 transition-colors duration-200 data-[state=checked]:bg-[#D2691E] data-[state=unchecked]:bg-zinc-200 dark:data-[state=unchecked]:bg-stone-600"
        @click.stop="handleToggleAvailable(row)"
      >
        <SwitchThumb
          class="pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform duration-200 mt-[2px] data-[state=checked]:translate-x-[22px] data-[state=unchecked]:translate-x-[2px]"
        />
      </SwitchRoot>
    </template>

    <!-- Actions -->
    <template #[`cell:actions`]="{ row }">
      <div class="flex justify-center items-center">
        <DropdownMenuRoot>
          <DropdownMenuTrigger
            class="material-symbols-outlined transition-opacity cursor-pointer hover:text-[#974400] focus:outline-none"
            @click.stop
          >
            more_vert
          </DropdownMenuTrigger>

          <DropdownMenuPortal>
            <DropdownMenuContent
              class="z-50 min-w-[140px] bg-white dark:bg-stone-800 rounded-lg shadow-lg border border-[#edddd5] dark:border-stone-800 p-1 animate-in fade-in-0 zoom-in-95"
              :side-offset="4"
              align="end"
            >
              <DropdownMenuItem
                class="flex items-center gap-2 px-3 py-2 text-sm rounded-md cursor-pointer text-gray-700 dark:text-stone-300 hover:bg-[#fdf4ef] dark:hover:bg-stone-700 hover:text-[#974400] focus:outline-none focus:bg-[#fdf4ef] dark:focus:bg-stone-700 focus:text-[#974400] transition-colors select-none"
                @click.stop="handleEditProduct(row)"
              >
                <Pencil class="size-4 shrink-0" />
                <span>{{ t('menuManagement.productTable.dropdownMenu.edit') }}</span>
              </DropdownMenuItem>

              <DropdownMenuItem
                class="flex items-center gap-2 px-3 py-2 text-sm rounded-md cursor-pointer text-gray-700 dark:text-stone-300 hover:bg-[#fdf4ef] dark:hover:bg-stone-700 hover:text-[#974400] focus:outline-none focus:bg-[#fdf4ef] dark:focus:bg-stone-700 focus:text-[#974400] transition-colors select-none"
                @click.stop="handleViewProduct(row.id)"
              >
                <Eye class="size-4 shrink-0" />
                <span>{{ t('menuManagement.productTable.dropdownMenu.view') }}</span>
              </DropdownMenuItem>

              <!-- Disabled for products already used in an order -->
              <AppTooltip :content="deleteBlockedReason(row)" side="left">
                <span class="block">
                  <DropdownMenuItem
                    :disabled="!!row.cannotDelete"
                    :aria-label="deleteBlockedReason(row) || undefined"
                    class="flex items-center gap-2 px-3 py-2 text-sm rounded-md cursor-pointer text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 focus:outline-none focus:bg-red-50 dark:focus:bg-red-950/30 transition-colors select-none data-[disabled]:cursor-not-allowed data-[disabled]:opacity-40 data-[disabled]:hover:bg-transparent dark:data-[disabled]:hover:bg-transparent"
                    @click.stop="handleDeleteProduct(row)"
                  >
                    <Trash2 class="size-4 shrink-0" />
                    <span>{{ t('menuManagement.productTable.dropdownMenu.delete') }}</span>
                  </DropdownMenuItem>
                </span>
              </AppTooltip>
            </DropdownMenuContent>
          </DropdownMenuPortal>
        </DropdownMenuRoot>
      </div>
    </template>
  </DataTable>
</template>
