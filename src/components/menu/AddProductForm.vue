<script setup lang="ts">
import { reactive, watch, computed, onMounted, ref } from 'vue'
import { onClickOutside } from '@vueuse/core'
import { useI18n } from 'vue-i18n'
import { ComboboxSelect } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { RadioGroupRoot, RadioGroupItem, RadioGroupIndicator } from 'reka-ui'
import { BookOpen, ChevronDown, Pencil, Plus, Save, Trash2, X } from 'lucide-vue-next'
import { useProductStore } from '@/store/useProductStore'
import { useVariationTemplateStore } from '@/store/useVariationTemplateStore'
import { productFormSchema, type CreateProductPayload } from '@/validations/productValidation'
import {
  createVariationTemplatePayloadSchema,
  updateVariationTemplatePayloadSchema,
} from '@/validations/variationTemplateValidation'
import { PRICE_MODE, TYPE, OPTIONS_SET_TYPE } from '@/constants/product'
import { toast } from 'vue-sonner'
import ImageUpload from '@/components/common/ImageUpload.vue'
import type {
  ProductOptionSet,
  OptionSetElement,
  SizeRow,
  Choice,
  OptionGroup,
  ItemForm,
  Product,
} from '@/types/product.types'
import type { VariationTemplate } from '@/types/variationTemplate.types'

const { t } = useI18n()

// ── Props ──────────────────────────────────────────────────────────────────
const props = defineProps<{
  editingProduct?: Product | null
}>()

// ── Constants ──────────────────────────────────────────────────────────
const productStore = useProductStore()
const variationTemplateStore = useVariationTemplateStore()

const PRICE_MODE_OPTIONS = computed(() => [
  {
    value: PRICE_MODE.FIXED,
    label: t('menuManagement.productForm.pricingMode.0.label'),
    hint: t('menuManagement.productForm.pricingMode.0.hint'),
  },
  {
    value: PRICE_MODE.BY_SIZE,
    label: t('menuManagement.productForm.pricingMode.1.label'),
    hint: t('menuManagement.productForm.pricingMode.1.hint'),
  },
])

const ITEM_TYPE_OPTIONS = computed(() => [
  { value: TYPE.DRINK, label: t('menuManagement.productForm.itemType.drink'), id: 'r-drink' },
  { value: TYPE.FOOD, label: t('menuManagement.productForm.itemType.food'), id: 'r-food' },
])

// ── Shared class strings ───────────────────────────────────────────────────
const CLS = {
  label:
    'text-[11px] font-black text-[#564338] dark:text-stone-100 uppercase tracking-widest ml-0.5 block',
  Input:
    'w-full px-4 py-3 bg-[#f3f3f4] dark:bg-stone-800 dark:text-stone-100 rounded-xl text-[14px] border-none outline-none focus:ring-2 focus:ring-[#D2691E]/30',
  InputSm:
    'w-full px-4 py-3 bg-[#f3f3f4] dark:bg-stone-800 dark:text-stone-100 rounded-xl text-[13px] border-none outline-none focus:ring-2 focus:ring-[#D2691E]/30',
  prefix:
    'absolute left-4 -translate-y-1/2 text-zinc-400 dark:text-zinc-500 text-sm pointer-events-none',
  addBtn:
    'flex items-center gap-1.5 text-[#D2691E] text-sm font-semibold hover:opacity-75 transition-opacity px-1',
  actionBtn:
    'flex items-center gap-2 px-3 py-2 rounded-xl bg-[#D2691E]/10 text-[#D2691E] text-sm font-semibold hover:bg-[#D2691E]/20 transition-colors shrink-0',
  iconDanger:
    'flex items-center justify-center rounded-xl text-red-400 dark:text-red-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors disabled:opacity-30 disabled:cursor-not-allowed',
} as const

// ── Factories ──────────────────────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2, 9)
const makeSize = (): SizeRow => ({ id: uid(), size: '', price: null })
const makeChoice = (): Choice => ({ id: uid(), label: '', priceModifier: null })
const makeGroup = (): OptionGroup => ({
  id: uid(),
  name: '',
  choices: [makeChoice()],
  type: OPTIONS_SET_TYPE.CUSTOM,
})

const DEFAULT_FORM = (): ItemForm => ({
  name: '',
  category: '',
  type: TYPE.DRINK,
  priceMode: PRICE_MODE.FIXED,
  price: null,
  sizes: [makeSize()],
  optionGroups: [],
  description: '',
  imageUrl: null,
})

// ── State ──────────────────────────────────────────────────────────────────
const form = reactive<ItemForm>(DEFAULT_FORM())
const selectedImageFile = ref<File | null>(null)
const variationTemplates = computed(() => variationTemplateStore.templates)
const templateMenuRef = ref<HTMLElement | null>(null)
const isTemplateMenuOpen = ref(false)
onClickOutside(templateMenuRef, () => {
  isTemplateMenuOpen.value = false
})
const isTemplateEditorOpen = ref(false)
const editingTemplateId = ref<number | null>(null)
const templateDraft = reactive({
  name: '',
  choices: [] as Array<{
    id: string
    label: string
    priceModifier: number
  }>,
})

const showPrice = () => form.type === TYPE.FOOD || form.priceMode === PRICE_MODE.FIXED
const showSizes = () => form.type === TYPE.DRINK && form.priceMode === PRICE_MODE.BY_SIZE
const showPriceMode = () => form.type === TYPE.DRINK
const showOptionGroups = () => form.type === TYPE.DRINK

