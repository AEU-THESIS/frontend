import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import {
  adjustInventoryItem,
  createInventoryItem,
  deleteInventoryItem,
  getInventoryItems,
  updateInventoryItem,
  type InventoryItemFilters,
} from '@/api/inventory'
import type {
  InventoryAdjustmentPayload,
  InventoryItem,
  InventoryItemPayload,
} from '@/types/inventory.types'

export const useInventoryStore = defineStore('inventory', () => {
  const items = ref<InventoryItem[]>([])
  const isLoading = ref(false)
  const isSaving = ref(false)

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

  const addItem = async (payload: InventoryItemPayload) => {
    isSaving.value = true
    try {
      const item = await createInventoryItem(payload)
      setItem(item)
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
    } finally {
      isSaving.value = false
    }
  }

  const adjustItem = async (id: number, payload: InventoryAdjustmentPayload) => {
    isSaving.value = true
    try {
      const item = await adjustInventoryItem(id, payload)
      setItem(item)
      return item
    } finally {
      isSaving.value = false
    }
  }

  return {
    items,
    isLoading,
    isSaving,
    totalSupplies,
    inStockItems,
    lowStockItems,
    outOfStockItems,
    stockHealthPercentage,
    fetchItems,
    addItem,
    editItem,
    removeItem,
    adjustItem,
  }
})
