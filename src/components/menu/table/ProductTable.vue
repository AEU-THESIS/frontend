<script setup lang="ts">
import { ref, computed, watch, type PropType } from 'vue'
import { useI18n } from 'vue-i18n'
import { Pencil, Eye } from 'lucide-vue-next'
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
const fillerRows = computed(() =>
  props.loading || props.products.length === 0
    ? 0
    : Math.max(0, props.pageSize - props.products.length)
)

// ── Handlers ──────────────────────────────────────────────────────────────────
const handleToggleAvailable = (item: ProductTableItem) => emit('toggle-available', item)
const handleEditProduct = (item: ProductTableItem) => emit('edit-product', item)
const handleViewProduct = (item: ProductTableItem) => emit('view-product', item)
// const handleDeleteProduct = (item: ProductTableItem) => emit('delete-product', item)

// ── Helpers ───────────────────────────────────────────────────────────────────
function categoryBadgeClass(category: string) {
  const map: Record<string, string> = {
    Food: 'bg-amber-100 text-amber-700',
    Beverage: 'bg-blue-100  text-blue-700',
    Dessert: 'bg-pink-100  text-pink-700',
    Snack: 'bg-green-100 text-green-700',
  }
  return map[category] ?? 'bg-stone-100 text-stone-600'
}
</script>