// ── Sizes ──────────────────────────────────────────────────────────────────
function addSize() {
  form.sizes.push(makeSize())
}
function removeSize(id: string) {
  if (form.sizes.length === 1) return
  form.sizes = form.sizes.filter(r => r.id !== id)
}

// ── Option groups ──────────────────────────────────────────────────────────
function addOptionGroup() {
  form.optionGroups.push(makeGroup())
}
function removeOptionGroup(id: string) {
  form.optionGroups = form.optionGroups.filter(g => g.id !== id)
}
function resetTemplateDraft() {
  editingTemplateId.value = null
  templateDraft.name = ''
  templateDraft.choices = []
}
function closeTemplateEditor() {
  isTemplateEditorOpen.value = false
  resetTemplateDraft()
}
function buildTemplateOptionsPayload(
  choices: Array<{ label: string; priceModifier?: number | null }>
) {
  return choices
    .filter(choice => choice.label.trim())
    .map((choice, index) => ({
      optionLabel: choice.label.trim(),
      priceModifier: Number(choice.priceModifier) || 0,
      displayOrder: index,
    }))
}
async function saveOptionGroupAsTemplate(group: OptionGroup) {
  const name = group.name.trim()
  const options = buildTemplateOptionsPayload(group.choices)

  const validation = createVariationTemplatePayloadSchema.safeParse({ name, options })
  if (!validation.success) {
    toast.error(t(validation.error.issues[0].message))
    return
  }

  const existing = variationTemplateStore.templates.find(
    template => template.name.toLowerCase() === validation.data.name.toLowerCase()
  )

  try {
    if (existing) {
      const confirmed = window.confirm(
        t('menuManagement.productForm.templateEditor.replaceConfirm', { name: existing.name })
      )
      if (!confirmed) return
      await variationTemplateStore.updateTemplate(existing.id, validation.data)
    } else {
      await variationTemplateStore.createTemplate(validation.data)
    }
    toast.success(t('menuManagement.productForm.templateEditor.toastSaved'))
  } catch {
    toast.error(t('menuManagement.productForm.templateEditor.toastError'))
  }
}
function openTemplateEditor(template: VariationTemplate) {
  editingTemplateId.value = template.id
  templateDraft.name = template.name
  templateDraft.choices = template.options.map(option => ({
    id: uid(),
    label: option.optionLabel,
    priceModifier: option.priceModifier,
  }))
  isTemplateMenuOpen.value = false
  isTemplateEditorOpen.value = true
}
function addTemplateDraftChoice() {
  templateDraft.choices.push({ id: uid(), label: '', priceModifier: 0 })
}
function removeTemplateDraftChoice(id: string) {
  if (templateDraft.choices.length === 1) return
  templateDraft.choices = templateDraft.choices.filter(choice => choice.id !== id)
}
async function saveEditedTemplate() {
  if (!editingTemplateId.value) return

  const options = buildTemplateOptionsPayload(templateDraft.choices)

  const validation = updateVariationTemplatePayloadSchema.safeParse({
    name: templateDraft.name.trim(),
    options,
  })
  if (!validation.success) {
    toast.error(t(validation.error.issues[0].message))
    return
  }

  const duplicateName = variationTemplateStore.templates.some(
    template =>
      template.id !== editingTemplateId.value &&
      template.name.toLowerCase() === validation.data.name?.toLowerCase()
  )
  if (duplicateName) {
    toast.error(t('menuManagement.productForm.templateEditor.validation.duplicateName'))
    return
  }

  try {
    await variationTemplateStore.updateTemplate(editingTemplateId.value, validation.data)
    closeTemplateEditor()
    toast.success(t('menuManagement.productForm.templateEditor.toastUpdated'))
  } catch {
    toast.error(t('menuManagement.productForm.templateEditor.toastError'))
  }
}
async function deleteVariationTemplate(template: VariationTemplate) {
  const confirmed = window.confirm(
    t('menuManagement.productForm.templateEditor.deleteConfirm', { name: template.name })
  )
  if (!confirmed) return

  try {
    await variationTemplateStore.deleteTemplate(template.id)
    if (variationTemplateStore.templates.length === 0) {
      isTemplateMenuOpen.value = false
    }
    toast.success(t('menuManagement.productForm.templateEditor.toastDeleted'))
  } catch {
    toast.error(t('menuManagement.productForm.templateEditor.toastError'))
  }
}
function applyVariationTemplate(template: VariationTemplate) {
  const hasSameGroup = form.optionGroups.some(
    group => group.name.trim().toLowerCase() === template.name.toLowerCase()
  )

  if (hasSameGroup) {
    const confirmed = window.confirm(
      t('menuManagement.productForm.templateEditor.duplicateApplyConfirm', { name: template.name })
    )
    if (!confirmed) return
  }

  form.optionGroups.push({
    id: uid(),
    name: template.name,
    type: OPTIONS_SET_TYPE.CUSTOM,
    choices: template.options.map(option => ({
      id: uid(),
      label: option.optionLabel,
      priceModifier: option.priceModifier,
    })),
  })
  isTemplateMenuOpen.value = false
  toast.success(
    t('menuManagement.productForm.templateEditor.toastApplied', { name: template.name })
  )
}
function addChoice(group: OptionGroup) {
  group.choices.push(makeChoice())
}
function removeChoice(group: OptionGroup, id: string) {
  group.choices = group.choices.filter(c => c.id !== id)
}

// ── Drag-to-reorder ────────────────────────────────────────────────────────
const drag = reactive({
  fromId: null as string | null,
  overId: null as string | null,
  canDrag: false,
})

