<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import { toast } from 'vue-sonner'
import { useI18n } from 'vue-i18n'
import { APP_ROUTES } from '@/constants/appRoutes'
import {
  AlertTriangle,
  Archive,
  Box,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  CircleCheck,
  CircleMinus,
  CirclePlus,
  Eye,
  History,
  ImagePlus,
  Minus,
  Pencil,
  Plus,
  SlidersHorizontal,
  Trash2,
  Wallet,
  X,
} from 'lucide-vue-next'
import {
  DropdownMenuRoot,
  DropdownMenuTrigger,
  DropdownMenuPortal,
  DropdownMenuContent,
  DropdownMenuItem,
} from 'reka-ui'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import AppSelect from '@/components/ui/select/AppSelect.vue'
import FilterPanel from '@/components/common/FilterPanel.vue'
import { AppInput } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import ImageUpload from '@/components/common/ImageUpload.vue'
import { useInventoryStore } from '@/store/useInventoryStore'
import { useShopSettingsStore } from '@/store/useShopSettingsStore'
import { useNotificationStore } from '@/store/useNotificationStore'
import type { AdjustmentType, InventoryItem, InventoryStatus } from '@/types/inventory.types'
import { getImageUrl } from '@/utils/image'
import { getCategories } from '@/api/product'
import type { Category } from '@/types/product.types'

type SupplyModalMode = 'add' | 'edit' | 'view'
type InventoryFilterStatus = 'all' | InventoryStatus

const { t, locale } = useI18n()
const router = useRouter()
const inventoryStore = useInventoryStore()
const shopSettingsStore = useShopSettingsStore()
const notificationStore = useNotificationStore()

// Real-time synchronization: refresh inventory table and valuation when stock alerts occur
watch(
  () => notificationStore.notifications[0]?.id,
  (newId, oldId) => {
    if (newId && newId !== oldId) {
      const latest = notificationStore.notifications[0]
      if (latest?.type === 'low_stock' || latest?.type === 'out_of_stock') {
        inventoryStore.fetchItems(inventoryQueryFilters.value).catch(() => {})
        inventoryStore.fetchValuation().catch(() => {})
      }
    }
  }
)
const {
  items,
  isLoading,
  isSaving,
  totalSupplies,
  totalInventoryValue,
  lowStockItems,
  outOfStockItems,
  stockHealthPercentage,
} = storeToRefs(inventoryStore)

// Cost/value figures render in the shop's configured currency (USD symbol or
// KHR-converted), matching the rest of the app.
const formatMoney = (amount: number) => shopSettingsStore.formatAmount(amount)

const unitOptions = [
  { value: 'Packs', labelKey: 'inventory.units.packs' },
  { value: 'kg', labelKey: 'inventory.units.kg' },
  { value: 'Liters', labelKey: 'inventory.units.liters' },
  { value: 'Units', labelKey: 'inventory.units.units' },
]
const searchQuery = ref('')
const selectedStatus = ref<InventoryFilterStatus>('all')
const selectedUnit = ref('all')
const currentPage = ref(1)
const pageSize = 10
const showAllCriticalStock = ref(false)
const showAllLowStockWarnings = ref(false)
const isSupplyModalOpen = ref(false)
const isAdjustmentModalOpen = ref(false)
const supplyModalMode = ref<SupplyModalMode>('add')
const selectedItem = ref<InventoryItem | null>(null)
const itemPendingDelete = ref<InventoryItem | null>(null)
const selectedImageFile = ref<File | null>(null)
const supplyNameTouched = ref(false)

const supplyForm = reactive({
  name: '',
  quantity: 0,
  unitOfMeasure: 'Packs',
  categoryId: null as number | null,
  minAlertThreshold: 5,
  unitCost: 0,
  imageUrl: null as string | null,
})

const categories = ref<Category[]>([])
const categoryOptions = computed(() =>
  categories.value.map(category => ({ value: category.id, label: category.name }))
)

const adjustmentForm = reactive({
  adjustmentType: 'add' as AdjustmentType,
  amount: 0,
  unitCost: 0,
  notes: '',
})

const inventoryQueryFilters = computed(() => {
  const filters: { search?: string; status?: InventoryStatus; unit?: string } = {}
  const search = searchQuery.value.trim()

  if (search) filters.search = search
  if (selectedStatus.value !== 'all') filters.status = selectedStatus.value
  if (selectedUnit.value !== 'all') filters.unit = selectedUnit.value

  return filters
})
const filteredItems = computed(() => items.value)

const statusFilterOptions = computed(() => [
  { value: 'in_stock', label: t('inventory.status.inStock') },
  { value: 'low_stock', label: t('inventory.status.lowStock') },
  { value: 'out_of_stock', label: t('inventory.status.outOfStock') },
])

const unitFilterOptions = computed(() => {
  const availableUnits = new Set(items.value.map(item => item.unitOfMeasure).filter(Boolean))
  unitOptions.forEach(unit => availableUnits.add(unit.value))
  return Array.from(availableUnits).map(unit => ({ value: unit, label: unit }))
})

const hasActiveFilters = computed(
  () =>
    searchQuery.value.trim() !== '' ||
    selectedStatus.value !== 'all' ||
    selectedUnit.value !== 'all'
)

