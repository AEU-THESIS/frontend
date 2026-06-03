<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { toast } from 'vue-sonner'
import { useI18n } from 'vue-i18n'
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
  ImagePlus,
  Minus,
  Pencil,
  Plus,
  Search,
  SlidersHorizontal,
  Trash2,
  X,
} from 'lucide-vue-next'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import ImageUpload from '@/components/common/ImageUpload.vue'
import { useInventoryStore } from '@/store/useInventoryStore'
import type { AdjustmentType, InventoryItem, InventoryStatus } from '@/types/inventory.types'
import { getImageUrl } from '@/utils/image'

type SupplyModalMode = 'add' | 'edit' | 'view'
type InventoryFilterStatus = 'all' | InventoryStatus

const { t, locale } = useI18n()
const inventoryStore = useInventoryStore()
const {
  items,
  isLoading,
  isSaving,
  totalSupplies,
  lowStockItems,
  outOfStockItems,
  stockHealthPercentage,
} = storeToRefs(inventoryStore)

const unitOptions = [
  { value: 'Packs', labelKey: 'inventory.units.packs' },
  { value: 'kg', labelKey: 'inventory.units.kg' },
  { value: 'Liters', labelKey: 'inventory.units.liters' },
  { value: 'Units', labelKey: 'inventory.units.units' },
]
const searchQuery = ref('')
const selectedStatus = ref<InventoryFilterStatus>('all')
const selectedUnit = ref('all')
const isFilterPanelOpen = ref(false)
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
  minAlertThreshold: 5,
  imageUrl: null as string | null,
})