function onHandleMouseDown() {
  drag.canDrag = true
}
function onDragStart(e: DragEvent, id: string) {
  drag.fromId = id
  e.dataTransfer!.effectAllowed = 'move'
}
function onDragOver(e: DragEvent, id: string) {
  e.preventDefault()
  e.dataTransfer!.dropEffect = 'move'
  drag.overId = id
}
function onDrop(toId: string) {
  if (!drag.fromId || drag.fromId === toId) return
  const list = [...form.optionGroups]
  const from = list.findIndex(g => g.id === drag.fromId)
  const to = list.findIndex(g => g.id === toId)
  list.splice(to, 0, list.splice(from, 1)[0])
  form.optionGroups = list
  drag.fromId = drag.overId = null
}
function onDragEnd() {
  drag.fromId = null
  drag.overId = null
  drag.canDrag = false
}

// ── Mounted ───────────────────────────────────────────────────────
onMounted(async () => {
  await Promise.all([variationTemplateStore.fetchTemplates(), productStore.fetchCategories()])
})

// ── Computed ───────────────────────────────────────────────────────────
const categoryOptions = computed(() =>
  productStore.categories.filter(c => c.isActive).map(c => ({ label: c.name, value: c.id }))
)

// ── Emit ───────────────────────────────────────────────────────────
const emit = defineEmits<{
  close: []
  success: []
}>()

// ── Form actions ───────────────────────────────────────────────────────────

const isSubmitting = ref(false)
const validationErrors = ref<Record<string, string>>({})

const getError = (path: string) => validationErrors.value[path]
const clearError = (path: string) => {
  if (validationErrors.value[path]) {
    delete validationErrors.value[path]
  }
}

async function handleSubmit() {
  try {
    validationErrors.value = {}
    isSubmitting.value = true

    // Validate form
    const validation = productFormSchema.safeParse(form)
    if (!validation.success) {
      validation.error.issues.forEach(err => {
        const path = err.path.join('.')
        validationErrors.value[path] = t(err.message)
      })
      toast.error('Please fix validation errors')
      return
    }
    const data = validation.data

    // Transform form data to API payload
    const categoryId = Number(data.category)
    if (isNaN(categoryId)) {
      toast.error('Invalid category selected')
      return
    }

    if (selectedImageFile.value) {
      try {
        const uploadedUrl = await productStore.uploadImage(selectedImageFile.value)
        data.imageUrl = uploadedUrl
      } catch (uploadErr) {
        console.error('Image upload failed:', uploadErr)
        toast.error('Failed to upload image')
        return
      }
    }
    // Add sizes as an option set if present
    if (data.priceMode === PRICE_MODE.BY_SIZE && data.sizes?.length) {
      data.optionGroups.unshift({
        id: uid(),
        name: 'Sizes & Prices',
        type: OPTIONS_SET_TYPE.SIZE,
        choices: data.sizes.map(s => ({
          id: uid(),
          label: s.size,
          priceModifier: s.price ? Number(s.price) : 0,
        })),
      })
    }

    const commonPayload = {
      name: data.name,
      categoryId,
      type: data.type,
      description: data.description || undefined,
      imageUrl: data.imageUrl,
      isAvailable: true, // Set default availability to true
      optionSets:
        data.optionGroups.length > 0
          ? data.optionGroups.map(group => ({
              name: group.name,
              type: group.type || OPTIONS_SET_TYPE.CUSTOM,
              isRequired: false, // Default to not required, can be extended in UI later
              elements: group.choices.map(choice => ({
                label: choice.label,
                priceModifier: choice.priceModifier ? Number(choice.priceModifier) : 0,
                position: 0, // Position can be managed for ordering if needed
              })),
            }))
          : undefined,
    }

    const payload: CreateProductPayload =
      data.priceMode === PRICE_MODE.FIXED
        ? {
            ...commonPayload,
            priceMode: PRICE_MODE.FIXED,
            price: Number(data.price),
          }
        : {
            ...commonPayload,
            priceMode: PRICE_MODE.BY_SIZE,
            price: null,
          }

    // Create or update product
    if (props.editingProduct) {
      // Update existing product
      await productStore.updateProduct(props.editingProduct.id, payload)
      toast.success('Product updated successfully')
    } else {
      // Create new product
      await productStore.createProduct(payload)
      toast.success('Product created successfully')
    }
    emit('success')
    emit('close')
    handleReset()
  } catch (err) {
    const error = err as Error
    console.error('Failed to save product:', error)
    toast.error(error.message || 'Failed to save product')
  } finally {
    isSubmitting.value = false
  }
}

function handleReset() {
  Object.assign(form, DEFAULT_FORM())
  selectedImageFile.value = null
  validationErrors.value = {}
}

const handleFileChange = (file: File | null) => {
  selectedImageFile.value = file
  if (file) {
    clearError('imageUrl')
  }
}

// ── Form watcher ───────────────────────────────────────────────────────────
watch(
  () => form.type,
  () => {
    form.priceMode = PRICE_MODE.FIXED
  }
)

watch(
  form,
  () => {
    if (Object.keys(validationErrors.value).length) {
      validationErrors.value = {}
    }
  },
  { deep: true }
)