const totalPages = computed(() => Math.max(1, Math.ceil(filteredItems.value.length / pageSize)))
const paginationStart = computed(() => {
  if (filteredItems.value.length === 0) return 0
  return (currentPage.value - 1) * pageSize + 1
})
const paginationEnd = computed(() =>
  Math.min(currentPage.value * pageSize, filteredItems.value.length)
)
const paginatedItems = computed(() => {
  const start = (currentPage.value - 1) * pageSize
  return filteredItems.value.slice(start, start + pageSize)
})
const visiblePaginationPages = computed(() => {
  const pages = totalPages.value
  const maxVisible = 3
  if (pages <= maxVisible) return Array.from({ length: pages }, (_, index) => index + 1)

  const start = Math.min(Math.max(currentPage.value - 1, 1), pages - maxVisible + 1)
  return Array.from({ length: maxVisible }, (_, index) => start + index)
})
const displayedLowStockItems = computed(() =>
  showAllLowStockWarnings.value ? lowStockItems.value : lowStockItems.value.slice(0, 2)
)
const displayedCriticalStockItems = computed(() =>
  showAllCriticalStock.value ? outOfStockItems.value : outOfStockItems.value.slice(0, 2)
)
const numberLocale = computed(() => (locale.value === 'kh' ? 'km-KH' : locale.value))
const formatNumber = (value: number) => value.toLocaleString(numberLocale.value)
const hasSupplyNameError = computed(
  () => supplyNameTouched.value && supplyForm.name.trim().length === 0
)
// Stock is stored to two decimal places, so quantities and costs are handled as
// decimals (rounded to 2 dp) rather than whole numbers — this is what lets 0.5 kg
// be entered and 2.4 kg be fully removed.
const toDecimal = (value: unknown, min = 0) => {
  const numberValue = Number(value)
  if (!Number.isFinite(numberValue)) return min
  return Math.max(min, Math.round(numberValue * 100) / 100)
}
const normalizeSupplyCounts = () => {
  supplyForm.quantity = toDecimal(supplyForm.quantity)
  supplyForm.minAlertThreshold = toDecimal(supplyForm.minAlertThreshold)
  supplyForm.unitCost = toDecimal(supplyForm.unitCost)
}
// Only kg is a continuously-measured unit here — Packs/Liters/Units are
// discrete items, so an adjustment amount for them must stay a whole number.
const isFractionalUnit = computed(() => selectedItem.value?.unitOfMeasure === 'kg')
/** Stepper increment — 0.01 for kg (matches its 2-decimal precision), 1 for whole-number units. */
const ADJUSTMENT_STEP = computed(() => (isFractionalUnit.value ? 0.01 : 1))
const isRemovingStock = computed(() => adjustmentForm.adjustmentType === 'remove')
const adjustmentMaxAmount = computed(() => {
  if (!isRemovingStock.value) return Number.POSITIVE_INFINITY
  // Full stock is removable — no flooring, so a 2.4 kg item can be cleared to 0.
  return selectedItem.value ? Math.max(0, selectedItem.value.quantity) : 0
})
// For whole-number units the max must also be floored: clamping a rounded
// (whole) amount to a fractional max (e.g. 4.9 Units left over from a past
// fractional entry) would silently reintroduce a fraction.
const effectiveMaxAmount = computed(() => {
  const max = adjustmentMaxAmount.value
  if (!Number.isFinite(max)) return max
  return isFractionalUnit.value ? max : Math.floor(max)
})
const isAdjustmentAmountInvalid = computed(() => {
  if (!selectedItem.value) return true
  if (adjustmentForm.amount <= 0) return true
  return isRemovingStock.value && adjustmentForm.amount > effectiveMaxAmount.value
})
const setAdjustmentAmount = (value: unknown) => {
  const numberValue = Number(value)
  const nonNegative = Number.isFinite(numberValue) ? Math.max(0, numberValue) : 0
  // Floor (never round up) whole-number units, so an amount can never overshoot
  // past what's actually available just by rounding to the nearest integer.
  const rounded = isFractionalUnit.value
    ? Math.round(nonNegative * 100) / 100
    : Math.floor(nonNegative)
  adjustmentForm.amount = Math.min(rounded, effectiveMaxAmount.value)
}
const setAdjustmentType = (type: AdjustmentType) => {
  adjustmentForm.adjustmentType = type
  setAdjustmentAmount(adjustmentForm.amount)
}

const statusMeta = {
  in_stock: {
    labelKey: 'inventory.status.inStock',
    class: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400',
    dotClass: 'bg-emerald-500',
  },
  low_stock: {
    labelKey: 'inventory.status.lowStock',
    class: 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-500',
    dotClass: 'bg-amber-500',
  },
  out_of_stock: {
    labelKey: 'inventory.status.outOfStock',
    class: 'bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400',
    dotClass: 'bg-rose-500',
  },
}

const summaryCards = computed(() => [
  {
    label: t('inventory.summary.totalValue'),
    value: formatMoney(totalInventoryValue.value),
    detail: t('inventory.summary.acrossSupplies', { count: totalSupplies.value }),
    icon: Wallet,
    class: 'text-emerald-700 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/30',
  },
  {
    label: t('inventory.summary.totalSupplies'),
    value: formatNumber(totalSupplies.value),
    detail: t('inventory.summary.stockHealth', { percentage: stockHealthPercentage.value }),
    icon: Archive,
    class: 'text-[#974400] bg-[#FFF7ED] dark:bg-amber-950/30',
  },
  {
    label: t('inventory.summary.lowStock'),
    value: formatNumber(lowStockItems.value.length),
    detail: t('inventory.summary.newCount', { count: lowStockItems.value.length }),
    icon: AlertTriangle,
    class: 'text-amber-600 dark:text-amber-500 bg-amber-50 dark:bg-amber-950/30',
  },
  {
    label: t('inventory.summary.outOfStock'),
    value: formatNumber(outOfStockItems.value.length),
    detail: t('inventory.summary.alertCount', { count: outOfStockItems.value.length }),
    icon: Box,
    class: 'text-rose-600 dark:text-rose-500 bg-rose-50 dark:bg-rose-950/30',
  },
])

const resetSupplyForm = () => {
  supplyForm.name = ''
  supplyForm.quantity = 0
  supplyForm.unitOfMeasure = 'Packs'
  supplyForm.categoryId = null
  supplyForm.minAlertThreshold = 5
  supplyForm.unitCost = 0
  supplyForm.imageUrl = null
  selectedImageFile.value = null
  supplyNameTouched.value = false
}

const openSupplyModal = (mode: SupplyModalMode, item?: InventoryItem) => {
  supplyModalMode.value = mode
  selectedItem.value = item || null
  selectedImageFile.value = null

  if (item) {
    supplyForm.name = item.name
    supplyForm.quantity = item.quantity
    supplyForm.unitOfMeasure = item.unitOfMeasure
    supplyForm.categoryId = item.category?.id ?? null
    supplyForm.minAlertThreshold = item.minAlertThreshold
    supplyForm.unitCost = item.unitCost
    supplyForm.imageUrl = item.imageUrl
  } else {
    resetSupplyForm()
  }

  isSupplyModalOpen.value = true
}

const closeSupplyModal = () => {
  isSupplyModalOpen.value = false
  selectedItem.value = null
  resetSupplyForm()
}

const openAdjustmentModal = (item: InventoryItem) => {
  selectedItem.value = item
  adjustmentForm.adjustmentType = 'add'
  adjustmentForm.amount = 1
  // Prefill with the item's current cost so "adding at the same price" leaves the
  // weighted average unchanged; the user overrides it when they paid a new price.
  adjustmentForm.unitCost = item.unitCost
  adjustmentForm.notes = ''
  isAdjustmentModalOpen.value = true
}

