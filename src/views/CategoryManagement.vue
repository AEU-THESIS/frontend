<script setup lang="ts">
import { ref, reactive, onMounted, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import AppDialog from '@/components/common/AppDialog.vue'
import AddCategoryForm from '@/components/category/AddCategoryForm.vue'
import { Pencil, Eye } from 'lucide-vue-next'
import {
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
import { useProductStore } from '@/store/useProductStore'
import { toast } from 'vue-sonner'
import type { Category } from '@/types/product.types'

const PAGE_SIZE = 6
const productStore = useProductStore()
const { t } = useI18n()

const currentPage = ref(1)
const filters = reactive({
  name: '',
  category: 'all',
  price: 6.5,
  status: 'all',
})
const isAddDialogOpen = ref(false)
const isDeleteDialogOpen = ref(false)
const selectedCategory = ref<Category | null>(null)
const isDeleting = ref(false)

const filteredCategories = computed(() => {
  const search = filters.name.trim().toLowerCase()
  if (!search) return productStore.categories
  return productStore.categories.filter(cat => cat.name.toLowerCase().includes(search))
})

const paginatedCategories = computed(() => {
  const start = (currentPage.value - 1) * PAGE_SIZE
  return filteredCategories.value.slice(start, start + PAGE_SIZE)
})

const showingFrom = computed(() =>
  filteredCategories.value.length === 0 ? 0 : (currentPage.value - 1) * PAGE_SIZE + 1
)

const showingTo = computed(() =>
  Math.min(currentPage.value * PAGE_SIZE, filteredCategories.value.length)
)

const fillerRows = computed(() => Math.max(0, PAGE_SIZE - paginatedCategories.value.length))

watch(
  () => filters.name,
  () => {
    currentPage.value = 1
  }
)

watch(filteredCategories, items => {
  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE))
  if (currentPage.value > totalPages) {
    currentPage.value = totalPages
  }
})

// On Mounted
onMounted(async () => {
  try {
    await productStore.fetchCategories()
  } catch {
    console.error('Failed to fetch categories or products')
  }
})

const openEditDialog = (category: Category) => {
  selectedCategory.value = category
  isAddDialogOpen.value = true
}

// const openDeleteConfirmation = (category: Category) => {
//   selectedCategory.value = category
//   isDeleteDialogOpen.value = true
// }

const handleDelete = async () => {
  if (!selectedCategory.value) return

  isDeleting.value = true
  try {
    await productStore.deleteCategory(selectedCategory.value.id)
    toast.success(t('category.toastSuccess'))
    isDeleteDialogOpen.value = false
    selectedCategory.value = null
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : t('toastError')
    toast.error(message)
  } finally {
    isDeleting.value = false
  }
}

const handleDialogClose = () => {
  isAddDialogOpen.value = false
  selectedCategory.value = null
}

const handleSuccess = () => {
  isAddDialogOpen.value = false
  selectedCategory.value = null
}

const openAddDialog = () => {
  selectedCategory.value = null
  isAddDialogOpen.value = true
}
</script>