watch(
  () => props.editingProduct?.id ?? null,
  async productId => {
    handleReset()
    if (!productId) return
    try {
      // Fetch fresh product data from backend
      const product = await productStore.fetchProductDetail(productId)

      form.name = product.name || ''
      form.category = product.category?.id || ''
      form.type = product.type || TYPE.DRINK
      form.priceMode = product.priceMode || PRICE_MODE.FIXED
      form.price = product.price || null
      form.imageUrl = product.imageUrl || null

      // Pre-fill sizes
      if (product.optionSets && product.optionSets.length > 0) {
        const sizeOptionSet = product.optionSets.find(
          (os: ProductOptionSet) => os.optionSet?.type === OPTIONS_SET_TYPE.SIZE
        )
        if (sizeOptionSet && sizeOptionSet.optionSet?.elements) {
          form.sizes = sizeOptionSet.optionSet.elements.map((el: OptionSetElement) => ({
            id: uid(),
            size: el.label,
            price: el.priceModifier || null,
          }))
        }

        // Pre-fill option groups (custom options)
        const customOptionSets = product.optionSets.filter(
          (os: ProductOptionSet) => os.optionSet?.type !== OPTIONS_SET_TYPE.SIZE
        )
        if (customOptionSets.length > 0) {
          form.optionGroups = customOptionSets.map((os: ProductOptionSet) => ({
            id: uid(),
            name: os.optionSet?.name || '',
            type: os.optionSet?.type,
            choices: (os.optionSet?.elements || []).map((el: OptionSetElement) => ({
              id: uid(),
              label: el.label,
              priceModifier: el.priceModifier || null,
            })),
          }))
        }
      }
    } catch (error) {
      console.error('Failed to fetch product details:', error)
      toast.error('Failed to load product details')
    }
  },
  { immediate: true }
)
</script>