const adjustmentForm = reactive({
  adjustmentType: 'add' as AdjustmentType,
  amount: 0,
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

const unitFilterOptions = computed(() => {
  const availableUnits = new Set(items.value.map(item => item.unitOfMeasure).filter(Boolean))
  unitOptions.forEach(unit => availableUnits.add(unit.value))
  return Array.from(availableUnits)
})
const activeFilterCount = computed(
  () => Number(selectedStatus.value !== 'all') + Number(selectedUnit.value !== 'all')
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
const toWholeNumber = (value: unknown, min = 0) => {
  const numberValue = Number(value)
  if (!Number.isFinite(numberValue)) return min
  return Math.max(min, Math.round(numberValue))
}
const normalizeSupplyCounts = () => {
  supplyForm.quantity = toWholeNumber(supplyForm.quantity)
  supplyForm.minAlertThreshold = toWholeNumber(supplyForm.minAlertThreshold)
}
const isRemovingStock = computed(() => adjustmentForm.adjustmentType === 'remove')
const adjustmentMaxAmount = computed(() => {
  if (!isRemovingStock.value) return Number.POSITIVE_INFINITY
  return selectedItem.value ? Math.max(0, Math.floor(selectedItem.value.quantity)) : 0
})
const isAdjustmentAmountInvalid = computed(() => {
  if (!selectedItem.value) return true
  if (adjustmentForm.amount < 1) return true
  return isRemovingStock.value && adjustmentForm.amount > adjustmentMaxAmount.value
})
const setAdjustmentAmount = (value: unknown) => {
  const amount = toWholeNumber(
    value,
    isRemovingStock.value && adjustmentMaxAmount.value === 0 ? 0 : 1
  )
  adjustmentForm.amount = Math.min(amount, adjustmentMaxAmount.value)
}
const setAdjustmentType = (type: AdjustmentType) => {
  adjustmentForm.adjustmentType = type
  setAdjustmentAmount(adjustmentForm.amount)
}

const statusMeta = {
  in_stock: {
    labelKey: 'inventory.status.inStock',
    class: 'bg-emerald-50 text-emerald-700',
    dotClass: 'bg-emerald-500',
  },
  low_stock: {
    labelKey: 'inventory.status.lowStock',
    class: 'bg-amber-50 text-amber-700',
    dotClass: 'bg-amber-500',
  },
  out_of_stock: {
    labelKey: 'inventory.status.outOfStock',
    class: 'bg-rose-50 text-rose-700',
    dotClass: 'bg-rose-500',
  },
}

const summaryCards = computed(() => [
  {
    label: t('inventory.summary.totalSupplies'),
    value: formatNumber(totalSupplies.value),
    detail: t('inventory.summary.stockHealth', { percentage: stockHealthPercentage.value }),
    icon: Archive,
    class: 'text-[#974400] bg-[#FFF7ED]',
  },
  {
    label: t('inventory.summary.lowStock'),
    value: formatNumber(lowStockItems.value.length),
    detail: t('inventory.summary.newCount', { count: lowStockItems.value.length }),
    icon: AlertTriangle,
    class: 'text-amber-600 bg-amber-50',
  },
  {
    label: t('inventory.summary.outOfStock'),
    value: formatNumber(outOfStockItems.value.length),
    detail: t('inventory.summary.alertCount', { count: outOfStockItems.value.length }),
    icon: Box,
    class: 'text-rose-600 bg-rose-50',
  },
])

const resetSupplyForm = () => {
  supplyForm.name = ''
  supplyForm.quantity = 0
  supplyForm.unitOfMeasure = 'Packs'
  supplyForm.minAlertThreshold = 5
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
    supplyForm.minAlertThreshold = item.minAlertThreshold
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
  adjustmentForm.notes = ''
  isAdjustmentModalOpen.value = true
}

const closeAdjustmentModal = () => {
  isAdjustmentModalOpen.value = false
  selectedItem.value = null
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
      quantity: supplyForm.quantity,
      min_alert_threshold: supplyForm.minAlertThreshold,
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

const clearFilters = () => {
  selectedStatus.value = 'all'
  selectedUnit.value = 'all'
}

watch([searchQuery, selectedStatus, selectedUnit], () => {
  currentPage.value = 1
})

let searchDebounceTimeout: ReturnType<typeof setTimeout> | null = null
watch([searchQuery, selectedStatus, selectedUnit], () => {
  if (searchDebounceTimeout) {
    clearTimeout(searchDebounceTimeout)
  }

  searchDebounceTimeout = setTimeout(() => {
    inventoryStore.fetchItems(inventoryQueryFilters.value).catch(() => {
      toast.error(t('inventory.messages.loadError'))
    })
  }, 300)
})

watch(totalPages, pages => {
  if (currentPage.value > pages) currentPage.value = pages
})

onMounted(() => {
  inventoryStore.fetchItems(inventoryQueryFilters.value).catch(() => {
    toast.error(t('inventory.messages.loadError'))
  })
})
</script>

<template>
  <div class="h-full overflow-y-auto bg-[#F9FAFB] p-8 text-[#1A1C1C]">
    <div class="flex w-full flex-col gap-5">
      <div class="grid gap-5 md:grid-cols-3">
        <Card
          v-for="card in summaryCards"
          :key="card.label"
          class="flex-row items-center justify-between rounded-xl border-none bg-white p-6 shadow-sm"
        >
          <div>
            <div
              class="mb-5 flex size-10 items-center justify-center rounded-xl"
              :class="card.class"
            >
              <component :is="card.icon" class="size-5" />
            </div>
            <p class="text-[11px] font-black uppercase tracking-wide text-[#A3A3A3]">
              {{ card.label }}
            </p>
            <p class="mt-1 text-2xl font-black text-[#1A1C1C]">{{ card.value }}</p>
          </div>
          <span class="self-start text-xs font-black" :class="card.class.split(' ')[0]">
            {{ card.detail }}
          </span>
        </Card>
      </div>

      <div class="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div class="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
          <div class="relative w-full max-w-[500px]">
            <Search class="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[#A3A3A3]" />
            <Input
              v-model="searchQuery"
              :placeholder="t('inventory.searchPlaceholder')"
              class="h-11 rounded-xl border border-slate-200 bg-white pl-11 text-sm font-semibold shadow-sm"
            />
          </div>
          <Button
            variant="secondary"
            class="h-11 rounded-xl border bg-white px-5 font-bold hover:bg-slate-50"
            :class="
              isFilterPanelOpen || activeFilterCount > 0
                ? 'border-[#974400] text-[#974400]'
                : 'border-slate-200'
            "
            @click="isFilterPanelOpen = !isFilterPanelOpen"
          >
            <SlidersHorizontal class="size-4" />
            {{ t('inventory.actions.filters') }}
            <span
              v-if="activeFilterCount > 0"
              class="flex size-5 items-center justify-center rounded-full bg-[#974400] text-[11px] text-white"
            >
              {{ activeFilterCount }}
            </span>
          </Button>
        </div>
        <Button
          class="h-11 rounded-xl bg-primary px-6 font-bold text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90"
          @click="openSupplyModal('add')"
        >
          <Plus class="size-4" />
          {{ t('inventory.actions.addItem') }}
        </Button>

        <Card
          v-if="isFilterPanelOpen"
          class="absolute left-0 top-[calc(100%+0.5rem)] z-20 w-full max-w-[640px] gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-lg sm:left-[calc(500px+0.75rem)] sm:w-[420px]"
        >
          <div class="grid gap-3 sm:grid-cols-2">
            <Label class="flex flex-col items-start gap-2 text-xs font-black text-[#737373]">
              {{ t('inventory.filters.status') }}
              <Select v-model="selectedStatus">
                <SelectTrigger class="h-10 rounded-xl bg-[#FAFAFA] font-bold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{{ t('inventory.filters.allStatuses') }}</SelectItem>
                  <SelectItem value="in_stock">{{ t('inventory.status.inStock') }}</SelectItem>
                  <SelectItem value="low_stock">{{ t('inventory.status.lowStock') }}</SelectItem>
                  <SelectItem value="out_of_stock">
                    {{ t('inventory.status.outOfStock') }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </Label>

            <Label class="flex flex-col items-start gap-2 text-xs font-black text-[#737373]">
              {{ t('inventory.filters.unit') }}
              <Select v-model="selectedUnit">
                <SelectTrigger class="h-10 rounded-xl bg-[#FAFAFA] font-bold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{{ t('inventory.filters.allUnits') }}</SelectItem>
                  <SelectItem v-for="unit in unitFilterOptions" :key="unit" :value="unit">
                    {{ unit }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </Label>
          </div>

          <div class="flex justify-end">
            <Button
              variant="tertiary"
              class="h-8 text-xs font-black text-[#974400]"
              :disabled="activeFilterCount === 0"
              @click="clearFilters"
            >
              {{ t('inventory.filters.clear') }}
            </Button>
          </div>
        </Card>
      </div>

      <Card class="overflow-hidden rounded-xl border-none bg-white p-0 text-[#1A1C1C] shadow-sm">
        <div class="overflow-x-auto">
          <table class="w-full min-w-[820px] text-left">
            <thead>
              <tr class="bg-[#FCFCFC] text-[11px] font-black uppercase text-[#A3A3A3]">
                <th class="px-6 py-4">{{ t('inventory.table.name') }}</th>
                <th class="px-6 py-4">{{ t('inventory.table.stockLevel') }}</th>
                <th class="px-6 py-4">{{ t('inventory.table.unit') }}</th>
                <th class="px-6 py-4 text-center">{{ t('inventory.table.status') }}</th>
                <th class="px-6 py-4 text-center">{{ t('inventory.table.actions') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="isLoading">
                <td colspan="5" class="px-6 py-12 text-center text-sm font-bold text-[#A3A3A3]">
                  {{ t('inventory.messages.loading') }}
                </td>
              </tr>
              <tr v-else-if="filteredItems.length === 0">
                <td colspan="5" class="px-6 py-12 text-center text-sm font-bold text-[#A3A3A3]">
                  {{ t('inventory.messages.empty') }}
                </td>
              </tr>
              <tr
                v-for="item in paginatedItems"
                v-else
                :key="item.id"
                class="border-b border-slate-100 text-sm font-bold text-[#1A1C1C] last:border-0"
              >
                <td class="px-6 py-4">
                  <div class="flex items-center gap-3">
                    <div
                      class="flex size-11 items-center justify-center overflow-hidden rounded-xl bg-stone-100"
                    >
                      <img
                        v-if="item.imageUrl"
                        :src="getImageUrl(item.imageUrl)"
                        :alt="item.name"
                        class="h-full w-full object-cover"
                      />
                      <ImagePlus v-else class="size-5 text-stone-400" />
                    </div>
                    <div>
                      <p class="text-[#1A1C1C]">{{ item.name }}</p>
                    </div>
                  </div>
                </td>
                <td
                  class="px-6 py-4"
                  :class="item.status === 'out_of_stock' ? 'text-rose-600' : 'text-[#1A1C1C]'"
                >
                  {{ formatNumber(item.quantity) }}
                </td>
                <td class="px-6 py-4 text-[#737373]">{{ item.unitOfMeasure }}</td>
                <td class="px-6 py-4 text-center">
                  <span
                    class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-black"
                    :class="statusMeta[item.status].class"
                  >
                    <span class="size-1.5 rounded-full" :class="statusMeta[item.status].dotClass" />
                    {{ t(statusMeta[item.status].labelKey) }}
                  </span>
                </td>
                <td class="px-6 py-4">
                  <div class="flex items-center justify-center gap-5">
                    <Button
                      variant="tertiary"
                      size="icon"
                      class="size-5 rounded-none hover:bg-transparent hover:no-underline"
                      :title="t('inventory.actions.adjust')"
                      @click="openAdjustmentModal(item)"
                    >
                      <i class="fa fa-window-maximize text-[#D66A1F]" aria-hidden="true">
                        <svg viewBox="0 0 16 16" class="size-4 fill-current">
                          <path
                            d="M2.25 1.5h11.5c.41 0 .75.34.75.75v11.5c0 .41-.34.75-.75.75H2.25a.75.75 0 0 1-.75-.75V2.25c0-.41.34-.75.75-.75Zm1 2.25v8.5h9.5v-8.5h-9.5Zm1.25 1.5h4.25v1.5H4.5v-1.5Zm6.75 1.25-5.5 5.5h5.5v-5.5Z"
                          />
                        </svg>
                      </i>
                    </Button>
                    <Button
                      variant="tertiary"
                      size="icon"
                      class="size-5 rounded-none text-[#16A34A] hover:bg-transparent hover:no-underline"
                      :title="t('inventory.actions.view')"
                      @click="openSupplyModal('view', item)"
                    >
                      <Eye class="size-4 stroke-[2.4]" />
                    </Button>
                    <Button
                      variant="tertiary"
                      size="icon"
                      class="size-5 rounded-none text-[#2563EB] hover:bg-transparent hover:no-underline"
                      :title="t('inventory.actions.edit')"
                      @click="openSupplyModal('edit', item)"
                    >
                      <Pencil class="size-4 stroke-[2.4]" />
                    </Button>
                    <Button
                      variant="tertiary"
                      size="icon"
                      class="size-5 rounded-none text-[#EF4444] hover:bg-transparent hover:no-underline"
                      :title="t('inventory.actions.delete')"
                      @click="openDeleteConfirm(item)"
                    >
                      <Trash2 class="size-4 stroke-[2.4]" />
                    </Button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <footer
          class="flex flex-col gap-3 border-t border-slate-100 px-6 py-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <p class="text-xs font-semibold text-[#737373]">
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
              class="size-8 rounded-lg border border-slate-200 text-[#A3A3A3]"
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
                  : 'border-slate-200 text-[#737373]'
              "
              @click="currentPage = page"
            >
              {{ page }}
            </Button>
            <Button
              variant="tertiary"
              size="icon"
              class="size-8 rounded-lg border border-slate-200 text-[#A3A3A3]"
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
          class="overflow-hidden rounded-xl border-none bg-white p-0 shadow-md shadow-slate-200/70"
        >
          <div
            class="flex items-center gap-2 border-b border-rose-100 bg-rose-50 px-6 py-4 text-sm font-black uppercase tracking-wide text-rose-700"
          >
            <CircleAlert class="size-4 fill-rose-700 text-white" />
            {{ t('inventory.panels.criticalStock', { count: outOfStockItems.length }) }}
          </div>
          <div class="min-h-[110px] space-y-4 p-5">
            <div v-if="outOfStockItems.length === 0" class="text-sm font-bold text-[#A3A3A3]">
              {{ t('inventory.panels.noCriticalStock') }}
            </div>
            <div
              v-for="item in displayedCriticalStockItems"
              :key="item.id"
              class="flex items-center justify-between gap-3"
            >
              <div class="flex items-center gap-3">
                <div
                  class="flex size-10 items-center justify-center overflow-hidden rounded-lg bg-rose-50"
                >
                  <img
                    v-if="item.imageUrl"
                    :src="getImageUrl(item.imageUrl)"
                    :alt="item.name"
                    class="h-full w-full object-cover"
                  />
                  <ImagePlus v-else class="size-5 text-rose-400" />
                </div>
                <div>
                  <p class="text-sm font-black text-[#1A1C1C]">{{ item.name }}</p>
                  <p class="text-xs font-semibold text-[#A3A3A3]">
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
              class="h-9 w-full rounded-lg bg-[#FAFAFA] text-xs font-black uppercase text-[#1A1C1C] hover:bg-[#F4F4F5] hover:no-underline"
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
          class="overflow-hidden rounded-xl border-none bg-white p-0 shadow-md shadow-slate-200/70"
        >
          <div
            class="flex items-center gap-2 border-b border-amber-100 bg-amber-50 px-6 py-4 text-sm font-black uppercase tracking-wide text-amber-700"
          >
            <AlertTriangle class="size-4 fill-amber-600 text-white" />
            {{ t('inventory.panels.lowStockWarnings', { count: lowStockItems.length }) }}
          </div>
          <div class="min-h-[110px] space-y-4 p-5">
            <div v-if="lowStockItems.length === 0" class="text-sm font-bold text-[#A3A3A3]">
              {{ t('inventory.panels.noLowStock') }}
            </div>
            <div
              v-for="item in displayedLowStockItems"
              :key="item.id"
              class="flex items-center justify-between gap-3"
            >
              <div class="flex items-center gap-3">
                <div
                  class="flex size-10 items-center justify-center overflow-hidden rounded-lg bg-amber-50"
                >
                  <img
                    v-if="item.imageUrl"
                    :src="getImageUrl(item.imageUrl)"
                    :alt="item.name"
                    class="h-full w-full object-cover"
                  />
                  <ImagePlus v-else class="size-5 text-amber-400" />
                </div>
                <div>
                  <p class="text-sm font-black text-[#1A1C1C]">{{ item.name }}</p>
                  <p class="text-xs font-black uppercase text-amber-600">
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
              class="h-9 w-full rounded-lg bg-[#FAFAFA] text-xs font-black uppercase text-[#1A1C1C] hover:bg-[#F4F4F5] hover:no-underline"
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
      <Card class="w-full max-w-[520px] gap-0 overflow-hidden rounded-2xl border-none bg-white p-0">
        <header class="flex items-center justify-between border-b border-slate-100 px-6 py-5">
          <h2 class="text-lg font-black text-[#1A1C1C]">{{ getModalTitle() }}</h2>
          <Button variant="tertiary" size="icon" class="size-8" @click="closeSupplyModal">
            <X class="size-4" />
          </Button>
        </header>

        <div class="space-y-4 p-6">
          <Label class="flex flex-col items-start gap-2 text-xs font-black text-[#737373]">
            <span>
              {{ t('inventory.form.itemName') }}
              <span class="text-rose-600">{{ t('inventory.form.required') }}</span>
            </span>
            <Input
              v-model="supplyForm.name"
              :disabled="supplyModalMode === 'view'"
              :placeholder="t('inventory.form.itemNamePlaceholder')"
              :aria-invalid="hasSupplyNameError"
              class="h-11 rounded-xl bg-[#FAFAFA] font-bold"
              :class="
                hasSupplyNameError
                  ? 'border-rose-300 text-rose-700 focus-visible:ring-rose-200'
                  : ''
              "
              required
              @blur="supplyNameTouched = true"
            />
            <span v-if="hasSupplyNameError" class="text-xs font-bold text-rose-600">
              {{ t('inventory.messages.nameRequired') }}
            </span>
          </Label>

          <div class="grid gap-4 sm:grid-cols-2">
            <Label class="flex flex-col items-start gap-2 text-xs font-black text-[#737373]">
              {{ t('inventory.form.numberOfItems') }}
              <Input
                v-model="supplyForm.quantity"
                :disabled="supplyModalMode === 'view'"
                type="number"
                min="0"
                step="1"
                class="h-11 rounded-xl bg-[#FAFAFA] text-right font-bold"
                @blur="supplyForm.quantity = toWholeNumber(supplyForm.quantity)"
              />
            </Label>
            <Label class="flex flex-col items-start gap-2 text-xs font-black text-[#737373]">
              {{ t('inventory.form.unitOfMeasure') }}
              <Select v-model="supplyForm.unitOfMeasure" :disabled="supplyModalMode === 'view'">
                <SelectTrigger class="h-11 rounded-xl bg-[#FAFAFA] font-bold">
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

          <Label class="flex flex-col items-start gap-2 text-xs font-black text-[#737373]">
            {{ t('inventory.form.minAlert') }}
            <Input
              v-model="supplyForm.minAlertThreshold"
              :disabled="supplyModalMode === 'view'"
              type="number"
              min="0"
              step="1"
              :placeholder="t('inventory.form.minAlertPlaceholder')"
              class="h-11 rounded-xl bg-[#FAFAFA] font-bold"
              @blur="supplyForm.minAlertThreshold = toWholeNumber(supplyForm.minAlertThreshold)"
            />
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

        <footer class="flex justify-end gap-3 border-t border-slate-100 bg-[#FAFAFA] px-6 py-4">
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
      <Card class="w-full max-w-[420px] gap-0 overflow-hidden rounded-2xl border-none bg-white p-0">
        <header class="flex items-center justify-between border-b border-slate-100 px-6 py-5">
          <h2 class="text-lg font-black text-[#1A1C1C]">
            {{ t('inventory.deleteConfirm.title') }}
          </h2>
          <Button variant="tertiary" size="icon" class="size-8" @click="closeDeleteConfirm">
            <X class="size-4" />
          </Button>
        </header>

        <div class="space-y-3 p-6">
          <p class="text-sm font-semibold leading-6 text-[#737373]">
            {{
              t('inventory.deleteConfirm.message', {
                name: itemPendingDelete.name,
              })
            }}
          </p>
        </div>

        <footer class="flex justify-end gap-3 border-t border-slate-100 bg-[#FAFAFA] px-6 py-4">
          <Button
            variant="tertiary"
            class="h-11 rounded-xl px-6 font-bold text-[#1A1C1C]"
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
        class="w-full max-w-[414px] gap-0 overflow-hidden rounded-[14px] border-none bg-white p-0 shadow-2xl"
      >
        <header class="flex items-center justify-between border-b border-slate-100 px-5 py-[18px]">
          <h2 class="text-base font-medium text-[#222222]">
            {{ t('inventory.adjustment.title') }}
          </h2>
          <Button
            variant="tertiary"
            size="icon"
            class="size-8 text-[#9A9A9A] hover:text-[#2D241E]"
            @click="closeAdjustmentModal"
          >
            <X class="size-5" />
          </Button>
        </header>

        <div class="space-y-5 px-5 py-[22px]">
          <div class="flex items-center gap-4 rounded-lg bg-[#F4F4F4] p-4">
            <div
              class="flex size-[38px] shrink-0 items-center justify-center overflow-hidden rounded-md bg-white shadow-sm"
            >
              <img
                v-if="selectedItem.imageUrl"
                :src="getImageUrl(selectedItem.imageUrl)"
                :alt="selectedItem.name"
                class="h-full w-full object-cover"
              />
              <Box v-else class="size-5 text-stone-400" />
            </div>
            <div>
              <p class="text-sm font-medium leading-5 text-[#2D241E]">{{ selectedItem.name }}</p>
              <p class="text-xs leading-5 text-[#666666]">
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
            <p class="mb-3 text-sm font-normal uppercase text-[#8A8A8A]">
              {{ t('inventory.adjustment.typeAndAmount') }}
            </p>
            <div class="grid h-9 grid-cols-2 overflow-hidden rounded-md bg-[#F3F3F3] p-[3px]">
              <Button
                variant="tertiary"
                class="h-full rounded px-3 text-[11px] font-bold uppercase leading-none text-[#5D5D5D] no-underline hover:no-underline"
                :class="
                  adjustmentForm.adjustmentType === 'add' ? 'bg-white text-[#A64E05] shadow-sm' : ''
                "
                @click="setAdjustmentType('add')"
              >
                <CirclePlus class="size-3.5" />
                {{ t('inventory.adjustment.addStock') }}
              </Button>
              <Button
                variant="tertiary"
                class="h-full rounded px-3 text-[11px] font-bold uppercase leading-none text-[#5D5D5D] no-underline hover:no-underline"
                :class="
                  adjustmentForm.adjustmentType === 'remove'
                    ? 'bg-white text-[#A64E05] shadow-sm'
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
            class="grid h-[54px] grid-cols-[46px_minmax(0,1fr)_64px_46px] items-center rounded-xl border border-[#E1E1E1] bg-[#FAFAFA] shadow-sm"
          >
            <Button
              variant="tertiary"
              size="icon"
              class="size-full rounded-none text-[#A64E05] hover:bg-transparent"
              :disabled="
                adjustmentForm.amount <= (isRemovingStock && adjustmentMaxAmount === 0 ? 0 : 1)
              "
              @click="setAdjustmentAmount(Number(adjustmentForm.amount) - 1)"
            >
              <Minus class="size-4" />
            </Button>
            <Input
              v-model="adjustmentForm.amount"
              type="number"
              min="1"
              :max="Number.isFinite(adjustmentMaxAmount) ? adjustmentMaxAmount : undefined"
              step="1"
              class="h-full border-0 bg-transparent px-0 text-right text-xl font-normal text-[#222222] shadow-none [appearance:textfield] focus-visible:ring-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              @input="setAdjustmentAmount(adjustmentForm.amount)"
              @blur="setAdjustmentAmount(adjustmentForm.amount)"
            />
            <span class="pl-4 text-sm font-normal text-[#B2B2B2]">
              {{ selectedItem.unitOfMeasure }}
            </span>
            <Button
              variant="tertiary"
              size="icon"
              class="size-full rounded-none text-[#A64E05] hover:bg-transparent"
              :disabled="isRemovingStock && adjustmentForm.amount >= adjustmentMaxAmount"
              @click="setAdjustmentAmount(Number(adjustmentForm.amount) + 1)"
            >
              <Plus class="size-4" />
            </Button>
          </div>

          <Label
            class="flex flex-col items-start gap-3 text-sm font-normal uppercase text-[#8A8A8A]"
          >
            {{ t('inventory.adjustment.notes') }}
            <Textarea
              v-model="adjustmentForm.notes"
              :placeholder="t('inventory.adjustment.notesPlaceholder')"
              class="min-h-[88px] resize-none rounded-xl border-[#E1E1E1] bg-white px-4 py-3 text-base font-normal normal-case text-[#2D241E] shadow-sm placeholder:text-[#7D8796] focus-visible:ring-0"
            />
          </Label>
        </div>

        <footer class="flex gap-3 border-t border-slate-100 bg-[#F1F1F1] px-5 py-[18px]">
          <Button
            variant="tertiary"
            class="h-[46px] flex-1 rounded-lg border border-[#E4E4E4] bg-white px-6 text-sm font-normal text-[#444444] shadow-sm hover:bg-white hover:no-underline"
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