<template>
  <!-- Main Content (Canvas) -->
  <main class="p-8 mb-10 overflow-y-auto">
    <div class="flex justify-between items-center mb-8">
      <div class="w-auto">
        <h1 class="font-headline-lg text-[24px] font-bold text-on-background mb-[4px]">
          {{ $t('category.categoryManagement') }}
        </h1>
        <p class="text-[14px]">{{ $t('category.categorySubtitle') }}</p>
      </div>
      <div class="flex gap-2 w-auto">
        <button
          class="px-4 py-2 bg-stone-900 text-white rounded-lg text-[16px] font-bold flex items-center gap-2"
          @click="openAddDialog()"
        >
          <span class="material-symbols-outlined text-[18px]">add</span>
          {{ $t('category.newCategory') }}
        </button>
      </div>
    </div>

    <!-- Toolbar -->
    <div class="flex justify-between items-center mb-8">
      <div class="flex-[2] min-w-[240px] flex flex-col gap-1">
        <div class="relative">
          <span
            class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 dark:text-stone-500 text-[20px]"
            >search</span
          >
          <input
            v-model="filters.name"
            class="w-100 pl-10 pr-4 py-2 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg text-sm focus:ring-2 focus:ring-primary transition-all shadow-sm"
            :placeholder="$t('category.searchPlaceholder')"
            type="text"
          />
        </div>
      </div>
    </div>

    <!-- Table  -->
    <div
      class="bg-white dark:bg-stone-900 rounded-xl shadow-sm border border-stone-100 dark:border-stone-800 overflow-hidden"
    >
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse min-w-[640px]">
          <thead>
            <tr
              class="bg-stone-50 dark:bg-stone-800 border-b border-stone-100 dark:border-stone-800"
            >
              <th
                class="px-3 md:px-6 py-3 md:py-4 text-[11px] text-stone-500 dark:text-stone-400 whitespace-nowrap"
              >
                {{ $t('category.categoryName') }}
              </th>
              <th
                class="px-3 md:px-6 py-3 md:py-4 text-[11px] text-stone-500 dark:text-stone-400 whitespace-nowrap"
              >
                {{ $t('category.itemsCount') }}
              </th>
              <th
                class="px-3 md:px-6 py-3 md:py-4 text-[11px] text-stone-500 dark:text-stone-400 whitespace-nowrap"
              >
                {{ $t('category.status') }}
              </th>
              <th
                class="px-3 md:px-6 py-3 md:py-4 text-[11px] text-stone-500 dark:text-stone-400 text-center whitespace-nowrap min-w-max"
              >
                {{ $t('category.actions') }}
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-stone-50 dark:divide-stone-800">
            <!-- Existing Rows -->
            <template v-if="paginatedCategories.length > 0">
              <tr
                v-for="item in paginatedCategories"
                :key="item.id"
                class="hover:bg-stone-50/50 dark:hover:bg-stone-800/50 transition-colors"
              >
                <!-- Item Details -->
                <td class="px-3 md:px-6 py-3 md:py-4">
                  <div class="flex items-center gap-2 md:gap-4">
                    <div class="min-w-0">
                      <p
                        class="text-sm md:text-[16px] font-bold text-stone-900 dark:text-stone-100 truncate"
                      >
                        {{ item.name }}
                      </p>
                    </div>
                  </div>
                </td>

                <!-- Item Count -->
                <td class="px-3 md:px-6 py-3 md:py-4">
                  <span class="px-2.5 py-1 text-xs font-bold rounded-md">
                    {{ item._count?.products ?? 0 }} {{ $t('category.items') }}
                  </span>
                </td>

                <!-- Status -->
                <td class="px-3 md:px-6 py-3 md:py-4">
                  <p class="text-sm text-stone-900 dark:text-stone-100">
                    {{ item.isActive ? $t('category.active') : $t('category.inactive') }}
                  </p>
                </td>

                <!-- Actions -->
                <td class="px-3 md:px-6 py-3 md:py-4 text-right">
                  <div class="flex justify-center items-center">
                    <div class="relative">
                      <!-- Dropdown Menu -->
                      <DropdownMenuRoot>
                        <DropdownMenuTrigger
                          class="material-symbols-outlined transition-opacity cursor-pointer hover:text-[#974400] focus:outline-none"
                          @click.stop
                        >
                          more_vert
                        </DropdownMenuTrigger>

                        <DropdownMenuPortal>
                          <DropdownMenuContent
                            class="z-50 min-w-[140px] bg-white dark:bg-stone-900 rounded-lg shadow-lg border border-[#edddd5] dark:border-stone-800 p-1 animate-in fade-in-0 zoom-in-95"
                            :side-offset="4"
                            align="end"
                          >
                            <!-- Edit -->
                            <DropdownMenuItem
                              class="flex items-center gap-2 px-3 py-2 text-sm rounded-md cursor-pointer text-gray-700 dark:text-stone-300 hover:bg-[#fdf4ef] hover:text-[#974400] focus:outline-none focus:bg-[#fdf4ef] focus:text-[#974400] transition-colors select-none"
                              @click.stop="openEditDialog(item)"
                            >
                              <Pencil class="size-4 shrink-0" />
                              <span>{{ $t('category.edit') }}</span>
                            </DropdownMenuItem>

                            <!-- View -->
                            <DropdownMenuItem
                              class="flex items-center gap-2 px-3 py-2 text-sm rounded-md cursor-pointer text-gray-700 dark:text-stone-300 hover:bg-[#fdf4ef] hover:text-[#974400] focus:outline-none focus:bg-[#fdf4ef] focus:text-[#974400] transition-colors select-none"
                              @click.stop="() => {}"
                            >
                              <Eye class="size-4 shrink-0" />
                              <span>{{ $t('category.view') }}</span>
                            </DropdownMenuItem>

                            <!-- TODO -->
                            <!-- <DropdownMenuItem
                              class="flex items-center gap-2 px-3 py-2 text-sm rounded-md cursor-pointer text-red-500 hover:bg-red-50 focus:outline-none focus:bg-red-50 transition-colors select-none"
                              @click.stop="openDeleteConfirmation(item)">
                              <Trash2 class="size-4 shrink-0" />
                              <span>{{ $t('category.delete') }}</span>
                            </DropdownMenuItem> -->
                          </DropdownMenuContent>
                        </DropdownMenuPortal>
                      </DropdownMenuRoot>
                    </div>
                  </div>
                </td>
              </tr>
            </template>

            <template v-if="paginatedCategories.length > 0">
              <tr v-for="n in fillerRows" :key="`filler-${n}`" class="h-[62px]">
                <td colspan="4" />
              </tr>
            </template>

            <!-- Empty State -->
            <tr v-else>
              <td colspan="5" class="px-6 py-16 text-center">
                <div class="flex flex-col items-center gap-3">
                  <div
                    class="w-16 h-16 rounded-full bg-stone-100 dark:bg-stone-800 flex items-center justify-center"
                  >
                    <span
                      class="material-symbols-outlined text-[32px] text-stone-400 dark:text-stone-500"
                      >inventory_2</span
                    >
                  </div>
                  <div>
                    <p class="text-sm font-bold text-stone-700 dark:text-stone-300">
                      {{ $t('category.noCategoriesFound') }}
                    </p>
                    <p class="text-xs text-stone-400 dark:text-stone-500 mt-1">
                      {{ $t('category.noCategoriesSubtitle') }}
                    </p>
                  </div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div
        class="px-3 md:px-6 py-3 md:py-4 bg-stone-50/30 dark:bg-stone-800/50 flex flex-col md:flex-row gap-2 md:gap-0 justify-between items-center"
      >
        <span class="text-xs text-stone-500 dark:text-stone-400 text-[14px]">
          {{
            $t('category.showing', {
              from: showingFrom,
              to: showingTo,
              total: filteredCategories.length,
            })
          }}
        </span>

        <PaginationRoot
          v-model:page="currentPage"
          :total="filteredCategories.length"
          :items-per-page="PAGE_SIZE"
          :sibling-count="1"
          show-edges
        >
          <PaginationList v-slot="{ items }" class="flex items-center gap-1">
            <PaginationFirst
              class="w-8 h-8 flex items-center justify-center rounded-lg bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300 hover:border-stone-300 dark:hover:border-stone-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <span class="material-symbols-outlined text-[18px]">first_page</span>
            </PaginationFirst>

            <PaginationPrev
              class="w-8 h-8 flex items-center justify-center rounded-lg bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300 hover:border-stone-300 dark:hover:border-stone-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
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
                class="w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold transition-colors data-[selected]:bg-[#D2691E] data-[selected]:text-white data-[selected]:border-transparent bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 hover:border-stone-300 dark:hover:border-stone-600"
              >
                {{ pageItem.value }}
              </PaginationListItem>
            </template>

            <PaginationNext
              class="w-8 h-8 flex items-center justify-center rounded-lg bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300 hover:border-stone-300 dark:hover:border-stone-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <span class="material-symbols-outlined text-[18px]">chevron_right</span>
            </PaginationNext>

            <PaginationLast
              class="w-8 h-8 flex items-center justify-center rounded-lg bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300 hover:border-stone-300 dark:hover:border-stone-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <span class="material-symbols-outlined text-[18px]">last_page</span>
            </PaginationLast>
          </PaginationList>
        </PaginationRoot>
      </div>
    </div>
  </main>

  <!-- Add/Edit Category Dialog -->
  <app-dialog
    v-model:open="isAddDialogOpen"
    :title="selectedCategory ? $t('category.editCategory') : $t('category.addCategory')"
    :description="selectedCategory ? $t('category.editDescription') : $t('category.addDescription')"
  >
    <add-category-form
      :category="selectedCategory ?? undefined"
      @success="handleSuccess"
      @close="handleDialogClose"
    />
    <template #footer>
      <div class="hidden"></div>
    </template>
  </app-dialog>

  <!-- Delete Confirmation Dialog -->
  <app-dialog
    v-model:open="isDeleteDialogOpen"
    :title="$t('category.deleteCategory')"
    :description="$t('category.deleteConfirmation')"
  >
    <div class="w-full space-y-4">
      <p v-if="selectedCategory" class="text-sm text-stone-600 dark:text-stone-300">
        {{ $t('category.deleteWarning') }} <strong>{{ selectedCategory.name }}</strong>
      </p>
    </div>
    <template #footer>
      <div class="flex gap-3 justify-end">
        <button
          type="button"
          class="px-5 py-2.5 rounded-xl text-sm font-semibold text-stone-500 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
          @click="isDeleteDialogOpen = false"
        >
          {{ $t('category.cancel') }}
        </button>
        <button
          type="button"
          :disabled="isDeleting"
          class="px-6 py-2.5 rounded-xl text-sm font-semibold bg-red-600 text-white hover:bg-red-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          @click="handleDelete"
        >
          <span
            v-if="isDeleting"
            class="animate-spin inline-block size-4 border-2 border-current border-t-transparent rounded-full"
          />
          {{ $t('category.delete') }}
        </button>
      </div>
    </template>
  </app-dialog>