<template>
  <form class="space-y-8 w-full mx-auto p-6" @submit.prevent="handleSubmit">
    <!-- ── Section: Basic Info ─────────────────────────────────────────── -->
    <section class="space-y-5">
      <div class="grid grid-cols-2 gap-5">
        <!-- Name -->
        <div class="space-y-2">
          <label for="item-name" :class="CLS.label">{{
            t('menuManagement.productForm.labels.itemName')
          }}</label>
          <AppInput
            v-model="form.name"
            type="text"
            :placeholder="t('menuManagement.productForm.labels.itemName')"
            :class="[
              'text-[#000000] dark:text-stone-100 h-11 rounded-xl bg-[#FAFAFA] dark:bg-stone-800 font-bold',
              getError('name') ? 'ring-2 ring-destructive/20 bg-destructive/5' : '',
            ]"
            :aria-invalid="Boolean(getError('name'))"
            @input="clearError('name')"
          />
          <p v-if="getError('name')" class="text-xs font-bold text-destructive ml-1">
            {{ getError('name') }}
          </p>
        </div>

        <!-- Category -->
        <div class="space-y-2">
          <label :class="CLS.label">{{ t('menuManagement.productForm.labels.category') }}</label>
          <div :class="['rounded-xl', getError('category') ? 'ring-2 ring-destructive/20' : '']">
            <combobox-select
              v-model="form.category"
              :options="categoryOptions"
              :has-selected-all-option="false"
              :placeholder="t('menuManagement.productForm.placeholders.selectCategory')"
              @update:model-value="clearError('category')"
            />
          </div>
          <p v-if="getError('category')" class="text-xs font-bold text-destructive ml-1">
            {{ getError('category') }}
          </p>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-5">
        <!-- Item Type -->
        <div class="space-y-2">
          <label :class="CLS.label">{{ t('menuManagement.productForm.labels.itemType') }}</label>
          <RadioGroupRoot
            v-model="form.type"
            class="flex flex-row gap-5 h-[46px] items-center"
            :aria-label="t('menuManagement.productForm.labels.itemType')"
            @update:model-value="clearError('type')"
          >
            <div v-for="opt in ITEM_TYPE_OPTIONS" :key="opt.value" class="flex items-center gap-2">
              <RadioGroupItem
                :id="opt.id"
                :value="opt.value"
                class="w-[1.125rem] h-[1.125rem] rounded-full border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-stone-800 shadow-sm outline-none focus:ring-2 focus:ring-[#D2691E]/30 data-[state=checked]:border-[#D2691E] data-[state=checked]:bg-[#D2691E] transition-colors cursor-pointer"
              >
                <RadioGroupIndicator
                  class="flex items-center justify-center w-full h-full after:content-[''] after:block after:w-2 after:h-2 after:rounded-full after:bg-white"
                />
              </RadioGroupItem>
              <label
                :for="opt.id"
                class="text-sm text-stone-700 dark:text-stone-300 leading-none cursor-pointer"
              >
                {{ opt.label }}
              </label>
            </div>
          </RadioGroupRoot>
          <p v-if="getError('type')" class="text-xs font-bold text-destructive ml-1">
            {{ getError('type') }}
          </p>
        </div>

        <!-- Price -->
        <div v-if="showPrice()" class="space-y-2">
          <label for="item-price" :class="CLS.label">{{
            t('menuManagement.productForm.labels.price')
          }}</label>
          <div class="relative">
            <span :class="[CLS.prefix, getError('price') ? 'top-1/3' : 'top-1/2']">$</span>
            <AppInput
              id="item-price"
              v-model="form.price"
              type="number"
              step="0.01"
              placeholder="0.00"
              :class="[
                'text-[#000000] dark:text-stone-100 h-11 rounded-xl bg-[#FAFAFA] dark:bg-stone-800 font-bold pl-8 top-1/2',
                getError('price') ? 'ring-2 ring-destructive/20 bg-destructive/5' : '',
              ]"
              :aria-invalid="Boolean(getError('price'))"
              @input="clearError('price')"
            />
            <p
              v-if="getError('price')"
              class="text-xs font-bold text-destructive mt-2"
              role="alert"
              aria-live="polite"
            >
              {{ getError('price') }}
            </p>
          </div>
        </div>
      </div>

      <!-- Pricing Mode (drinks only) -->
      <div v-if="showPriceMode()" class="space-y-2">
        <label :class="CLS.label">{{ t('menuManagement.productForm.labels.pricingMode') }}</label>
        <div class="flex gap-3">
          <button
            v-for="opt in PRICE_MODE_OPTIONS"
            :key="opt.value"
            type="button"
            :class="[
              'flex-1 px-4 py-3 rounded-xl border text-left transition-all duration-150',
              form.priceMode === opt.value
                ? 'border-[#D2691E] bg-[#D2691E]/5 ring-2 ring-[#D2691E]/20'
                : 'border-zinc-200 dark:border-zinc-700 bg-[#f3f3f4] dark:bg-stone-800 hover:border-zinc-300 dark:hover:border-zinc-600',
            ]"
            @click="form.priceMode = opt.value"
          >
            <span
              :class="[
                'block text-sm font-semibold',
                form.priceMode === opt.value
                  ? 'text-[#D2691E]'
                  : 'text-zinc-700 dark:text-zinc-300',
              ]"
            >
              {{ opt.label }}
            </span>
            <span class="block text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">{{
              opt.hint
            }}</span>
          </button>
        </div>
      </div>
    </section>

    <hr class="border-zinc-200 dark:border-zinc-700" />

    <!-- ── Section: Sizes & Prices ────────────────────────────────────── -->
    <section v-if="showSizes()" class="space-y-4">
      <h2 :class="CLS.label">{{ t('menuManagement.productForm.sizesSection.title') }}</h2>

      <!-- Column labels -->
      <div class="grid grid-cols-12 gap-4 px-1">
        <div class="col-span-6">
          <span
            class="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest"
            >{{ t('menuManagement.productForm.sizesSection.sizeLabel') }}</span
          >
        </div>
        <div class="col-span-4">
          <span
            class="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest"
            >{{ t('menuManagement.productForm.sizesSection.priceLabel') }}</span
          >
        </div>
      </div>

      <TransitionGroup name="row" tag="div" class="space-y-3">
        <div
          v-for="(row, index) in form.sizes"
          :key="row.id"
          class="grid grid-cols-12 gap-4 items-center"
        >
          <div class="col-span-6">
            <AppInput
              v-model="row.size"
              type="text"
              :placeholder="t('menuManagement.productForm.sizesSection.sizeePlaceholder')"
              :class="[
                'text-[#000000] dark:text-stone-100 h-11 rounded-xl bg-[#FAFAFA] dark:bg-stone-800 font-bold',
                getError(`sizes.${index}.size`)
                  ? 'ring-2 ring-destructive/20 bg-destructive/5'
                  : '',
              ]"
              :aria-invalid="Boolean(getError(`sizes.${index}.size`))"
              @input="clearError(`sizes.${index}.size`)"
            />
            <p
              v-if="getError(`sizes.${index}.size`)"
              class="text-xs font-bold text-destructive mt-1"
            >
              {{ getError(`sizes.${index}.size`) }}
            </p>
          </div>
          <div class="col-span-4 relative">
            <span :class="[CLS.prefix, getError(`sizes.${index}.price`) ? 'top-1/3' : 'top-1/2']"
              >$</span
            >
            <AppInput
              v-model="row.price"
              type="number"
              step="0.01"
              placeholder="0.00"
              :class="[
                'text-[#000000] dark:text-stone-100 h-11 rounded-xl bg-[#FAFAFA] dark:bg-stone-800 font-bold pl-8',
                getError(`sizes.${index}.price`)
                  ? 'ring-2 ring-destructive/20 bg-destructive/5'
                  : '',
              ]"
              :aria-invalid="Boolean(getError(`sizes.${index}.price`))"
              @input="clearError(`sizes.${index}.price`)"
            />
            <p
              v-if="getError(`sizes.${index}.price`)"
              class="text-xs font-bold text-destructive mt-1"
            >
              {{ getError(`sizes.${index}.price`) }}
            </p>
          </div>
          <div class="col-span-2 flex justify-end">
            <button
              type="button"
              :disabled="form.sizes.length === 1"
              :aria-label="t('menuManagement.productForm.sizesSection.removeButtonLabel')"
              :class="[CLS.iconDanger, 'w-10 h-10']"
              @click="removeSize(row.id)"
            >
              <span class="material-symbols-outlined">delete</span>
            </button>
          </div>
        </div>
      </TransitionGroup>

      <button type="button" :class="CLS.addBtn" @click="addSize">
        <Plus class="w-3.5 h-3.5" />
        {{ t('menuManagement.productForm.sizesSection.addButton') }}
      </button>
    </section>

    <hr v-if="showSizes()" class="border-zinc-200" />

    <!-- ── Section: Options & Variations ─────────────────────────────── -->
    <section v-if="showOptionGroups()" class="space-y-4">
      <div class="flex items-start justify-between gap-4">
        <div>
          <h2
            class="text-[11px] font-black text-[#564338] dark:text-stone-100 uppercase tracking-widest"
          >
            {{ t('menuManagement.productForm.optionsSection.title') }}
            <span
              class="normal-case font-normal tracking-normal text-zinc-400 dark:text-zinc-500 ml-1"
              >{{ t('menuManagement.productForm.optionsSection.subtitle') }}</span
            >
          </h2>
          <p class="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
            {{ t('menuManagement.productForm.optionsSection.description') }}
          </p>
        </div>
        <div class="flex flex-wrap items-center justify-end gap-2">
          <div ref="templateMenuRef" class="relative">
            <Button
              type="button"
              variant="tertiary"
              :disabled="variationTemplates.length === 0"
              class="h-auto rounded-xl border border-[#D2691E]/20 bg-white px-3 py-2 text-sm font-semibold text-[#D2691E] hover:bg-[#D2691E]/10 dark:bg-stone-900 disabled:opacity-50 disabled:cursor-not-allowed"
              @click="isTemplateMenuOpen = !isTemplateMenuOpen"
            >
              <BookOpen class="w-4 h-4" />
              {{ t('menuManagement.productForm.templateMenu.triggerButton') }}
              <span
                v-if="variationTemplates.length"
                class="rounded-full bg-[#D2691E]/10 px-1.5 py-0.5 text-[11px] font-black"
              >
                {{ variationTemplates.length }}
              </span>
              <ChevronDown class="w-3.5 h-3.5" />
            </Button>

            <div
              v-if="isTemplateMenuOpen"
              class="absolute right-0 top-11 z-30 w-72 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-700 dark:bg-stone-900"
            >
              <div class="border-b border-zinc-100 px-3 py-2 dark:border-zinc-800">
                <p
                  class="text-xs font-black uppercase tracking-widest text-zinc-500 dark:text-zinc-400"
                >
                  {{ t('menuManagement.productForm.templateMenu.header') }}
                </p>
              </div>
              <div
                v-for="template in variationTemplates"
                :key="template.id"
                class="flex w-full items-center justify-between gap-3 px-3 py-3 hover:bg-[#D2691E]/10 dark:hover:bg-stone-800"
              >
                <span class="min-w-0">
                  <span
                    class="block truncate text-sm font-extrabold text-stone-800 dark:text-stone-100"
                  >
                    {{ template.name }}
                  </span>
                  <span class="block truncate text-xs font-medium text-zinc-400 dark:text-zinc-500">
                    {{
                      t('menuManagement.productForm.templateMenu.optionsCount', {
                        count: template.optionCount,
                      })
                    }}
                  </span>
                </span>
                <span class="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="tertiary"
                    class="h-auto rounded-md px-2 py-1 text-xs font-black text-[#D2691E] hover:bg-[#D2691E]/10"
                    @click="applyVariationTemplate(template)"
                  >
                    {{ t('menuManagement.productForm.templateMenu.useButton') }}
                  </Button>
                  <Button
                    type="button"
                    variant="tertiary"
                    size="icon"
                    :aria-label="t('menuManagement.productForm.templateMenu.editTooltip')"
                    :title="t('menuManagement.productForm.templateMenu.editTooltip')"
                    class="h-7 w-7 rounded-md text-zinc-500 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                    @click="openTemplateEditor(template)"
                  >
                    <Pencil class="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="tertiary"
                    size="icon"
                    :aria-label="t('menuManagement.productForm.templateMenu.deleteTooltip')"
                    :title="t('menuManagement.productForm.templateMenu.deleteTooltip')"
                    class="h-7 w-7 rounded-md text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
                    @click="deleteVariationTemplate(template)"
                  >
                    <Trash2 class="h-3.5 w-3.5" />
                  </Button>
                </span>
              </div>
            </div>
          </div>

          <button type="button" :class="CLS.actionBtn" @click="addOptionGroup">
            <Plus class="w-3.5 h-3.5" />
            {{ t('menuManagement.productForm.optionsSection.addGroupButton') }}
          </button>
        </div>
      </div>

      <!-- Empty state -->
      <div
        v-if="form.optionGroups.length === 0"
        class="rounded-2xl border-2 border-dashed border-zinc-200 dark:border-zinc-700 p-8 flex flex-col items-center justify-center text-center gap-2"
      >
        <span class="material-symbols-outlined text-zinc-300 dark:text-zinc-600 text-[32px]">{{
          t('menuManagement.productForm.optionsSection.emptyStateIcon')
        }}</span>
        <p class="text-sm font-medium text-zinc-400 dark:text-zinc-500">
          {{ t('menuManagement.productForm.optionsSection.emptyStateTitle') }}
        </p>
        <p class="text-xs text-zinc-300 dark:text-zinc-600">
          {{ t('menuManagement.productForm.optionsSection.emptyStateDescription') }}
        </p>
      </div>

      <!-- Group cards -->
      <div class="space-y-3">
        <div
          v-for="(group, groupIndex) in form.optionGroups"
          :key="group.id"
          :draggable="drag.canDrag"
          :class="[
            'rounded-2xl border bg-white dark:bg-stone-900 shadow-sm overflow-hidden transition-all duration-150',
            drag.fromId === group.id ? 'opacity-40 scale-[0.99]' : 'opacity-100',
            drag.overId === group.id && drag.fromId !== group.id
              ? 'border-[#D2691E]/50 ring-2 ring-[#D2691E]/20'
              : 'border-zinc-200 dark:border-zinc-700',
          ]"
          @dragstart="onDragStart($event, group.id)"
          @dragover="onDragOver($event, group.id)"
          @drop="onDrop(group.id)"
          @dragend="onDragEnd"
        >
          <!-- Card header -->
          <div
            class="flex items-center gap-2 px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border-b border-zinc-100 dark:border-zinc-800"
          >
            <span
              class="material-symbols-outlined text-[20px] text-zinc-300 dark:text-zinc-600 hover:text-zinc-500 dark:hover:text-zinc-400 cursor-grab active:cursor-grabbing transition-colors select-none shrink-0"
              :title="t('menuManagement.productForm.optionsSection.dragToReorder')"
              @mousedown="onHandleMouseDown"
              >drag_indicator</span
            >

            <div class="flex-1 min-w-0">
              <AppInput
                v-model="group.name"
                type="text"
                :placeholder="t('menuManagement.productForm.optionsSection.groupNamePlaceholder')"
                :class="[
                  'min-w-0 text-[#000000] dark:text-stone-100 h-11 rounded-xl bg-[#FAFAFA] dark:bg-stone-800 font-bold px-3 py-1.5 text-[13px]',
                  getError(`optionGroups.${groupIndex}.name`)
                    ? 'ring-2 ring-destructive/20 bg-destructive/5'
                    : '',
                ]"
                :aria-invalid="Boolean(getError(`optionGroups.${groupIndex}.name`))"
                @input="clearError(`optionGroups.${groupIndex}.name`)"
              />
              <p
                v-if="getError(`optionGroups.${groupIndex}.name`)"
                class="text-xs font-bold text-destructive mt-1"
              >
                {{ getError(`optionGroups.${groupIndex}.name`) }}
              </p>
            </div>

            <Button
              type="button"
              variant="tertiary"
              class="h-8 gap-1.5 rounded-lg bg-[#D2691E]/10 px-2.5 text-xs font-bold text-[#D2691E] hover:bg-[#D2691E]/20"
              @click="saveOptionGroupAsTemplate(group)"
            >
              <Save class="w-3.5 h-3.5" />
              {{ t('menuManagement.productForm.templateMenu.saveAsTemplateButton') }}
            </Button>

            <button
              type="button"
              :aria-label="t('menuManagement.productForm.optionsSection.removeGroupButtonLabel')"
              :class="[CLS.iconDanger, 'w-8 h-8 rounded-lg']"
              @click="removeOptionGroup(group.id)"
            >
              <span class="material-symbols-outlined text-[18px]">delete</span>
            </button>
          </div>

          <!-- Choices -->
          <div class="px-4 pt-3 pb-4 space-y-2">
            <div class="grid grid-cols-12 gap-3 px-1 pb-1">
              <div class="col-span-6">
                <span
                  class="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest"
                  >{{ t('menuManagement.productForm.optionsSection.optionLabel') }}</span
                >
              </div>
              <div class="col-span-4">
                <span
                  class="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest"
                  >{{ t('menuManagement.productForm.optionsSection.priceModifier') }}</span
                >
              </div>
            </div>

            <TransitionGroup name="row" tag="div" class="space-y-2">
              <div
                v-for="(choice, choiceIndex) in group.choices"
                :key="choice.id"
                class="grid grid-cols-12 gap-3 items-center"
              >
                <div class="col-span-6">
                  <AppInput
                    v-model="choice.label"
                    type="text"
                    :placeholder="t('menuManagement.productForm.optionsSection.choicePlaceholder')"
                    :class="[
                      'text-[#000000] dark:text-stone-100 h-11 rounded-xl bg-[#FAFAFA] dark:bg-stone-800 font-bold',
                      getError(`optionGroups.${groupIndex}.choices.${choiceIndex}.label`)
                        ? 'ring-2 ring-destructive/20 bg-destructive/5'
                        : '',
                    ]"
                    :aria-invalid="
                      Boolean(getError(`optionGroups.${groupIndex}.choices.${choiceIndex}.label`))
                    "
                    @input="clearError(`optionGroups.${groupIndex}.choices.${choiceIndex}.label`)"
                  />
                  <p
                    v-if="getError(`optionGroups.${groupIndex}.choices.${choiceIndex}.label`)"
                    class="text-xs font-bold text-destructive mt-1"
                  >
                    {{ getError(`optionGroups.${groupIndex}.choices.${choiceIndex}.label`) }}
                  </p>
                </div>
                <div class="col-span-4 relative">
                  <span
                    class="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500 text-xs pointer-events-none"
                    >+$</span
                  >
                  <AppInput
                    v-model="choice.priceModifier"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    class="text-[#000000] dark:text-stone-100 h-11 rounded-xl bg-[#FAFAFA] dark:bg-stone-800 font-bold pl-8"
                  />
                </div>
                <div class="col-span-2 flex justify-center">
                  <button
                    type="button"
                    :disabled="group.choices.length === 1"
                    :aria-label="
                      t('menuManagement.productForm.optionsSection.removeChoiceButtonLabel')
                    "
                    :class="[CLS.iconDanger, 'w-7 h-7 rounded-lg']"
                    @click="removeChoice(group, choice.id)"
                  >
                    <span class="material-symbols-outlined text-[17px]">delete</span>
                  </button>
                </div>
              </div>
            </TransitionGroup>

            <button type="button" :class="[CLS.addBtn, 'mt-1 text-xs']" @click="addChoice(group)">
              <Plus class="w-3.5 h-3.5" />
              {{ t('menuManagement.productForm.optionsSection.addChoiceButton') }}
            </button>
          </div>
        </div>
      </div>
    </section>

    <hr v-if="showOptionGroups()" class="border-zinc-200" />

    <!-- ── Section: Details ───────────────────────────────────────────── -->
    <section class="space-y-5">
      <div class="space-y-2.5 pb-2">
        <Label
          class="text-[11px] font-black text-[#564338] dark:text-stone-100 uppercase tracking-widest ml-0.5"
        >
          {{ t('menuManagement.productForm.labels.productImage') }}
        </Label>
        <ImageUpload
          :model-value="form.imageUrl"
          :label="t('menuManagement.productForm.labels.productImage')"
          :recommendation="t('staff.form.uploadRecommendation')"
          :error="getError('imageUrl')"
          @update:model-value="
            val => {
              form.imageUrl = val
              if (!val) handleFileChange(null)
              else clearError('imageUrl')
            }
          "
          @change="handleFileChange"
        />
      </div>
    </section>

    <div
      v-if="isTemplateEditorOpen"
      class="fixed inset-0 z-[80] flex items-center justify-center bg-black/45 p-4"
      @click.self="closeTemplateEditor"
    >
      <div
        class="flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl dark:bg-stone-950"
      >
        <div
          class="flex items-start justify-between gap-4 border-b border-zinc-100 p-5 dark:border-zinc-800"
        >
          <div>
            <h2 class="text-xl font-extrabold text-stone-950 dark:text-stone-50">
              {{ t('menuManagement.productForm.templateEditor.title') }}
            </h2>
            <p class="text-sm font-medium text-zinc-500 dark:text-zinc-400">
              {{ t('menuManagement.productForm.templateEditor.subtitle') }}
            </p>
          </div>
          <Button
            type="button"
            variant="tertiary"
            size="icon"
            class="h-9 w-9 rounded-full text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            @click="closeTemplateEditor"
          >
            <X class="h-5 w-5" />
          </Button>
        </div>

        <div class="space-y-4 overflow-y-auto p-5">
          <label class="block space-y-2">
            <span
              class="text-[11px] font-black uppercase tracking-widest text-[#564338] dark:text-stone-200"
            >
              {{ t('menuManagement.productForm.templateEditor.nameLabel') }}
            </span>
            <Input
              v-model="templateDraft.name"
              type="text"
              class="h-11 rounded-xl bg-[#FAFAFA] font-bold text-[#000000] dark:bg-stone-800 dark:text-stone-100"
              :placeholder="t('menuManagement.productForm.templateEditor.namePlaceholder')"
            />
          </label>

          <div class="space-y-2">
            <div class="grid grid-cols-12 gap-3 px-1">
              <span
                class="col-span-6 text-[10px] font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500"
              >
                {{ t('menuManagement.productForm.optionsSection.optionLabel') }}
              </span>
              <span
                class="col-span-4 text-[10px] font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500"
              >
                {{ t('menuManagement.productForm.optionsSection.priceModifier') }}
              </span>
            </div>

            <div
              v-for="choice in templateDraft.choices"
              :key="choice.id"
              class="grid grid-cols-12 items-center gap-3"
            >
              <Input
                v-model="choice.label"
                type="text"
                class="col-span-6 h-11 rounded-xl bg-[#FAFAFA] font-bold text-[#000000] dark:bg-stone-800 dark:text-stone-100"
                :placeholder="t('menuManagement.productForm.optionsSection.choicePlaceholder')"
              />
              <div class="relative col-span-4">
                <span
                  class="absolute left-4 top-1/2 -translate-y-1/2 text-xs text-zinc-400 dark:text-zinc-500"
                >
                  +$
                </span>
                <Input
                  v-model="choice.priceModifier"
                  type="number"
                  step="0.01"
                  min="0"
                  class="h-11 rounded-xl bg-[#FAFAFA] pl-8 font-bold text-[#000000] dark:bg-stone-800 dark:text-stone-100"
                  placeholder="0.00"
                />
              </div>
              <Button
                type="button"
                variant="tertiary"
                size="icon"
                :disabled="templateDraft.choices.length === 1"
                class="col-span-2 h-9 w-auto rounded-lg text-red-400 hover:bg-red-50 disabled:opacity-30 dark:hover:bg-red-950/30"
                @click="removeTemplateDraftChoice(choice.id)"
              >
                <Trash2 class="h-4 w-4" />
              </Button>
            </div>

            <Button
              type="button"
              variant="tertiary"
              :class="[CLS.addBtn, 'h-auto py-0 text-xs']"
              @click="addTemplateDraftChoice"
            >
              <Plus class="h-3.5 w-3.5" />
              {{ t('menuManagement.productForm.templateEditor.addChoiceButton') }}
            </Button>
          </div>
        </div>

        <div class="flex justify-end gap-2 border-t border-zinc-100 p-4 dark:border-zinc-800">
          <Button
            type="button"
            variant="tertiary"
            class="h-auto rounded-xl px-4 py-2 text-sm font-semibold text-zinc-500 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
            @click="closeTemplateEditor"
          >
            {{ t('menuManagement.productForm.templateEditor.cancelButton') }}
          </Button>
          <Button
            type="button"
            variant="tertiary"
            class="h-auto rounded-xl bg-[#D2691E] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#b85c18]"
            @click="saveEditedTemplate"
          >
            {{ t('menuManagement.productForm.templateEditor.saveButton') }}
          </Button>
        </div>
      </div>
    </div>

    <!-- ── Form actions ───────────────────────────────────────────────── -->
    <div class="flex items-center justify-end gap-3 pt-2">
      <button
        type="button"
        :disabled="isSubmitting"
        class="px-5 py-2.5 rounded-xl text-sm font-semibold text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        @click="handleReset"
      >
        {{ t('menuManagement.productForm.buttons.reset') }}
      </button>
      <button
        type="submit"
        :disabled="isSubmitting"
        class="px-6 py-2.5 rounded-xl text-sm font-semibold bg-[#D2691E] text-white hover:bg-[#b85c18] transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span v-if="isSubmitting" class="inline-block">{{
          t('menuManagement.productForm.buttons.saving')
        }}</span>
        <span v-else>{{ t('menuManagement.productForm.buttons.save') }}</span>
      </button>
    </div>
  </form>
</template>

<style scoped>
/* Only transitions live here — everything else is inlined via CLS */
.row-enter-active,
.row-leave-active {
  transition: all 0.2s ease;
}

.row-enter-from,
.row-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
</style>