const closeAdjustmentModal = () => {
  isAdjustmentModalOpen.value = false
  selectedItem.value = null
}

const goToHistory = (item: InventoryItem) => {
  router.push({ name: APP_ROUTES.INVENTORY_HISTORY.name, params: { id: String(item.id) } })
}

const handleImageChange = (file: File | null) => {
  selectedImageFile.value = file
}

const saveSupply = async () => {
  if (supplyModalMode.value === 'view') {
    closeSupplyModal()
    return
  }

  supplyNameTouched.value = true
  if (!supplyForm.name.trim()) {
    toast.error(t('inventory.messages.nameRequired'))
    return
  }

  try {
    normalizeSupplyCounts()
    const payload = {
      name: supplyForm.name.trim(),
      unit_of_measure: supplyForm.unitOfMeasure,
      category_id: supplyForm.categoryId,
      quantity: supplyForm.quantity,
      min_alert_threshold: supplyForm.minAlertThreshold,
      unit_cost: supplyForm.unitCost,
      image: selectedImageFile.value,
    }

    if (supplyModalMode.value === 'edit' && selectedItem.value) {
      await inventoryStore.editItem(selectedItem.value.id, payload)
      toast.success(t('inventory.messages.updateSuccess'))
    } else {
      await inventoryStore.addItem(payload)
      toast.success(t('inventory.messages.createSuccess'))
      searchQuery.value = ''
      selectedStatus.value = 'all'
      selectedUnit.value = 'all'
      currentPage.value = 1
      void inventoryStore.fetchItems().catch(() => {
        toast.error(t('inventory.messages.loadError'))
      })
    }

    closeSupplyModal()
  } catch {
    toast.error(t('inventory.messages.saveError'))
  }
}

const openDeleteConfirm = (item: InventoryItem) => {
  itemPendingDelete.value = item
}

const closeDeleteConfirm = () => {
  itemPendingDelete.value = null
}

const deleteSupply = async () => {
  if (!itemPendingDelete.value) return

  try {
    await inventoryStore.removeItem(itemPendingDelete.value.id)
    toast.success(t('inventory.messages.deleteSuccess'))
    closeDeleteConfirm()
  } catch {
    toast.error(t('inventory.messages.deleteError'))
  }
}

const saveAdjustment = async () => {
  if (!selectedItem.value) return

  try {
    setAdjustmentAmount(adjustmentForm.amount)
    if (isAdjustmentAmountInvalid.value) {
      toast.error(t('inventory.messages.adjustError'))
      return
    }

    await inventoryStore.adjustItem(selectedItem.value.id, {
      adjustment_type: adjustmentForm.adjustmentType,
      change_amount: adjustmentForm.amount,
      // Purchase price only applies when adding stock (drives the weighted average).
      unit_cost:
        adjustmentForm.adjustmentType === 'add' ? toDecimal(adjustmentForm.unitCost) : null,
      notes: adjustmentForm.notes.trim() || null,
    })
    toast.success(t('inventory.messages.adjustSuccess'))
    closeAdjustmentModal()
  } catch {
    toast.error(t('inventory.messages.adjustError'))
  }
}

const getModalTitle = () => {
  if (supplyModalMode.value === 'edit') return t('inventory.modal.editTitle')
  if (supplyModalMode.value === 'view') return t('inventory.modal.viewTitle')
  return t('inventory.modal.addTitle')
}

const fetchFilteredItems = async () => {
  currentPage.value = 1
  await inventoryStore.fetchItems(inventoryQueryFilters.value).catch(() => {
    toast.error(t('inventory.messages.loadError'))
  })
}

const applyFilters = async () => {
  await fetchFilteredItems()
}

const clearFilters = async () => {
  searchQuery.value = ''
  selectedStatus.value = 'all'
  selectedUnit.value = 'all'
  await fetchFilteredItems()
}

watch(totalPages, pages => {
  if (currentPage.value > pages) currentPage.value = pages
})

onMounted(() => {
  inventoryStore.fetchItems(inventoryQueryFilters.value).catch(() => {
    toast.error(t('inventory.messages.loadError'))
  })
  inventoryStore.fetchValuation().catch(() => {
    toast.error(t('inventory.messages.loadError'))
  })
  getCategories()
    .then(result => {
      categories.value = result
    })
    .catch(() => toast.error(t('inventory.messages.loadError')))
})
</script>

