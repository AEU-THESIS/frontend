import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import {
  adjustInventoryItem,
  createInventoryItem,
  deleteInventoryItem,
  getInventoryHistory,
  getInventoryItems,
  getInventoryValuation,
  updateInventoryItem,
  type InventoryItemFilters,
} from '@/api/inventory'
import type {
  InventoryAdjustmentPayload,
  InventoryHistoryEntry,
  InventoryHistoryQuery,
  InventoryHistoryResponse,
  InventoryItem,
  InventoryItemPayload,
  InventoryValuation,
} from '@/types/inventory.types'

export const useInventoryStore = defineStore('inventory', () => {
  const items = ref<InventoryItem[]>([])
  const valuation = ref<InventoryValuation>({ totalItems: 0, totalValue: 0 })
  const historyItems = ref<InventoryHistoryEntry[]>([])
  const historyPagination = ref<InventoryHistoryResponse['pagination']>({
    total: 0,
    page: 1,
    limit: 5,
    totalPages: 1,
  })
  const historyTotals = ref<InventoryHistoryResponse['totals']>({ totalIn: 0, totalOut: 0 })
  const isLoading = ref(false)
  const isHistoryLoading = ref(false)
  const isSaving = ref(false)

  // Whole-shop inventory value, independent of the list's active filters.
  const totalInventoryValue = computed(() => valuation.value.totalValue)

  const totalSupplies = computed(() => items.value.length)
  const inStockItems = computed(() => items.value.filter(item => item.status === 'in_stock'))
  const lowStockItems = computed(() => items.value.filter(item => item.status === 'low_stock'))
  const outOfStockItems = computed(() => items.value.filter(item => item.status === 'out_of_stock'))
  const stockHealthPercentage = computed(() => {
    if (totalSupplies.value === 0) return 0

    return Math.round((inStockItems.value.length / totalSupplies.value) * 100)
  })

  const setItem = (item: InventoryItem) => {
    const index = items.value.findIndex(current => current.id === item.id)
    if (index === -1) {
      items.value.unshift(item)
      return
    }

    items.value[index] = item
  }

  let currentRequestId = 0

  const fetchItems = async (filters: InventoryItemFilters = {}) => {
    isLoading.value = true
    currentRequestId += 1
    const requestId = currentRequestId
    try {
      const result = await getInventoryItems(filters)
      if (requestId === currentRequestId) {
        items.value = result
      }
    } finally {
      if (requestId === currentRequestId) {
        isLoading.value = false
      }
    }
  }

  const fetchValuation = async () => {
    valuation.value = await getInventoryValuation()
  }

  const fetchHistory = async (id: number, params: InventoryHistoryQuery = {}) => {
    isHistoryLoading.value = true
    try {
      const res = await getInventoryHistory(id, params)
      historyItems.value = res.items
      historyPagination.value = res.pagination
      historyTotals.value = res.totals
    } finally {
      isHistoryLoading.value = false
    }
  }

  // Keep the whole-shop total in sync after any change, without blocking the
  // caller or surfacing an error for a background refresh.
  const refreshValuation = () => {
    void fetchValuation().catch(() => {})
  }

  const addItem = async (payload: InventoryItemPayload) => {
    isSaving.value = true
    try {
      const item = await createInventoryItem(payload)
      setItem(item)
      refreshValuation()
      return item
    } finally {
      isSaving.value = false
    }
  }

  const editItem = async (id: number, payload: InventoryItemPayload) => {
    isSaving.value = true
    try {
      const item = await updateInventoryItem(id, payload)
      setItem(item)
      refreshValuation()
      return item
    } finally {
      isSaving.value = false
    }
  }

  const removeItem = async (id: number) => {
    isSaving.value = true
    try {
      await deleteInventoryItem(id)
      items.value = items.value.filter(item => item.id !== id)
      refreshValuation()
    } finally {
      isSaving.value = false
    }
  }

  const adjustItem = async (id: number, payload: InventoryAdjustmentPayload) => {
    isSaving.value = true
    try {
      const item = await adjustInventoryItem(id, payload)
      setItem(item)
      refreshValuation()
      return item
    } finally {
      isSaving.value = false
    }
  }

  return {
    items,
    valuation,
    historyItems,
    historyPagination,
    historyTotals,
    isHistoryLoading,
    totalInventoryValue,
    isLoading,
    isSaving,
    totalSupplies,
    inStockItems,
    lowStockItems,
    outOfStockItems,
    stockHealthPercentage,
    fetchItems,
    fetchValuation,
    fetchHistory,
    addItem,
    editItem,
    removeItem,
    adjustItem,
  }
})
