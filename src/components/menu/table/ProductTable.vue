<script setup lang="ts">
import { ref, computed, watch, type PropType } from 'vue'
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
  PaginationRoot,
  PaginationList,
  PaginationListItem,
  PaginationFirst,
  PaginationPrev,
  PaginationNext,
  PaginationLast,
  PaginationEllipsis,
} from 'reka-ui'
import type { ProductTableItem } from '@/types/product.types'
import AppTooltip from '@/components/common/AppTooltip.vue'
import {
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

const { t } = useI18n()

// ── Props ────────────────────────────────────────────────────────────────────
const props = defineProps({
  /** Current page of products returned by the backend */
  products: {
    type: Array as PropType<ProductTableItem[]>,
    default: () => [] as ProductTableItem[],
  },
  /** Total record count from backend (e.g. response.meta.total) */
  total: {
    type: Number,
    default: 0,
  },
  page: {
    type: Number,
    default: 1,
  },
  /** Items per page — should match your backend's page_size */
  pageSize: {
    type: Number,
    default: 5,
  },
  /** Set to true while the API call is in-flight */
  loading: {
    type: Boolean,
    default: false,
  },
})

// ── Emits ────────────────────────────────────────────────────────────────────
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

// ── Pagination state ──────────────────────────────────────────────────────────
const currentPage = ref(props.page)

watch(currentPage, page => {
  emit('page-change', page)
})
watch(
  () => props.page,
  newPage => {
    currentPage.value = newPage
  }
)

// ── Showing X–Y of Z ─────────────────────────────────────────────────────────
const showingFrom = computed(() =>
  props.total === 0 ? 0 : (currentPage.value - 1) * props.pageSize + 1
)
const showingTo = computed(() => Math.min(currentPage.value * props.pageSize, props.total))

// ── Pagination text ──────────────────────────────────────────────────────────
const paginationText = computed(() =>
  t('menuManagement.productTable.pagination.showing', {
    from: showingFrom.value,
    to: showingTo.value,
    total: props.total,
  })
)

// ── Filler rows — keeps tbody height fixed when products < pageSize ───────
// Only rendered alongside real rows, so no loading/empty guard is needed here.
const fillerRows = computed(() => Math.max(0, props.pageSize - props.products.length))

// ── Handlers ──────────────────────────────────────────────────────────────────
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
  <div
    class="bg-white dark:bg-stone-900 shadow-sm border border-stone-100 dark:border-stone-800 overflow-hidden"
  >
    <!-- ── Table ─────────────────────────────────────────────────────────── -->
    <Table class="min-w-[640px] text-left">
      <!-- Head -->
      <TableHeader>
        <TableRow
          class="bg-stone-50 border-stone-100 hover:bg-stone-50 dark:bg-stone-800 dark:border-stone-800 dark:hover:bg-stone-800"
        >
          <TableHead
            class="px-3 md:px-6 py-3 md:py-4 text-[11px] font-bold text-stone-500 dark:text-stone-400"
          >
            {{ t('menuManagement.productTable.tableHeaders.itemName') }}
          </TableHead>
          <TableHead
            class="px-3 md:px-6 py-3 md:py-4 text-[11px] font-bold text-stone-500 dark:text-stone-400"
          >
            {{ t('menuManagement.productTable.tableHeaders.category') }}
          </TableHead>
          <TableHead
            class="px-3 md:px-6 py-3 md:py-4 text-[11px] font-bold text-stone-500 dark:text-stone-400"
          >
            {{ t('menuManagement.productTable.tableHeaders.price') }}
          </TableHead>
          <TableHead
            class="px-3 md:px-6 py-3 md:py-4 text-[11px] font-bold text-stone-500 dark:text-stone-400"
          >
            {{ t('menuManagement.productTable.tableHeaders.onSale') }}
          </TableHead>
          <TableHead
            class="px-3 md:px-6 py-3 md:py-4 text-[11px] font-bold text-stone-500 dark:text-stone-400 text-center min-w-max"
          >
            {{ t('menuManagement.productTable.tableHeaders.actions') }}
          </TableHead>
        </TableRow>
      </TableHeader>

      <!-- Body -->
      <TableBody>
        <!-- Loading skeleton -->
        <template v-if="loading">
          <TableRow
            v-for="n in pageSize"
            :key="n"
            class="animate-pulse border-stone-50 hover:bg-transparent dark:border-stone-800"
          >
            <TableCell class="px-3 md:px-6 py-3 md:py-4">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-lg bg-stone-100 dark:bg-stone-800 shrink-0" />
                <div class="space-y-1.5">
                  <div class="h-3 w-32 rounded bg-stone-100 dark:bg-stone-800" />
                  <div class="h-2.5 w-20 rounded bg-stone-100 dark:bg-stone-800" />
                </div>
              </div>
            </TableCell>
            <TableCell class="px-3 md:px-6 py-3 md:py-4">
              <div class="h-5 w-16 rounded-md bg-stone-100 dark:bg-stone-800" />
            </TableCell>
            <TableCell class="px-3 md:px-6 py-3 md:py-4">
              <div class="h-3 w-12 rounded bg-stone-100 dark:bg-stone-800" />
            </TableCell>
            <TableCell class="px-3 md:px-6 py-3 md:py-4">
              <div class="h-6 w-11 rounded-full bg-stone-100 dark:bg-stone-800" />
            </TableCell>
            <TableCell class="px-3 md:px-6 py-3 md:py-4">
              <div class="h-5 w-5 rounded bg-stone-100 dark:bg-stone-800 mx-auto" />
            </TableCell>
          </TableRow>
        </template>

        <!-- Rows -->
        <template v-else-if="products.length > 0">
          <TableRow
            v-for="item in products"
            :key="item.sku"
            class="border-stone-50 hover:bg-stone-50/50 dark:border-stone-800 dark:hover:bg-stone-800/50"
          >
            <!-- Item Details -->
            <TableCell class="px-3 md:px-6 py-3 md:py-4">
              <div class="flex items-center gap-2 md:gap-4">
                <div
                  class="w-9 h-9 md:w-12 md:h-12 rounded-lg bg-stone-100 dark:bg-stone-800 overflow-hidden shrink-0"
                >
                  <img :src="item.image" :alt="item.name" class="w-full h-full object-cover" />
                </div>
                <div class="min-w-0">
                  <p
                    class="text-sm md:text-[16px] font-bold text-stone-900 dark:text-stone-100 truncate"
                  >
                    {{ item.name }}
                  </p>
                  <p class="hidden md:block text-xs text-stone-400 dark:text-stone-500">
                    {{ t('menuManagement.productTable.skuLabel') }} {{ item.sku }}
                  </p>
                </div>
              </div>
            </TableCell>

            <!-- Category -->
            <TableCell class="px-3 md:px-6 py-3 md:py-4">
              <span
                :class="categoryBadgeClass(item.category)"
                class="px-2.5 py-1 text-xs font-bold rounded-md"
              >
                {{ item.category }}
              </span>
            </TableCell>

            <!-- Price -->
            <TableCell class="px-3 md:px-6 py-3 md:py-4">
              <p class="text-sm text-stone-900 dark:text-stone-100">{{ item.price }}</p>
            </TableCell>

            <!-- On Sale Toggle -->
            <TableCell class="px-3 pl-5 py-5">
              <SwitchRoot
                :model-value="item.isAvailable"
                class="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full outline-none focus:ring-2 focus:ring-[#D2691E]/30 transition-colors duration-200 data-[state=checked]:bg-[#D2691E] data-[state=unchecked]:bg-zinc-200 dark:data-[state=unchecked]:bg-stone-600"
                @click.stop="handleToggleAvailable(item)"
              >
                <SwitchThumb
                  class="pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform duration-200 mt-[2px] data-[state=checked]:translate-x-[22px] data-[state=unchecked]:translate-x-[2px]"
                />
              </SwitchRoot>
            </TableCell>

            <!-- Actions -->
            <TableCell class="px-3 md:px-6 py-3 md:py-4 text-right">
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
                        @click.stop="handleEditProduct(item)"
                      >
                        <Pencil class="size-4 shrink-0" />
                        <span>{{ t('menuManagement.productTable.dropdownMenu.edit') }}</span>
                      </DropdownMenuItem>

                      <DropdownMenuItem
                        class="flex items-center gap-2 px-3 py-2 text-sm rounded-md cursor-pointer text-gray-700 dark:text-stone-300 hover:bg-[#fdf4ef] dark:hover:bg-stone-700 hover:text-[#974400] focus:outline-none focus:bg-[#fdf4ef] dark:focus:bg-stone-700 focus:text-[#974400] transition-colors select-none"
                        @click.stop="handleViewProduct(item.id)"
                      >
                        <Eye class="size-4 shrink-0" />
                        <span>{{ t('menuManagement.productTable.dropdownMenu.view') }}</span>
                      </DropdownMenuItem>

                      <!-- Disabled for products already used in an order -->
                      <AppTooltip :content="deleteBlockedReason(item)" side="left">
                        <span class="block">
                          <DropdownMenuItem
                            :disabled="!!item.cannotDelete"
                            :aria-label="deleteBlockedReason(item) || undefined"
                            class="flex items-center gap-2 px-3 py-2 text-sm rounded-md cursor-pointer text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 focus:outline-none focus:bg-red-50 dark:focus:bg-red-950/30 transition-colors select-none data-[disabled]:cursor-not-allowed data-[disabled]:opacity-40 data-[disabled]:hover:bg-transparent dark:data-[disabled]:hover:bg-transparent"
                            @click.stop="handleDeleteProduct(item)"
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
            </TableCell>
          </TableRow>

          <!-- Filler rows — keeps tbody height fixed when products < pageSize -->
          <TableRow
            v-for="n in fillerRows"
            :key="`filler-${n}`"
            class="h-[73px] border-stone-50 hover:bg-transparent dark:border-stone-800"
          >
            <TableCell colspan="5" />
          </TableRow>
        </template>

        <!-- Empty State -->
        <TableEmpty v-else :colspan="5" class="px-6 text-center">
          <div class="flex flex-col items-center gap-3">
            <div
              class="w-16 h-16 rounded-full bg-stone-100 dark:bg-stone-800 flex items-center justify-center"
            >
              <span class="material-symbols-outlined text-[32px] text-stone-400 dark:text-stone-500"
                >inventory_2</span
              >
            </div>
            <div>
              <p class="text-sm font-bold text-stone-700 dark:text-stone-300">
                {{ t('menuManagement.productTable.emptyState.title') }}
              </p>
              <p class="text-xs text-stone-400 dark:text-stone-500 mt-1">
                {{ t('menuManagement.productTable.emptyState.description') }}
              </p>
            </div>
          </div>
        </TableEmpty>
      </TableBody>
    </Table>

    <!-- ── Pagination footer ───────────────────────────────────────────────── -->
    <div
      class="px-3 md:px-6 py-3 md:py-4 bg-stone-50/30 dark:bg-stone-800/30 flex flex-col md:flex-row gap-2 md:gap-0 justify-between items-center"
    >
      <!-- Showing X–Y of Z -->
      <span class="text-xs text-stone-500 dark:text-stone-400 text-[14px]">
        {{ paginationText }}
      </span>

      <!-- Reka-UI Pagination -->
      <PaginationRoot
        v-model:page="currentPage"
        :total="total"
        :items-per-page="pageSize"
        :sibling-count="1"
        show-edges
      >
        <PaginationList v-slot="{ items }" class="flex items-center gap-1">
          <PaginationFirst
            :title="t('menuManagement.productTable.pagination.firstPage')"
            class="w-8 h-8 flex items-center justify-center rounded-lg bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300 hover:border-stone-300 dark:hover:border-stone-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <span class="material-symbols-outlined text-[18px]">first_page</span>
          </PaginationFirst>

          <PaginationPrev
            :title="t('menuManagement.productTable.pagination.previousPage')"
            class="w-8 h-8 flex items-center justify-center rounded-lg bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300 hover:border-stone-300 dark:hover:border-stone-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <span class="material-symbols-outlined text-[18px]">chevron_left</span>
          </PaginationPrev>

          <template v-for="(pageItem, index) in items" :key="index">
            <PaginationEllipsis
              v-if="pageItem.type === 'ellipsis'"
              :index="index"
              class="w-8 h-8 flex items-center justify-center text-stone-400 dark:text-stone-500 text-xs select-none"
            >
              &#8230;
            </PaginationEllipsis>

            <PaginationListItem
              v-else
              :value="pageItem.value"
              class="w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold transition-colors data-[selected]:bg-[#D2691E] data-[selected]:text-white data-[selected]:border-transparent bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-700 hover:border-stone-300 dark:hover:border-stone-600"
            >
              {{ pageItem.value }}
            </PaginationListItem>
          </template>

          <PaginationNext
            :title="t('menuManagement.productTable.pagination.nextPage')"
            class="w-8 h-8 flex items-center justify-center rounded-lg bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300 hover:border-stone-300 dark:hover:border-stone-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <span class="material-symbols-outlined text-[18px]">chevron_right</span>
          </PaginationNext>

          <PaginationLast
            :title="t('menuManagement.productTable.pagination.lastPage')"
            class="w-8 h-8 flex items-center justify-center rounded-lg bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300 hover:border-stone-300 dark:hover:border-stone-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <span class="material-symbols-outlined text-[18px]">last_page</span>
          </PaginationLast>
        </PaginationList>
      </PaginationRoot>
    </div>
  </div>
</template>
