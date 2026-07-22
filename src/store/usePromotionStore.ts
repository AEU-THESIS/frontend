import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getPromotions, createPromotion, updatePromotion, deletePromotion } from '@/api/promotion'
import type {
  Promotion,
  PromotionSummary,
  PromotionPagination,
  PromotionPayload,
} from '@/types/promotion.types'

const emptySummary: PromotionSummary = {
  activePromotions: 0,
  totalRedeemed: 0,
  upcomingOffers: 0,
}

const emptyPagination: PromotionPagination = {
  total: 0,
  page: 1,
  limit: 10,
  totalPages: 1,
}

export const usePromotionStore = defineStore('promotion', () => {
  const promotions = ref<Promotion[]>([])
  const summary = ref<PromotionSummary>({ ...emptySummary })
  const pagination = ref<PromotionPagination>({ ...emptyPagination })
  const isLoading = ref(false)
  const lastError = ref<string | null>(null)

  const page = ref(1)
  const searchQuery = ref('')
  let searchDebounce: ReturnType<typeof setTimeout> | null = null

  const fetchPromotions = async () => {
    isLoading.value = true
    lastError.value = null
    try {
      const result = await getPromotions({
        page: page.value,
        limit: pagination.value.limit,
        search: searchQuery.value || undefined,
      })
      promotions.value = result.data
      pagination.value = result.pagination
      summary.value = result.summary
    } catch (err) {
      const error = err as Error
      lastError.value = error.message || 'Failed to load promotions'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  const setPage = async (next: number) => {
    if (next < 1 || next > pagination.value.totalPages) return
    page.value = next
    await fetchPromotions()
  }

  const setSearch = (query: string) => {
    searchQuery.value = query
    if (searchDebounce) clearTimeout(searchDebounce)
    searchDebounce = setTimeout(() => {
      page.value = 1
      void fetchPromotions()
    }, 300)
  }

  const create = async (payload: PromotionPayload) => {
    await createPromotion(payload)
    // Show newest first and refresh summary counts.
    page.value = 1
    await fetchPromotions()
  }

  const update = async (id: number, payload: Partial<PromotionPayload>) => {
    await updatePromotion(id, payload)
    await fetchPromotions()
  }

  const toggleStatus = async (promotion: Promotion) => {
    // Optimistic flip; revert on failure.
    const previous = promotion.isActive
    promotion.isActive = !previous
    try {
      await updatePromotion(promotion.id, { isActive: promotion.isActive })
      // Keep the active-count card in sync.
      summary.value.activePromotions += promotion.isActive ? 1 : -1
    } catch (err) {
      promotion.isActive = previous
      throw err
    }
  }

  const remove = async (id: number) => {
    await deletePromotion(id)
    // If we deleted the last row on a page, step back a page.
    if (promotions.value.length === 1 && page.value > 1) {
      page.value -= 1
    }
    await fetchPromotions()
  }

  return {
    promotions,
    summary,
    pagination,
    isLoading,
    lastError,
    page,
    searchQuery,
    fetchPromotions,
    setPage,
    setSearch,
    create,
    update,
    toggleStatus,
    remove,
  }
})
