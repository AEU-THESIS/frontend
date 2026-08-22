<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'
import {
  Megaphone,
  Ticket,
  CalendarClock,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  LoaderCircle,
} from 'lucide-vue-next'
import { Card } from '@/components/ui/card'
import FilterPanel from '@/components/common/FilterPanel.vue'
import { AppInput } from '@/components/ui/input'
import { usePromotionStore } from '@/store/usePromotionStore'
import { getCategories, getProducts } from '@/api/product'
import { getPromotions } from '@/api/promotion'
import type { Category, Product } from '@/types/product.types'
import type { DiscountType, Promotion, PromotionPayload } from '@/types/promotion.types'
import PromotionStatCard from '@/components/promotions/PromotionStatCard.vue'
import PromotionFormModal from '@/components/promotions/PromotionFormModal.vue'
import { getErrorMessage } from '@/utils/error'

const { t } = useI18n()
const store = usePromotionStore()

const currencySymbol = '$'
const categories = ref<Category[]>([])
const products = ref<Product[]>([])
// Every promotion in the shop (not just the current page) so we can tell which
// items/categories are already claimed by another promotion.
const allPromotions = ref<Promotion[]>([])

const isFormOpen = ref(false)
const editing = ref<Promotion | null>(null)
const isSubmitting = ref(false)
const searchInput = ref('')

const loadClaims = async () => {
  try {
    // 100 is the backend's max page size; ample for a single café's promotions.
    const res = await getPromotions({ page: 1, limit: 100 })
    allPromotions.value = res.data
  } catch {
    allPromotions.value = []
  }
}

// Product/category ids locked by OTHER promotions (excludes the one being edited).
const claimedProductIds = computed(() =>
  allPromotions.value.filter(p => p.id !== editing.value?.id).flatMap(p => p.productIds)
)
const claimedCategoryIds = computed(() =>
  allPromotions.value.filter(p => p.id !== editing.value?.id).flatMap(p => p.categoryIds)
)

onMounted(async () => {
  // Core page data: only a genuine promotions-load failure should surface an error.
  // An empty list is a normal, successful state — not an error.
  try {
    await store.fetchPromotions()
  } catch {
    toast.error(t('promotions.toast.loadFailed'))
  }

  // Secondary data used only by the Add/Edit item selector. A failure here must
  // not block the page or be reported as a promotions-load failure.
  try {
    const [cats, prods] = await Promise.all([getCategories(), getProducts({}), loadClaims()])
    categories.value = cats
    products.value = prods.products
  } catch {
    // Non-fatal: the scope selector will simply have nothing to choose from.
  }
})

const applyFilters = () => store.setSearch(searchInput.value.trim())

const openAdd = () => {
  editing.value = null
  isFormOpen.value = true
}

const openEdit = (promotion: Promotion) => {
  editing.value = promotion
  isFormOpen.value = true
}

const closeForm = () => {
  isFormOpen.value = false
  editing.value = null
}

const handleSubmit = async (payload: PromotionPayload) => {
  isSubmitting.value = true
  try {
    if (editing.value) {
      await store.update(editing.value.id, payload)
      toast.success(t('promotions.toast.updated'))
    } else {
      await store.create(payload)
      toast.success(t('promotions.toast.created'))
    }
    await loadClaims()
    closeForm()
  } catch (err) {
    toast.error(getErrorMessage(err, t('promotions.toast.saveFailed')))
  } finally {
    isSubmitting.value = false
  }
}

const handleToggle = async (promotion: Promotion) => {
  try {
    await store.toggleStatus(promotion)
  } catch (err) {
    toast.error(getErrorMessage(err, t('promotions.toast.saveFailed')))
  }
}

const handleDelete = async (promotion: Promotion) => {
  if (!window.confirm(t('promotions.confirmDelete', { name: promotion.name }))) return
  try {
    await store.remove(promotion.id)
    await loadClaims()
    toast.success(t('promotions.toast.deleted'))
  } catch (err) {
    toast.error(getErrorMessage(err, t('promotions.toast.deleteFailed')))
  }
}

