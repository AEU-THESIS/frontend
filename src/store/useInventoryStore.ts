import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import {
  adjustInventoryItem,
  createInventoryItem,
  deleteInventoryItem,
  exportInventoryExpenseReport,
  exportInventoryHistory,
  getInventoryExpenseReportByDay,
  getInventoryExpenseReportByIngredient,
  getInventoryHistory,
  getInventoryItems,
  getInventoryValuation,
  inventoryExpenseReportFileName,
  inventoryHistoryFileName,
  updateInventoryItem,
  type InventoryItemFilters,
} from '@/api/inventory'
import type {
  InventoryAdjustmentPayload,
  InventoryExpenseByDay,
  InventoryExpenseByIngredient,
  InventoryExpenseReportExportQuery,
  InventoryExpenseReportQuery,
  InventoryHistoryEntry,
  InventoryHistoryExportQuery,
  InventoryHistoryQuery,
  InventoryHistoryResponse,
  InventoryItem,
  InventoryItemPayload,
  InventoryValuation,
} from '@/types/inventory.types'
import { downloadBlob } from '@/utils/download'

export const useInventoryStore = defineStore('inventory', () => {
  const items = ref<InventoryItem[]>([])
  const valuation = ref<InventoryValuation>({ totalItems: 0, totalValue: 0 })
  const historyItems = ref<InventoryHistoryEntry[]>([])
  const historyPagination = ref<InventoryHistoryResponse['pagination']>({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 1,
  })
  const historyTotals = ref<InventoryHistoryResponse['totals']>({ totalIn: 0, totalOut: 0 })
  const expenseByDay = ref<InventoryExpenseByDay[]>([])
  const expenseByIngredient = ref<InventoryExpenseByIngredient[]>([])
  const expenseSummary = ref<{ totalSpend: number; purchaseCount: number; currency: string }>({
    totalSpend: 0,
    purchaseCount: 0,
    currency: '$',
  })
  const isLoading = ref(false)
  const isHistoryLoading = ref(false)
  const isExpenseReportLoading = ref(false)
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

  let currentHistoryRequestId = 0

  // Changing the range or page fires a new request before the previous one
  // settles, so a slower earlier response must not overwrite the newer
  // selection's rows, pagination or totals.
  const fetchHistory = async (id: number, params: InventoryHistoryQuery = {}) => {
    currentHistoryRequestId += 1
    const requestId = currentHistoryRequestId
    isHistoryLoading.value = true
    try {
      const res = await getInventoryHistory(id, params)
      if (requestId === currentHistoryRequestId) {
        historyItems.value = res.items
        historyPagination.value = res.pagination
        historyTotals.value = res.totals
      }
    } finally {
      if (requestId === currentHistoryRequestId) {
        isHistoryLoading.value = false
      }
    }
  }

  // Direct navigation to an item's history page has no cached list to read from,
  // and a list narrowed by search/status filters can legitimately exclude the
  // requested item. There is no by-ID endpoint, so refetch unfiltered and look
  // again — reusing fetchItems keeps the stale-response guard in play.
  const ensureItem = async (id: number) => {
    const cached = items.value.find(current => current.id === id)
    if (cached) return cached

    await fetchItems().catch(() => {})
    return items.value.find(current => current.id === id) ?? null
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

  let currentExpenseReportRequestId = 0

  // Fetches both groupings for the selected range in parallel and commits them
  // together, so the chart (by day) and the breakdown table (by ingredient)
  // never show two different periods at once.
  const fetchExpenseReport = async (params: Omit<InventoryExpenseReportQuery, 'groupBy'>) => {
    currentExpenseReportRequestId += 1
    const requestId = currentExpenseReportRequestId
    isExpenseReportLoading.value = true
    try {
      const [byDay, byIngredient] = await Promise.all([
        getInventoryExpenseReportByDay(params),
        getInventoryExpenseReportByIngredient(params),
      ])
      if (requestId === currentExpenseReportRequestId) {
        expenseByDay.value = byDay.data
        expenseByIngredient.value = byIngredient.data
        expenseSummary.value = {
          totalSpend: byDay.totalSpend,
          purchaseCount: byDay.purchaseCount,
          currency: byDay.currency,
        }
      }
    } finally {
      if (requestId === currentExpenseReportRequestId) {
        isExpenseReportLoading.value = false
      }
    }
  }

  // --- Excel exports ---
  // The server owns the aggregation, the layout and the workbook itself
  // (GET /api/inventories/exports/...), so these only save the bytes that come
  // back. Failures reject for the caller to surface.
  const isExporting = ref(false)

  const exportExpenseReport = async (params: InventoryExpenseReportExportQuery) => {
    isExporting.value = true
    try {
      const workbook = await exportInventoryExpenseReport(params)
      downloadBlob(workbook, inventoryExpenseReportFileName(params.startDate, params.endDate))
    } finally {
      isExporting.value = false
    }
  }

  // `itemName` only names the file — the workbook's own contents come from the
  // server, which reads the item from the id.
  const exportHistory = async (
    id: number,
    itemName: string,
    params: InventoryHistoryExportQuery & { from: string; to: string }
  ) => {
    isExporting.value = true
    try {
      const workbook = await exportInventoryHistory(id, params)
      downloadBlob(workbook, inventoryHistoryFileName(itemName, params.from, params.to))
    } finally {
      isExporting.value = false
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
    expenseByDay,
    expenseByIngredient,
    expenseSummary,
    isExpenseReportLoading,
    isExporting,
    totalInventoryValue,
    isLoading,
    isSaving,
    totalSupplies,
    inStockItems,
    lowStockItems,
    outOfStockItems,
    stockHealthPercentage,
    fetchItems,
    ensureItem,
    fetchValuation,
    fetchHistory,
    fetchExpenseReport,
    exportExpenseReport,
    exportHistory,
    addItem,
    editItem,
    removeItem,
    adjustItem,
  }
})