<template>
  <div
    class="h-full overflow-y-auto bg-[#F9FAFB] p-8 text-[#1A1C1C] dark:bg-stone-900 dark:text-stone-100"
  >
    <div class="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div class="flex gap-3 items-center">
        <div class="w-auto">
          <p class="text-[14px] truncate">{{ t('menuManagement.subtitle') }}</p>
        </div>
      </div>
      <Button
        class="h-11 rounded-xl bg-primary px-6 font-bold text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90"
        @click="openSupplyModal('add')"
      >
        <Plus class="size-4" />
        {{ t('inventory.actions.addItem') }}
      </Button>
    </div>

    <div class="flex w-full flex-col gap-5">
      <div class="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <Card
          v-for="card in summaryCards"
          :key="card.label"
          class="flex-row items-center justify-between rounded-xl border-none bg-white p-6 shadow-sm dark:border dark:border-stone-800 dark:bg-stone-900"
        >
          <div>
            <div
              class="mb-5 flex size-10 items-center justify-center rounded-xl"
              :class="card.class"
            >
              <component :is="card.icon" class="size-5" />
            </div>
            <p
              class="text-[11px] font-black uppercase tracking-wide text-[#A3A3A3] dark:text-stone-500"
            >
              {{ card.label }}
            </p>
            <p class="mt-1 text-2xl font-black text-[#1A1C1C] dark:text-stone-100">
              {{ card.value }}
            </p>
          </div>
          <span class="self-start text-xs font-black" :class="card.class.split(' ')[0]">
            {{ card.detail }}
          </span>
        </Card>
      </div>

      <Card
        class="gap-0 overflow-hidden rounded-xl border-none bg-white p-0 text-[#1A1C1C] shadow-sm dark:border dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100"
      >
        <!-- Filter  -->
        <FilterPanel
          :has-active-filters="hasActiveFilters"
          @submit="applyFilters"
          @clear="clearFilters"
        >
          <AppInput
            id="inventory-filter-name"
            v-model="searchQuery"
            search-icon
            type="text"
            :label="t('inventory.form.itemName')"
            label-class="text-xs font-semibold uppercase tracking-wide text-[#1A1C1C]/50 dark:text-stone-400"
            container-class="col-span-4 lg:col-span-5"
            :placeholder="t('inventory.searchPlaceholder')"
            class="h-10 border-none bg-[#FAFAFA] pr-4 text-sm text-[#1A1C1C] shadow-none placeholder:text-stone-400 focus-visible:ring-2 focus-visible:ring-primary dark:bg-stone-800 dark:text-stone-100 dark:placeholder:text-stone-500"
          />

          <AppSelect
            v-model="selectedStatus"
            :options="statusFilterOptions"
            :label="t('inventory.filters.status')"
            :all-option-label="t('inventory.filters.allStatuses')"
            class="w-full col-span-4 lg:col-span-2"
          />

          <AppSelect
            v-model="selectedUnit"
            :options="unitFilterOptions"
            :label="t('inventory.filters.unit')"
            :all-option-label="t('inventory.filters.allUnits')"
            class="w-full col-span-4 lg:col-span-2"
          />
        </FilterPanel>

        <!-- Table  -->
        <Table class="min-w-[820px] text-left">
          <TableHeader>
            <TableRow
              class="bg-[#FCFCFC] text-[11px] font-black uppercase text-[#A3A3A3] hover:bg-[#FCFCFC] dark:bg-stone-800 dark:text-stone-500 dark:hover:bg-stone-800"
            >
              <TableHead class="px-6 py-4">{{ t('inventory.table.name') }}</TableHead>
              <TableHead class="px-6 py-4">{{ t('inventory.table.stockLevel') }}</TableHead>
              <TableHead class="px-6 py-4">{{ t('inventory.table.unit') }}</TableHead>
              <TableHead class="px-6 py-4 text-right">
                {{ t('inventory.table.unitCost') }}
              </TableHead>
              <TableHead class="px-6 py-4 text-right">
                {{ t('inventory.table.totalValue') }}
              </TableHead>
              <TableHead class="px-6 py-4 text-center">
                {{ t('inventory.table.status') }}
              </TableHead>
              <TableHead class="px-6 py-4 text-center">
                {{ t('inventory.table.actions') }}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-if="isLoading" class="hover:bg-transparent">
              <TableCell
                colspan="7"
                class="px-6 py-12 text-center text-sm font-bold text-[#A3A3A3] dark:text-stone-500"
              >
                {{ t('inventory.messages.loading') }}
              </TableCell>
            </TableRow>
            <TableRow v-else-if="filteredItems.length === 0" class="hover:bg-transparent">
              <TableCell
                colspan="7"
                class="px-6 py-12 text-center text-sm font-bold text-[#A3A3A3] dark:text-stone-500"
              >
                {{ t('inventory.messages.empty') }}
              </TableCell>
            </TableRow>
            <TableRow
              v-for="item in paginatedItems"
              v-else
              :key="item.id"
              class="border-slate-100 text-sm font-bold text-[#1A1C1C] dark:border-stone-800 dark:text-stone-100"
            >
              <TableCell class="px-6 py-4">
                <div class="flex items-center gap-3">
                  <div
                    class="flex size-11 items-center justify-center overflow-hidden rounded-xl bg-stone-100 dark:bg-stone-800"
                  >
                    <img
                      v-if="item.imageUrl"
                      :src="getImageUrl(item.imageUrl)"
                      :alt="item.name"
                      class="h-full w-full object-cover"
                    />
                    <ImagePlus v-else class="size-5 text-stone-400 dark:text-stone-500" />
                  </div>
                  <div>
                    <p class="text-[#1A1C1C] dark:text-stone-100">{{ item.name }}</p>
                  </div>
                </div>
              </TableCell>
              <TableCell
                class="px-6 py-4"
                :class="
                  item.status === 'out_of_stock'
                    ? 'text-rose-600 dark:text-rose-500'
                    : 'text-[#1A1C1C] dark:text-stone-100'
                "
              >
                {{ formatNumber(item.quantity) }}
              </TableCell>
              <TableCell class="px-6 py-4 text-[#737373] dark:text-stone-400">
                {{ item.unitOfMeasure }}
              </TableCell>
              <TableCell class="px-6 py-4 text-right text-[#1A1C1C] dark:text-stone-100">
                {{ formatMoney(item.unitCost) }}
              </TableCell>
              <TableCell class="px-6 py-4 text-right font-black text-[#1A1C1C] dark:text-stone-100">
                {{ formatMoney(item.totalValue) }}
              </TableCell>
              <TableCell class="px-6 py-4 text-center">
                <span
                  class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-black"
                  :class="statusMeta[item.status].class"
                >
                  <span class="size-1.5 rounded-full" :class="statusMeta[item.status].dotClass" />
                  {{ t(statusMeta[item.status].labelKey) }}
                </span>
              </TableCell>
              <TableCell class="px-6 py-4">
                <div class="flex items-center justify-center">
                  <DropdownMenuRoot>
                    <DropdownMenuTrigger
                      class="material-symbols-outlined cursor-pointer transition-opacity hover:text-[#974400] focus:outline-none"
                      :title="t('inventory.table.actions')"
                      @click.stop
                    >
                      more_vert
                    </DropdownMenuTrigger>

                    <DropdownMenuPortal>
                      <DropdownMenuContent
                        class="z-50 min-w-[160px] animate-in rounded-lg border border-[#edddd5] bg-white p-1 shadow-lg fade-in-0 zoom-in-95 dark:border-stone-800 dark:bg-stone-900"
                        :side-offset="4"
                        align="end"
                      >
                        <!-- Adjust -->
                        <DropdownMenuItem
                          class="flex cursor-pointer select-none items-center gap-2 rounded-md px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-[#fdf4ef] hover:text-[#974400] focus:bg-[#fdf4ef] focus:text-[#974400] focus:outline-none dark:text-stone-300 dark:hover:bg-stone-800 dark:focus:bg-stone-800"
                          @click.stop="openAdjustmentModal(item)"
                        >
                          <SlidersHorizontal class="size-4 shrink-0" />
                          <span>{{ t('inventory.actions.adjust') }}</span>
                        </DropdownMenuItem>

                        <!-- Edit -->
                        <DropdownMenuItem
                          class="flex cursor-pointer select-none items-center gap-2 rounded-md px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-[#fdf4ef] hover:text-[#974400] focus:bg-[#fdf4ef] focus:text-[#974400] focus:outline-none dark:text-stone-300 dark:hover:bg-stone-800 dark:focus:bg-stone-800"
                          @click.stop="openSupplyModal('edit', item)"
                        >
                          <Pencil class="size-4 shrink-0" />
                          <span>{{ t('inventory.actions.edit') }}</span>
                        </DropdownMenuItem>

                        <!-- View -->
                        <DropdownMenuItem
                          class="flex cursor-pointer select-none items-center gap-2 rounded-md px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-[#fdf4ef] hover:text-[#974400] focus:bg-[#fdf4ef] focus:text-[#974400] focus:outline-none dark:text-stone-300 dark:hover:bg-stone-800 dark:focus:bg-stone-800"
                          @click.stop="openSupplyModal('view', item)"
                        >
                          <Eye class="size-4 shrink-0" />
                          <span>{{ t('inventory.actions.view') }}</span>
                        </DropdownMenuItem>

                        <!-- History -->
                        <DropdownMenuItem
                          class="flex cursor-pointer select-none items-center gap-2 rounded-md px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-[#fdf4ef] hover:text-[#974400] focus:bg-[#fdf4ef] focus:text-[#974400] focus:outline-none dark:text-stone-300 dark:hover:bg-stone-800 dark:focus:bg-stone-800"
                          @click.stop="goToHistory(item)"
                        >
                          <History class="size-4 shrink-0" />
                          <span>{{ t('inventory.actions.viewHistory') }}</span>
                        </DropdownMenuItem>

                        <!-- Delete -->
                        <DropdownMenuItem
                          class="flex cursor-pointer select-none items-center gap-2 rounded-md px-3 py-2 text-sm text-red-500 transition-colors hover:bg-red-50 focus:bg-red-50 focus:outline-none dark:hover:bg-red-950/40 dark:focus:bg-red-950/40"
                          @click.stop="openDeleteConfirm(item)"
                        >
                          <Trash2 class="size-4 shrink-0" />
                          <span>{{ t('inventory.actions.delete') }}</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenuPortal>
                  </DropdownMenuRoot>
                </div>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>

        <footer
          class="flex flex-col gap-3 border-t border-slate-100 px-6 py-4 dark:border-stone-800 sm:flex-row sm:items-center sm:justify-between"
        >
          <p class="text-xs font-semibold text-[#737373] dark:text-stone-400">
            {{
              t('inventory.table.showingRange', {
                start: paginationStart,
                end: paginationEnd,
                total: filteredItems.length,
              })
            }}
          </p>
          <div class="flex items-center gap-2">
            <Button
              variant="tertiary"
              size="icon"
              class="size-8 rounded-lg border border-slate-200 text-[#A3A3A3] dark:border-stone-700 dark:text-stone-500"
              :disabled="currentPage === 1"
              @click="currentPage -= 1"
            >
              <ChevronLeft class="size-4" />
            </Button>
            <Button
              v-for="page in visiblePaginationPages"
              :key="page"
              variant="tertiary"
              size="icon"
              class="size-8 rounded-lg border text-xs font-black"
              :class="
                page === currentPage
                  ? 'border-[#974400] bg-[#974400] text-white'
                  : 'border-slate-200 text-[#737373] dark:border-stone-700 dark:text-stone-400'
              "
              @click="currentPage = page"
            >
              {{ page }}
            </Button>
            <Button
              variant="tertiary"
              size="icon"
              class="size-8 rounded-lg border border-slate-200 text-[#A3A3A3] dark:border-stone-700 dark:text-stone-500"
              :disabled="currentPage === totalPages"
              @click="currentPage += 1"
            >
              <ChevronRight class="size-4" />
            </Button>
          </div>
        </footer>
      </Card>

      <div class="grid gap-5 lg:grid-cols-2">
        <Card
          class="overflow-hidden rounded-xl border-none bg-white p-0 shadow-md shadow-slate-200/70 dark:border dark:border-stone-800 dark:bg-stone-900"
        >
          <div
            class="flex items-center gap-2 border-b border-rose-100 bg-rose-50 px-6 py-4 text-sm font-black uppercase tracking-wide text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-400"
          >
            <CircleAlert class="size-4 fill-rose-700 text-white" />
            {{ t('inventory.panels.criticalStock', { count: outOfStockItems.length }) }}
          </div>
          <div class="min-h-[110px] space-y-4 p-5">
            <div
              v-if="outOfStockItems.length === 0"
              class="text-sm font-bold text-[#A3A3A3] dark:text-stone-500"
            >
              {{ t('inventory.panels.noCriticalStock') }}
            </div>
            <div
              v-for="item in displayedCriticalStockItems"
              :key="item.id"
              class="flex items-center justify-between gap-3"
            >
              <div class="flex items-center gap-3">
                <div
                  class="flex size-10 items-center justify-center overflow-hidden rounded-lg bg-rose-50 dark:bg-rose-950/30"
                >
                  <img
                    v-if="item.imageUrl"
                    :src="getImageUrl(item.imageUrl)"
                    :alt="item.name"
                    class="h-full w-full object-cover"
                  />
                  <ImagePlus v-else class="size-5 text-rose-400 dark:text-rose-500" />
                </div>
                <div>
                  <p class="text-sm font-black text-[#1A1C1C] dark:text-stone-100">
                    {{ item.name }}
                  </p>
                  <p class="text-xs font-semibold text-[#A3A3A3] dark:text-stone-500">
                    {{ t('inventory.status.outOfStock') }}
                  </p>
                </div>
              </div>
              <Button
                variant="tertiary"
                class="h-8 text-xs font-black uppercase text-primary"
                @click="openAdjustmentModal(item)"
              >
                {{ t('inventory.actions.restock') }}
              </Button>
            </div>
            <Button
              v-if="outOfStockItems.length > 2"
              variant="tertiary"
              class="h-9 w-full rounded-lg bg-[#FAFAFA] text-xs font-black uppercase text-[#1A1C1C] hover:bg-[#F4F4F5] hover:no-underline dark:bg-stone-800 dark:text-stone-100 dark:hover:bg-stone-700"
              @click="showAllCriticalStock = !showAllCriticalStock"
            >
              {{
                showAllCriticalStock
                  ? t('inventory.actions.viewLessCriticalStock')
                  : t('inventory.actions.viewAllCriticalStock')
              }}
            </Button>
          </div>
        </Card>

        <Card
          class="overflow-hidden rounded-xl border-none bg-white p-0 shadow-md shadow-slate-200/70 dark:border dark:border-stone-800 dark:bg-stone-900"
        >
          <div
            class="flex items-center gap-2 border-b border-amber-100 bg-amber-50 px-6 py-4 text-sm font-black uppercase tracking-wide text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-500"
          >
            <AlertTriangle class="size-4 fill-amber-600 text-white" />
            {{ t('inventory.panels.lowStockWarnings', { count: lowStockItems.length }) }}
          </div>
          <div class="min-h-[110px] space-y-4 p-5">
            <div
              v-if="lowStockItems.length === 0"
              class="text-sm font-bold text-[#A3A3A3] dark:text-stone-500"
            >
              {{ t('inventory.panels.noLowStock') }}
            </div>
            <div
              v-for="item in displayedLowStockItems"
              :key="item.id"
              class="flex items-center justify-between gap-3"
            >
              <div class="flex items-center gap-3">
                <div
                  class="flex size-10 items-center justify-center overflow-hidden rounded-lg bg-amber-50 dark:bg-amber-950/30"
                >
                  <img
                    v-if="item.imageUrl"
                    :src="getImageUrl(item.imageUrl)"
                    :alt="item.name"
                    class="h-full w-full object-cover"
                  />
                  <ImagePlus v-else class="size-5 text-amber-400 dark:text-amber-500" />
                </div>
                <div>
                  <p class="text-sm font-black text-[#1A1C1C] dark:text-stone-100">
                    {{ item.name }}
                  </p>
                  <p class="text-xs font-black uppercase text-amber-600 dark:text-amber-500">
                    {{
                      t('inventory.panels.lowStockRatio', {
                        quantity: item.quantity,
                        threshold: item.minAlertThreshold,
                        unit: item.unitOfMeasure,
                      })
                    }}
                  </p>
                </div>
              </div>
            </div>
            <Button
              v-if="lowStockItems.length > 2"
              variant="tertiary"
              class="h-9 w-full rounded-lg bg-[#FAFAFA] text-xs font-black uppercase text-[#1A1C1C] hover:bg-[#F4F4F5] hover:no-underline dark:bg-stone-800 dark:text-stone-100 dark:hover:bg-stone-700"
              @click="showAllLowStockWarnings = !showAllLowStockWarnings"
            >
              {{
                showAllLowStockWarnings
                  ? t('inventory.actions.viewLessWarnings')
                  : t('inventory.actions.viewAllWarnings')
              }}
            </Button>
          </div>
        </Card>
      </div>
    </div>

    <div
      v-if="isSupplyModalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm"
    >
      <Card
        class="w-full max-w-[520px] gap-0 overflow-hidden rounded-2xl border-none bg-white p-0 dark:border dark:border-stone-800 dark:bg-stone-900"
      >
        <header
          class="flex items-center justify-between border-b border-slate-100 px-6 py-5 dark:border-stone-800"
        >
          <h2 class="text-lg font-black text-[#1A1C1C] dark:text-stone-100">
            {{ getModalTitle() }}
          </h2>
          <Button variant="tertiary" size="icon" class="size-8" @click="closeSupplyModal">
            <X class="size-4" />
          </Button>
        </header>

        <div class="space-y-4 p-6">
          <Label
            class="flex flex-col items-start gap-2 text-xs font-black text-[#737373] dark:text-stone-400"
          >
            <span>
              {{ t('inventory.form.itemName') }}
              <span class="text-rose-600 dark:text-rose-500">{{
                t('inventory.form.required')
              }}</span>
            </span>
            <AppInput
              v-model="supplyForm.name"
              :disabled="supplyModalMode === 'view'"
              :placeholder="t('inventory.form.itemNamePlaceholder')"
              :aria-invalid="hasSupplyNameError"
              class="h-11 rounded-xl bg-[#FAFAFA] font-bold dark:bg-stone-800"
              :class="
                hasSupplyNameError
                  ? 'border-rose-300 text-rose-700 focus-visible:ring-rose-200'
                  : ''
              "
              required
              @blur="supplyNameTouched = true"
            />
            <span
              v-if="hasSupplyNameError"
              class="text-xs font-bold text-rose-600 dark:text-rose-500"
            >
              {{ t('inventory.messages.nameRequired') }}
            </span>
          </Label>

          <div class="grid gap-4 sm:grid-cols-2">
            <Label
              class="flex flex-col items-start gap-2 text-xs font-black text-[#737373] dark:text-stone-400"
            >
              {{ t('inventory.form.numberOfItems') }}
              <AppInput
                v-model="supplyForm.quantity"
                :disabled="supplyModalMode === 'view'"
                type="number"
                min="0"
                step="0.01"
                class="h-11 rounded-xl bg-[#FAFAFA] text-right font-bold dark:bg-stone-800"
                @blur="supplyForm.quantity = toDecimal(supplyForm.quantity)"
              />
            </Label>
            <Label
              class="flex flex-col items-start gap-2 text-xs font-black text-[#737373] dark:text-stone-400"
            >
              {{ t('inventory.form.unitOfMeasure') }}
              <Select v-model="supplyForm.unitOfMeasure" :disabled="supplyModalMode === 'view'">
                <SelectTrigger class="h-11 rounded-xl bg-[#FAFAFA] font-bold dark:bg-stone-800">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem v-for="unit in unitOptions" :key="unit.value" :value="unit.value">
                    {{ t(unit.labelKey) }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </Label>
          </div>

          <Label
            class="flex flex-col items-start gap-2 text-xs font-black text-[#737373] dark:text-stone-400"
          >
            {{ t('inventory.form.category') }}
            <Select
              :model-value="supplyForm.categoryId ?? undefined"
              :disabled="supplyModalMode === 'view'"
              @update:model-value="value => (supplyForm.categoryId = Number(value))"
            >
              <SelectTrigger class="h-11 rounded-xl bg-[#FAFAFA] font-bold dark:bg-stone-800">
                <SelectValue :placeholder="t('inventory.form.categoryPlaceholder')" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="category in categoryOptions"
                  :key="category.value"
                  :value="category.value"
                >
                  {{ category.label }}
                </SelectItem>
              </SelectContent>
            </Select>
          </Label>

          <Label
            class="flex flex-col items-start gap-2 text-xs font-black text-[#737373] dark:text-stone-400"
          >
            {{ t('inventory.form.minAlert') }}
            <AppInput
              v-model="supplyForm.minAlertThreshold"
              :disabled="supplyModalMode === 'view'"
              type="number"
              min="0"
              step="0.01"
              :placeholder="t('inventory.form.minAlertPlaceholder')"
              class="h-11 rounded-xl bg-[#FAFAFA] font-bold dark:bg-stone-800"
              @blur="supplyForm.minAlertThreshold = toDecimal(supplyForm.minAlertThreshold)"
            />
          </Label>

          <Label
            class="flex flex-col items-start gap-2 text-xs font-black text-[#737373] dark:text-stone-400"
          >
            {{ t('inventory.form.unitCost', { currency: shopSettingsStore.currency_symbol }) }}
            <AppInput
              v-model="supplyForm.unitCost"
              :disabled="supplyModalMode === 'view'"
              type="number"
              min="0"
              step="0.01"
              :placeholder="t('inventory.form.unitCostPlaceholder')"
              class="h-11 rounded-xl bg-[#FAFAFA] text-right font-bold dark:bg-stone-800"
              @blur="supplyForm.unitCost = toDecimal(supplyForm.unitCost)"
            />
            <span class="text-[11px] font-semibold normal-case text-[#A3A3A3] dark:text-stone-500">
              {{ t('inventory.form.unitCostHint') }}
            </span>
          </Label>

          <ImageUpload
            v-model="supplyForm.imageUrl"
            :disabled="supplyModalMode === 'view'"
            :label="t('inventory.form.itemImage')"
            :recommendation="t('inventory.form.imageRecommendation')"
            :max-size-mb="10"
            @change="handleImageChange"
            @error="toast.error"
          />
        </div>

        <footer
          class="flex justify-end gap-3 border-t border-slate-100 bg-[#FAFAFA] px-6 py-4 dark:border-stone-800 dark:bg-stone-800"
        >
          <Button
            variant="tertiary"
            class="h-11 rounded-xl px-6 font-bold"
            @click="closeSupplyModal"
          >
            {{ supplyModalMode === 'view' ? t('inventory.actions.close') : t('common.cancel') }}
          </Button>
          <Button
            v-if="supplyModalMode !== 'view'"
            class="h-11 rounded-xl bg-primary px-6 font-bold text-primary-foreground hover:bg-primary/90"
            :disabled="isSaving"
            @click="saveSupply"
          >
            {{
              supplyModalMode === 'edit'
                ? t('inventory.actions.editSupply')
                : t('inventory.actions.addSupply')
            }}
          </Button>
        </footer>
      </Card>
    </div>

    <div
      v-if="itemPendingDelete"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm"
      @click.self="closeDeleteConfirm"
    >
      <Card
        class="w-full max-w-[420px] gap-0 overflow-hidden rounded-2xl border-none bg-white p-0 dark:border dark:border-stone-800 dark:bg-stone-900"
      >
        <header
          class="flex items-center justify-between border-b border-slate-100 px-6 py-5 dark:border-stone-800"
        >
          <h2 class="text-lg font-black text-[#1A1C1C] dark:text-stone-100">
            {{ t('inventory.deleteConfirm.title') }}
          </h2>
          <Button variant="tertiary" size="icon" class="size-8" @click="closeDeleteConfirm">
            <X class="size-4" />
          </Button>
        </header>

        <div class="space-y-3 p-6">
          <p class="text-sm font-semibold leading-6 text-[#737373] dark:text-stone-400">
            {{
              t('inventory.deleteConfirm.message', {
                name: itemPendingDelete.name,
              })
            }}
          </p>
        </div>

        <footer
          class="flex justify-end gap-3 border-t border-slate-100 bg-[#FAFAFA] px-6 py-4 dark:border-stone-800 dark:bg-stone-800"
        >
          <Button
            variant="tertiary"
            class="h-11 rounded-xl px-6 font-bold text-[#1A1C1C] dark:text-stone-100"
            :disabled="isSaving"
            @click="closeDeleteConfirm"
          >
            {{ t('common.cancel') }}
          </Button>
          <Button
            class="h-11 rounded-xl bg-destructive px-6 font-bold text-white hover:bg-destructive/90"
            :disabled="isSaving"
            @click="deleteSupply"
          >
            {{ t('inventory.actions.delete') }}
          </Button>
        </footer>
      </Card>
    </div>

    <div
      v-if="isAdjustmentModalOpen && selectedItem"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-[2px]"
    >
      <Card
        class="w-full max-w-[414px] gap-0 overflow-hidden rounded-[14px] border-none bg-white p-0 shadow-2xl dark:border dark:border-stone-800 dark:bg-stone-900"
      >
        <header
          class="flex items-center justify-between border-b border-slate-100 px-5 py-[18px] dark:border-stone-800"
        >
          <h2 class="text-base font-medium text-[#222222] dark:text-stone-100">
            {{ t('inventory.adjustment.title') }}
          </h2>
          <Button
            variant="tertiary"
            size="icon"
            class="size-8 text-[#9A9A9A] hover:text-[#2D241E] dark:text-stone-500 dark:hover:text-stone-300"
            @click="closeAdjustmentModal"
          >
            <X class="size-5" />
          </Button>
        </header>

        <div class="space-y-5 px-5 py-[22px]">
          <div class="flex items-center gap-4 rounded-lg bg-[#F4F4F4] p-4 dark:bg-stone-800">
            <div
              class="flex size-[38px] shrink-0 items-center justify-center overflow-hidden rounded-md bg-white shadow-sm dark:bg-stone-700"
            >
              <img
                v-if="selectedItem.imageUrl"
                :src="getImageUrl(selectedItem.imageUrl)"
                :alt="selectedItem.name"
                class="h-full w-full object-cover"
              />
              <Box v-else class="size-5 text-stone-400 dark:text-stone-500" />
            </div>
            <div>
              <p class="text-sm font-medium leading-5 text-[#2D241E] dark:text-stone-100">
                {{ selectedItem.name }}
              </p>
              <p class="text-xs leading-5 text-[#666666] dark:text-stone-400">
                {{
                  t('inventory.adjustment.currentStock', {
                    quantity: selectedItem.quantity,
                    unit: selectedItem.unitOfMeasure,
                  })
                }}
              </p>
            </div>
          </div>

          <div>
            <p class="mb-3 text-sm font-normal uppercase text-[#8A8A8A] dark:text-stone-500">
              {{ t('inventory.adjustment.typeAndAmount') }}
            </p>
            <div
              class="grid h-9 grid-cols-2 overflow-hidden rounded-md bg-[#F3F3F3] p-[3px] dark:bg-stone-800"
            >
              <Button
                variant="tertiary"
                class="h-full rounded px-3 text-[11px] font-bold uppercase leading-none text-[#5D5D5D] no-underline hover:no-underline dark:text-stone-400"
                :class="
                  adjustmentForm.adjustmentType === 'add'
                    ? 'bg-white text-[#A64E05] shadow-sm dark:bg-stone-700'
                    : ''
                "
                @click="setAdjustmentType('add')"
              >
                <CirclePlus class="size-3.5" />
                {{ t('inventory.adjustment.addStock') }}
              </Button>
              <Button
                variant="tertiary"
                class="h-full rounded px-3 text-[11px] font-bold uppercase leading-none text-[#5D5D5D] no-underline hover:no-underline dark:text-stone-400"
                :class="
                  adjustmentForm.adjustmentType === 'remove'
                    ? 'bg-white text-[#A64E05] shadow-sm dark:bg-stone-700'
                    : ''
                "
                @click="setAdjustmentType('remove')"
              >
                <CircleMinus class="size-3.5" />
                {{ t('inventory.adjustment.removeStock') }}
              </Button>
            </div>
          </div>

          <div
            class="grid h-[54px] grid-cols-[46px_minmax(0,1fr)_64px_46px] items-center rounded-xl border border-[#E1E1E1] bg-[#FAFAFA] shadow-sm dark:border-stone-700 dark:bg-stone-800"
          >
            <Button
              variant="tertiary"
              size="icon"
              class="size-full rounded-none text-[#A64E05] hover:bg-transparent"
              :disabled="adjustmentForm.amount <= 0"
              @click="setAdjustmentAmount(Number(adjustmentForm.amount) - ADJUSTMENT_STEP)"
            >
              <Minus class="size-4" />
            </Button>
            <AppInput
              :model-value="adjustmentForm.amount"
              type="number"
              min="0"
              :max="Number.isFinite(effectiveMaxAmount) ? effectiveMaxAmount : undefined"
              :step="ADJUSTMENT_STEP"
              :aria-invalid="isAdjustmentAmountInvalid"
              class="h-full border-0 bg-transparent px-0 text-right text-xl font-normal text-[#222222] shadow-none [appearance:textfield] focus-visible:ring-0 dark:text-stone-100 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              @update:model-value="setAdjustmentAmount"
            />
            <span class="pl-4 text-sm font-normal text-[#B2B2B2] dark:text-stone-500">
              {{ selectedItem.unitOfMeasure }}
            </span>
            <Button
              variant="tertiary"
              size="icon"
              class="size-full rounded-none text-[#A64E05] hover:bg-transparent"
              :disabled="isRemovingStock && adjustmentForm.amount >= effectiveMaxAmount"
              @click="setAdjustmentAmount(Number(adjustmentForm.amount) + ADJUSTMENT_STEP)"
            >
              <Plus class="size-4" />
            </Button>
          </div>
          <p
            v-if="isAdjustmentAmountInvalid"
            class="-mt-3 text-xs font-bold text-rose-600 dark:text-rose-500"
          >
            {{
              adjustmentForm.amount <= 0
                ? t('inventory.adjustment.amountRequired')
                : t('inventory.adjustment.amountExceedsStock', {
                    quantity: formatNumber(effectiveMaxAmount),
                    unit: selectedItem.unitOfMeasure,
                  })
            }}
          </p>

          <Label
            v-if="!isRemovingStock"
            class="flex flex-col items-start gap-3 text-sm font-normal uppercase text-[#8A8A8A] dark:text-stone-500"
          >
            {{
              t('inventory.adjustment.unitCost', { currency: shopSettingsStore.currency_symbol })
            }}
            <AppInput
              v-model="adjustmentForm.unitCost"
              type="number"
              min="0"
              step="0.01"
              :placeholder="t('inventory.form.unitCostPlaceholder')"
              class="h-11 w-full rounded-xl border border-[#E1E1E1] bg-[#FAFAFA] px-4 text-right text-base font-normal text-[#222222] shadow-sm focus-visible:ring-0 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
              @blur="adjustmentForm.unitCost = toDecimal(adjustmentForm.unitCost)"
            />
            <span class="text-[11px] font-normal normal-case text-[#B2B2B2] dark:text-stone-500">
              {{ t('inventory.adjustment.unitCostHint') }}
            </span>
          </Label>

          <Label
            class="flex flex-col items-start gap-3 text-sm font-normal uppercase text-[#8A8A8A] dark:text-stone-500"
          >
            {{ t('inventory.adjustment.notes') }}
            <Textarea
              v-model="adjustmentForm.notes"
              :placeholder="t('inventory.adjustment.notesPlaceholder')"
              class="min-h-[88px] resize-none rounded-xl border-[#E1E1E1] bg-white px-4 py-3 text-base font-normal normal-case text-[#2D241E] shadow-sm placeholder:text-[#7D8796] focus-visible:ring-0 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
            />
          </Label>
        </div>

        <footer
          class="flex gap-3 border-t border-slate-100 bg-[#F1F1F1] px-5 py-[18px] dark:border-stone-800 dark:bg-stone-800"
        >
          <Button
            variant="tertiary"
            class="h-[46px] flex-1 rounded-lg border border-[#E4E4E4] bg-white px-6 text-sm font-normal text-[#444444] shadow-sm hover:bg-white hover:no-underline dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100 dark:hover:bg-stone-900"
            @click="closeAdjustmentModal"
          >
            {{ t('common.cancel') }}
          </Button>
          <Button
            class="h-[46px] flex-1 rounded-lg bg-[#A64E05] px-6 text-sm font-normal text-white shadow-md shadow-[#A64E05]/25 hover:bg-[#8f4102]"
            :disabled="isSaving || isAdjustmentAmountInvalid"
            @click="saveAdjustment"
          >
            <CircleCheck class="size-4" />
            {{ t('common.confirm') }}
          </Button>
        </footer>
      </Card>
    </div>
  </div>
</template>