const typeLabel = (type: DiscountType) => t(`promotions.types.${type}`)

const typeBadgeClass = (type: DiscountType) => {
  switch (type) {
    case 'PERCENTAGE':
      return 'bg-[#E0F2FE] text-[#0369A1]'
    case 'FIXED_AMOUNT':
      return 'bg-[#F0FDF4] text-[#15803D]'
    case 'BOGO':
      return 'bg-[#FEF3C7] text-[#92400E]'
    default:
      return 'bg-[#F3F4F6] text-[#374151]'
  }
}

const valueLabel = (promotion: Promotion) => {
  switch (promotion.discountType) {
    case 'PERCENTAGE':
      return t('promotions.value.percentage', { value: promotion.discountValue })
    case 'FIXED_AMOUNT':
      return t('promotions.value.fixed', {
        value: `${currencySymbol}${promotion.discountValue.toFixed(2)}`,
      })
    case 'BOGO':
      return t('promotions.value.freeItem')
    default:
      return String(promotion.discountValue)
  }
}

const formatDate = (value: string | null) => {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  })
}

// Real lifecycle state of a promotion, combining the on/off flag with its date
// window. The toggle alone can't tell "enabled" from "actually running": a promo
// left on past its end date is expired (and no longer applies on the POS).
type PromotionState = 'inactive' | 'scheduled' | 'expired' | 'active'