<template>
  <div class="bg-white rounded-xl shadow-sm border border-stone-100 overflow-hidden">
    <!-- ── Table ─────────────────────────────────────────────────────────── -->
    <div class="overflow-x-auto">
      <table class="w-full text-left border-collapse min-w-[640px]">
        <!-- Head -->
        <thead>
          <tr class="bg-stone-50 border-b border-stone-100">
            <th class="px-3 md:px-6 py-3 md:py-4 text-[11px] text-stone-500 whitespace-nowrap">
              {{ t('menuManagement.productTable.tableHeaders.itemName') }}
            </th>
            <th class="px-3 md:px-6 py-3 md:py-4 text-[11px] text-stone-500 whitespace-nowrap">
              {{ t('menuManagement.productTable.tableHeaders.category') }}
            </th>
            <th class="px-3 md:px-6 py-3 md:py-4 text-[11px] text-stone-500 whitespace-nowrap">
              {{ t('menuManagement.productTable.tableHeaders.price') }}
            </th>
            <th class="px-3 md:px-6 py-3 md:py-4 text-[11px] text-stone-500 whitespace-nowrap">
              {{ t('menuManagement.productTable.tableHeaders.onSale') }}
            </th>
            <th
              class="px-3 md:px-6 py-3 md:py-4 text-[11px] text-stone-500 text-center whitespace-nowrap min-w-max"
            >
              {{ t('menuManagement.productTable.tableHeaders.actions') }}
            </th>
          </tr>
        </thead>

        <!-- Body -->
        <tbody class="divide-y divide-stone-50">
          <!-- Loading skeleton -->
          <template v-if="loading">
            <tr v-for="n in pageSize" :key="n" class="animate-pulse">
              <td class="px-3 md:px-6 py-3 md:py-4">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-lg bg-stone-100 shrink-0" />
                  <div class="space-y-1.5">
                    <div class="h-3 w-32 rounded bg-stone-100" />
                    <div class="h-2.5 w-20 rounded bg-stone-100" />
                  </div>
                </div>
              </td>
              <td class="px-3 md:px-6 py-3 md:py-4">
                <div class="h-5 w-16 rounded-md bg-stone-100" />
              </td>
              <td class="px-3 md:px-6 py-3 md:py-4">
                <div class="h-3 w-12 rounded bg-stone-100" />
              </td>
              <td class="px-3 md:px-6 py-3 md:py-4">
                <div class="h-6 w-11 rounded-full bg-stone-100" />
              </td>
              <td class="px-3 md:px-6 py-3 md:py-4">
                <div class="h-5 w-5 rounded bg-stone-100 mx-auto" />
              </td>
            </tr>
          </template>

          <!-- Rows -->
          <template v-else-if="products.length > 0">
            <tr
              v-for="item in products"
              :key="item.sku"
              class="hover:bg-stone-50/50 transition-colors"
            >
              <!-- Item Details -->
              <td class="px-3 md:px-6 py-3 md:py-4">
                <div class="flex items-center gap-2 md:gap-4">
                  <div
                    class="w-9 h-9 md:w-12 md:h-12 rounded-lg bg-stone-100 overflow-hidden shrink-0"
                  >
                    <img :src="item.image" :alt="item.name" class="w-full h-full object-cover" />
                  </div>
                  <div class="min-w-0">
                    <p class="text-sm md:text-[16px] font-bold text-stone-900 truncate">
                      {{ item.name }}
                    </p>
                    <p class="hidden md:block text-xs text-stone-400">
                      {{ t('menuManagement.productTable.skuLabel') }} {{ item.sku }}
                    </p>
                  </div>
                </div>
              </td>

              <!-- Category -->
              <td class="px-3 md:px-6 py-3 md:py-4">
                <span
                  :class="categoryBadgeClass(item.category)"
                  class="px-2.5 py-1 text-xs font-bold rounded-md"
                >
                  {{ item.category }}
                </span>
              </td>

              <!-- Price -->
              <td class="px-3 md:px-6 py-3 md:py-4">
                <p class="text-sm text-stone-900">{{ item.price }}</p>
              </td>

              <!-- On Sale Toggle -->
              <td class="px-3 pl-5 py-5">
                <SwitchRoot
                  :model-value="item.isAvailable"
                  class="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full outline-none focus:ring-2 focus:ring-[#D2691E]/30 transition-colors duration-200 data-[state=checked]:bg-[#D2691E] data-[state=unchecked]:bg-zinc-200"
                  @click.stop="handleToggleAvailable(item)"
                >
                  <SwitchThumb
                    class="pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform duration-200 mt-[2px] data-[state=checked]:translate-x-[22px] data-[state=unchecked]:translate-x-[2px]"
                  />
                </SwitchRoot>
              </td>

              <!-- Actions -->
              <td class="px-3 md:px-6 py-3 md:py-4 text-right">
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
                        class="z-50 min-w-[140px] bg-white rounded-lg shadow-lg border border-[#edddd5] p-1 animate-in fade-in-0 zoom-in-95"
                        :side-offset="4"
                        align="end"
                      >
                        <DropdownMenuItem
                          class="flex items-center gap-2 px-3 py-2 text-sm rounded-md cursor-pointer text-gray-700 hover:bg-[#fdf4ef] hover:text-[#974400] focus:outline-none focus:bg-[#fdf4ef] focus:text-[#974400] transition-colors select-none"
                          @click.stop="handleEditProduct(item)"
                        >
                          <Pencil class="size-4 shrink-0" />
                          <span>{{ t('menuManagement.productTable.dropdownMenu.edit') }}</span>
                        </DropdownMenuItem>

                        <DropdownMenuItem
                          class="flex items-center gap-2 px-3 py-2 text-sm rounded-md cursor-pointer text-gray-700 hover:bg-[#fdf4ef] hover:text-[#974400] focus:outline-none focus:bg-[#fdf4ef] focus:text-[#974400] transition-colors select-none"
                          @click.stop="handleViewProduct(item.id)"
                        >
                          <Eye class="size-4 shrink-0" />
                          <span>{{ t('menuManagement.productTable.dropdownMenu.view') }}</span>
                        </DropdownMenuItem>

                        <!-- TODO:  -->
                        <!-- <DropdownMenuItem
                          class="flex items-center gap-2 px-3 py-2 text-sm rounded-md cursor-pointer text-red-500 hover:bg-red-50 focus:outline-none focus:bg-red-50 transition-colors select-none"
                          @click.stop="handleDeleteProduct(item)">
                          <Trash2 class="size-4 shrink-0" />
                          <span>{{ t('menuManagement.productTable.dropdownMenu.delete') }}</span>
                        </DropdownMenuItem> -->
                      </DropdownMenuContent>
                    </DropdownMenuPortal>
                  </DropdownMenuRoot>
                </div>
              </td>
            </tr>
          </template>

          <!-- Filler rows — keeps tbody height fixed when products < pageSize -->
          <template v-if="!loading && products.length > 0">
            <tr v-for="n in fillerRows" :key="`filler-${n}`" class="h-[73px]">
              <td colspan="5" />
            </tr>
          </template>

          <!-- Empty State -->
          <tr v-else>
            <td colspan="5" class="px-6 py-16 text-center">
              <div class="flex flex-col items-center gap-3">
                <div class="w-16 h-16 rounded-full bg-stone-100 flex items-center justify-center">
                  <span class="material-symbols-outlined text-[32px] text-stone-400"
                    >inventory_2</span
                  >
                </div>
                <div>
                  <p class="text-sm font-bold text-stone-700">
                    {{ t('menuManagement.productTable.emptyState.title') }}
                  </p>
                  <p class="text-xs text-stone-400 mt-1">
                    {{ t('menuManagement.productTable.emptyState.description') }}
                  </p>
                </div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- ── Pagination footer ───────────────────────────────────────────────── -->
    <div
      class="px-3 md:px-6 py-3 md:py-4 bg-stone-50/30 flex flex-col md:flex-row gap-2 md:gap-0 justify-between items-center"
    >
      <!-- Showing X–Y of Z -->
      <span class="text-xs text-stone-500 text-[14px]">
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
            class="w-8 h-8 flex items-center justify-center rounded-lg bg-white border border-stone-200 text-stone-400 hover:text-stone-600 hover:border-stone-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <span class="material-symbols-outlined text-[18px]">first_page</span>
          </PaginationFirst>

          <PaginationPrev
            :title="t('menuManagement.productTable.pagination.previousPage')"
            class="w-8 h-8 flex items-center justify-center rounded-lg bg-white border border-stone-200 text-stone-400 hover:text-stone-600 hover:border-stone-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <span class="material-symbols-outlined text-[18px]">chevron_left</span>
          </PaginationPrev>

          <template v-for="(pageItem, index) in items" :key="index">
            <PaginationEllipsis
              v-if="pageItem.type === 'ellipsis'"
              :index="index"
              class="w-8 h-8 flex items-center justify-center text-stone-400 text-xs select-none"
            >
              &#8230;
            </PaginationEllipsis>

            <PaginationListItem
              v-else
              :value="pageItem.value"
              class="w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold transition-colors data-[selected]:bg-[#D2691E] data-[selected]:text-white data-[selected]:border-transparent bg-white border border-stone-200 text-stone-600 hover:bg-stone-100 hover:border-stone-300"
            >
              {{ pageItem.value }}
            </PaginationListItem>
          </template>

          <PaginationNext
            :title="t('menuManagement.productTable.pagination.nextPage')"
            class="w-8 h-8 flex items-center justify-center rounded-lg bg-white border border-stone-200 text-stone-400 hover:text-stone-600 hover:border-stone-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <span class="material-symbols-outlined text-[18px]">chevron_right</span>
          </PaginationNext>

          <PaginationLast
            :title="t('menuManagement.productTable.pagination.lastPage')"
            class="w-8 h-8 flex items-center justify-center rounded-lg bg-white border border-stone-200 text-stone-400 hover:text-stone-600 hover:border-stone-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <span class="material-symbols-outlined text-[18px]">last_page</span>
          </PaginationLast>
        </PaginationList>
      </PaginationRoot>
    </div>
  </div>
</template>