</template>

<style scoped>
.modal-overlay {
  background-color: rgba(26, 28, 28, 0.4);
  backdrop-filter: blur(4px);
}

/* ── Empty State ─────────────────────────────────────── */
.empty-state-container {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 48px 16px;
}

.empty-state-card {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
  width: 100%;
  max-width: 480px;
  background: white;
  border: 1px solid #ddc1b3;
  border-radius: 20px;
  padding: 56px 40px 48px;
  box-shadow:
    0 4px 24px rgba(194, 106, 26, 0.08),
    0 1px 4px rgba(0, 0, 0, 0.04);
  overflow: hidden;
  text-align: center;
}

/* Icon ring */
.empty-state-icon-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
}

.empty-state-icon-ring {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: linear-gradient(135deg, #fdf4ef 0%, #fde8d8 100%);
  border: 2px solid #ddc1b3;
  box-shadow: 0 0 0 8px rgba(221, 193, 179, 0.18);
  animation: pulse-ring 3s ease-in-out infinite;
}

.empty-state-icon {
  width: 36px;
  height: 36px;
  color: #c26a1a;
  stroke-width: 1.5;
}

@keyframes pulse-ring {
  0%,
  100% {
    box-shadow: 0 0 0 8px rgba(221, 193, 179, 0.18);
  }

  50% {
    box-shadow: 0 0 0 14px rgba(221, 193, 179, 0.08);
  }
}

/* Text */
.empty-state-text {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.empty-state-title {
  font-size: 20px;
  font-weight: 700;
  color: #1c1917;
  margin: 0;
}

.empty-state-description {
  font-size: 14px;
  color: #78716c;
  line-height: 1.6;
  margin: 0;
}

.empty-state-keyword {
  font-weight: 600;
  color: #c26a1a;
}

/* Actions */
.empty-state-actions {
  display: flex;
  gap: 12px;
}

.empty-state-cta {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 22px;
  background: #1c1917;
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition:
    background 0.18s,
    transform 0.15s;
}

.empty-state-cta:hover {
  background: #c26a1a;
  transform: translateY(-1px);
}

.empty-state-cta:active {
  transform: translateY(0);
}

.empty-state-clear {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 22px;
  background: white;
  color: #78716c;
  border: 1.5px solid #ddc1b3;
  border-radius: 10px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition:
    border-color 0.18s,
    color 0.18s,
    transform 0.15s;
}

.empty-state-clear:hover {
  border-color: #974400;
  color: #974400;
  transform: translateY(-1px);
}

/* Decorative dots */
.empty-state-dots {
  position: absolute;
  bottom: 16px;
  right: 20px;
  display: flex;
  align-items: flex-end;
  gap: 5px;
  opacity: 0.25;
}

.dot {
  display: block;
  border-radius: 50%;
  background: #c26a1a;
}

.dot-lg {
  width: 10px;
  height: 10px;
}

.dot-md {
  width: 7px;
  height: 7px;
}

.dot-sm {
  width: 5px;
  height: 5px;
}
</style>