// Compare by calendar day (promotions carry date-only start/end).
const todayDateString = () => {
  const d = new Date()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

const promotionState = (promotion: Promotion): PromotionState => {
  if (!promotion.isActive) return 'inactive'
  const today = todayDateString()
  if (promotion.startDate && promotion.startDate.slice(0, 10) > today) return 'scheduled'
  if (promotion.endDate && promotion.endDate.slice(0, 10) < today) return 'expired'
  return 'active'
}

const stateBadgeClass = (state: PromotionState) => {
  switch (state) {
    case 'active':
      return 'bg-[#F0FDF4] text-[#15803D]'
    case 'scheduled':
      return 'bg-[#E0F2FE] text-[#0369A1]'
    case 'expired':
      return 'bg-[#FEF2F2] text-[#B91C1C]'
    default:
      return 'bg-[#F3F4F6] text-[#6B7280]'
  }
}

const pageStart = computed(() =>
  store.pagination.total === 0 ? 0 : (store.pagination.page - 1) * store.pagination.limit + 1
)
const pageEnd = computed(() =>
  Math.min(store.pagination.page * store.pagination.limit, store.pagination.total)
)
</script>

<template>
  <div class="flex h-full flex-col overflow-hidden bg-[#F9FAFB] font-body dark:bg-stone-900">
    <div class="custom-scrollbar flex-1 overflow-y-auto px-10 py-10">
      <div class="w-full space-y-8">
        <!-- Header -->
        <div>
          <h1 class="text-3xl font-bold text-[#1A1C1C] dark:text-stone-50">
            {{ t('promotions.title') }}
          </h1>
          <p class="mt-1 text-sm text-[#737373] dark:text-stone-400">
            {{ t('promotions.subtitle') }}
          </p>
        </div>

        <!-- Summary cards -->
        <div class="grid grid-cols-1 gap-6 md:grid-cols-3">
          <PromotionStatCard
            :label="t('promotions.stats.active')"
            :value="store.summary.activePromotions"
            :icon="Megaphone"
            bg-color-class="bg-[#FDF2F0]"
            icon-color-class="text-[#E26D5C]"
          />
          <PromotionStatCard
            :label="t('promotions.stats.redeemed')"
            :value="store.summary.totalRedeemed.toLocaleString()"
            :icon="Ticket"
            bg-color-class="bg-[#F1F5F9]"
            icon-color-class="text-[#334155]"
          />
          <PromotionStatCard
            :label="t('promotions.stats.upcoming')"
            :value="store.summary.upcomingOffers"
            :icon="CalendarClock"
            bg-color-class="bg-[#111827]"
            icon-color-class="text-white"
          />
        </div>

        <!-- Main card -->
        <Card
          class="gap-0 overflow-hidden rounded-2xl border border-transparent bg-white p-0 shadow-sm dark:border-stone-800 dark:bg-stone-900/50"
        >
          <!-- Filter -->
          <FilterPanel
            :show-apply="false"
            :show-clear="false"
            :add-label="t('promotions.addPromotion')"
            actions-class="col-span-6 lg:col-span-2"
            @add="openAdd"
          >
            <AppInput
              id="promotion-filter-search"
              v-model="searchInput"
              search-icon
              type="text"
              :label="t('common.search')"
              label-class="text-xs font-semibold uppercase tracking-wide text-[#1A1C1C]/50 dark:text-stone-400"
              container-class="col-span-6 lg:col-span-10"
              :placeholder="t('promotions.searchPlaceholder')"
              class="h-10 border-none bg-[#FAFAFA] pr-4 text-sm text-[#1A1C1C] shadow-none placeholder:text-stone-400 focus-visible:ring-2 focus-visible:ring-primary lg:w-100 dark:bg-stone-800 dark:text-stone-100 dark:placeholder:text-stone-500"
              @update:model-value="applyFilters"
            />
          </FilterPanel>

          <!-- Table -->
          <div class="overflow-x-auto">
            <table class="w-full text-left">
              <thead>
                <tr
                  class="border-b border-slate-50 text-[11px] font-bold uppercase tracking-wider text-[#A3A3A3] dark:border-stone-800"
                >
                  <th class="px-8 py-4">{{ t('promotions.table.name') }}</th>
                  <th class="px-8 py-4">{{ t('promotions.table.type') }}</th>
                  <th class="px-8 py-4">{{ t('promotions.table.value') }}</th>
                  <th class="px-8 py-4">{{ t('promotions.table.startDate') }}</th>
                  <th class="px-8 py-4">{{ t('promotions.table.endDate') }}</th>
                  <th class="px-8 py-4 text-center">{{ t('promotions.table.status') }}</th>
                  <th class="px-8 py-4 text-right">{{ t('promotions.table.actions') }}</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-50 dark:divide-stone-800">
                <tr v-if="store.isLoading">
                  <td colspan="7" class="px-8 py-20 text-center text-slate-400">
                    <LoaderCircle class="mx-auto mb-2 size-8 animate-spin text-primary/40" />
                    <p class="text-xs font-bold uppercase tracking-widest">
                      {{ t('promotions.loading') }}
                    </p>
                  </td>
                </tr>

                <tr v-else-if="store.promotions.length === 0">
                  <td colspan="7" class="px-8 py-20 text-center text-slate-300">
                    <p class="text-sm font-bold">{{ t('promotions.empty') }}</p>
                  </td>
                </tr>

                <tr
                  v-for="promotion in store.promotions"
                  :key="promotion.id"
                  class="group transition-colors hover:bg-slate-50/50 dark:hover:bg-stone-800/30"
                >
                  <td class="px-8 py-5">
                    <p class="text-[14px] font-bold text-[#1A1C1C] dark:text-stone-100">
                      {{ promotion.name }}
                    </p>
                    <p
                      v-if="promotion.code"
                      class="mt-0.5 text-[11px] font-bold uppercase text-[#A3A3A3]"
                    >
                      {{ t('promotions.table.code') }}: {{ promotion.code }}
                    </p>
                  </td>
                  <td class="px-8 py-5">
                    <span
                      class="inline-flex rounded-md px-3 py-1 text-[10px] font-bold uppercase tracking-wide"
                      :class="typeBadgeClass(promotion.discountType)"
                    >
                      {{ typeLabel(promotion.discountType) }}
                    </span>
                  </td>
                  <td class="px-8 py-5">
                    <span class="text-[14px] font-bold text-[#D2691E]">
                      {{ valueLabel(promotion) }}
                    </span>
                  </td>
                  <td class="px-8 py-5 text-[13px] font-medium text-[#737373] dark:text-stone-400">
                    {{ formatDate(promotion.startDate) }}
                  </td>
                  <td
                    class="px-8 py-5 text-[13px] font-medium"
                    :class="
                      promotionState(promotion) === 'expired'
                        ? 'font-bold text-[#B91C1C]'
                        : 'text-[#737373] dark:text-stone-400'
                    "
                  >
                    {{ formatDate(promotion.endDate) }}
                  </td>
                  <td class="px-8 py-5">
                    <div class="flex flex-col items-center gap-1.5">
                      <span
                        class="inline-flex rounded-md px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide"
                        :class="stateBadgeClass(promotionState(promotion))"
                      >
                        {{ t(`promotions.state.${promotionState(promotion)}`) }}
                      </span>
                      <button
                        type="button"
                        class="relative h-7 w-12 shrink-0 rounded-full transition-colors"
                        :class="
                          promotion.isActive ? 'bg-[#D2691E]' : 'bg-stone-300 dark:bg-stone-600'
                        "
                        role="switch"
                        :aria-checked="promotion.isActive"
                        :aria-label="t('promotions.table.status')"
                        @click="handleToggle(promotion)"
                      >
                        <span
                          class="absolute top-1 size-5 rounded-full bg-white transition-all"
                          :class="promotion.isActive ? 'left-6' : 'left-1'"
                        />
                      </button>
                    </div>
                  </td>
                  <td class="px-8 py-5 text-right">
                    <div class="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        class="size-8 text-slate-400 hover:bg-slate-100 dark:hover:bg-stone-800"
                        :aria-label="t('common.edit')"
                        @click="openEdit(promotion)"
                      >
                        <Pencil class="size-5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        class="size-8 text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50"
                        :aria-label="t('common.delete')"
                        @click="handleDelete(promotion)"
                      >
                        <Trash2 class="size-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Pagination -->
          <div
            class="flex flex-col items-center justify-between gap-4 border-t border-slate-50 p-8 dark:border-stone-800 md:flex-row"
          >
            <p class="text-sm font-bold text-slate-400">
              {{
                t('promotions.pagination', {
                  start: pageStart,
                  end: pageEnd,
                  total: store.pagination.total,
                })
              }}
            </p>

            <div class="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                class="size-10 border-slate-100 bg-white text-slate-400 hover:bg-slate-50 dark:border-stone-700 dark:bg-stone-800"
                :disabled="store.pagination.page === 1"
                @click="store.setPage(store.pagination.page - 1)"
              >
                <ChevronLeft class="size-5" />
              </Button>

              <Button
                v-for="p in store.pagination.totalPages"
                :key="p"
                variant="outline"
                class="size-10 rounded-lg font-bold"
                :class="
                  store.pagination.page === p
                    ? 'bg-[#D2691E] text-white hover:bg-[#B35919]'
                    : 'bg-white text-[#737373] dark:bg-stone-800 dark:text-stone-300'
                "
                @click="store.setPage(p)"
              >
                {{ p }}
              </Button>

              <Button
                variant="outline"
                size="icon"
                class="size-10 border-slate-100 bg-white text-slate-400 hover:bg-slate-50 dark:border-stone-700 dark:bg-stone-800"
                :disabled="store.pagination.page === store.pagination.totalPages"
                @click="store.setPage(store.pagination.page + 1)"
              >
                <ChevronRight class="size-5" />
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>

    <PromotionFormModal
      :is-open="isFormOpen"
      :editing="editing"
      :categories="categories"
      :products="products"
      :claimed-category-ids="claimedCategoryIds"
      :claimed-product-ids="claimedProductIds"
      :is-submitting="isSubmitting"
      :currency-symbol="currencySymbol"
      @close="closeForm"
      @submit="handleSubmit"
    />
  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 5px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #e5e7eb;
  border-radius: 10px;
}

table {
  border-spacing: 0;
}
</style>
