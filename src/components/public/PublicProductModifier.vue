<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'
import { Button } from '@/components/ui/button'
import { usePublicCartStore, type PublicCartOption } from '@/store/usePublicCartStore'
import { usePublicShopStore } from '@/store/usePublicShopStore'
import { useTelegram } from '@/composables/useTelegram'
import type { Product, OptionSetElement } from '@/types/product.types'

const props = defineProps<{ product: Product | null; isOpen: boolean; currencySymbol: string }>()
const emit = defineEmits<{ (e: 'close'): void }>()

const { t } = useI18n()
const cart = usePublicCartStore()
const shopStore = usePublicShopStore()
const tg = useTelegram()

const quantity = ref(1)
const selected = ref<
  Record<number, { elementId: number; label: string; priceModifier: number; groupName: string }>
>({})

// Touch drag gesture state
const dragOffset = ref(0)
const isDragging = ref(false)
let startY = 0
let startX = 0
let isVerticalGesture = false

const onTouchStart = (e: TouchEvent) => {
  if (e.touches.length !== 1) return
  startY = e.touches[0].clientY
  startX = e.touches[0].clientX
  isDragging.value = true
  isVerticalGesture = false
  dragOffset.value = 0
}

const onTouchMove = (e: TouchEvent) => {
  if (!isDragging.value) return
  const currentY = e.touches[0].clientY
  const currentX = e.touches[0].clientX
  const deltaY = currentY - startY
  const deltaX = Math.abs(currentX - startX)

  if (!isVerticalGesture && Math.abs(deltaY) > 5) {
    isVerticalGesture = Math.abs(deltaY) > deltaX
  }

  if (isVerticalGesture && deltaY > 0) {
    e.preventDefault()
    dragOffset.value = deltaY
  }
}

const onTouchEnd = () => {
  if (!isDragging.value) return
  isDragging.value = false
  if (dragOffset.value > 80) {
    tg.haptic('light')
    emit('close')
  }
  dragOffset.value = 0
}

// Lock body scrolling when modal dialog is open
watch(
  () => props.isOpen,
  open => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
      dragOffset.value = 0
    }
  },
  { immediate: true }
)

onUnmounted(() => {
  document.body.style.overflow = ''
})

const promo = computed(() =>
  props.product ? shopStore.promotionForProduct(props.product.id, props.product.categoryId) : null
)

const promoBadge = computed(() => {
  if (!promo.value) return null
  switch (promo.value.discountType) {
    case 'PERCENTAGE':
      return t('home.promo.percentOff', { value: promo.value.discountValue })
    case 'FIXED_AMOUNT':
      return t('home.promo.amountOff', {
        value: `${props.currencySymbol}${promo.value.discountValue.toFixed(2)}`,
      })
    case 'BOGO':
      return t('home.promo.bogo')
    default:
      return null
  }
})

const resetSelection = () => {
  if (!props.product) return
  const p = shopStore.promotionForProduct(props.product.id, props.product.categoryId)
  quantity.value = p?.discountType === 'BOGO' ? 2 : 1
  selected.value = {}
  for (const pos of props.product.optionSets) {
    const els = pos.optionSet.elements
    if (pos.isRequired && els.length > 0) {
      selected.value[pos.optionSet.id] = {
        elementId: els[0].id,
        label: els[0].label,
        priceModifier: Number(els[0].priceModifier),
        groupName: pos.optionSet.name,
      }
    }
  }
}

watch(
  [() => props.product, () => props.isOpen],
  ([p, open], old) => {
    const [oldP, oldOpen] = old || [null, false]
    if (p && (p !== oldP || (open && !oldOpen))) resetSelection()
  },
  { immediate: true }
)

const selectElement = (setId: number, el: OptionSetElement, groupName: string) => {
  selected.value[setId] = {
    elementId: el.id,
    label: el.label,
    priceModifier: Number(el.priceModifier),
    groupName,
  }
  tg.haptic('light')
}

const modifiersTotal = computed(() =>
  Object.values(selected.value).reduce((s, i) => s + i.priceModifier, 0)
)
const unitPrice = computed(() => {
  if (!props.product) return 0
  const base = props.product.price == null ? 0 : Number(props.product.price)
  return base + modifiersTotal.value
})
const lineTotal = computed(() => unitPrice.value * quantity.value)

const inc = () => {
  quantity.value = Math.min(99, quantity.value + 1)
  tg.haptic('light')
}
const dec = () => {
  quantity.value = Math.max(1, quantity.value - 1)
  tg.haptic('light')
}

const handleAdd = () => {
  if (!props.product) return
  const missingRequired = props.product.optionSets.some(
    pos => pos.isRequired && !selected.value[pos.optionSet.id]
  )
  if (missingRequired) {
    tg.notify('error')
    toast.error(t('publicOrder.selectRequired'))
    return
  }
  if (unitPrice.value <= 0) {
    tg.notify('error')
    toast.error(t('publicOrder.sizeRequired'))
    return
  }

  const options: PublicCartOption[] = Object.entries(selected.value).map(([setId, el]) => ({
    optionSetId: Number(setId),
    elementId: el.elementId,
    groupName: el.groupName,
    optionName: el.label,
    extraPrice: el.priceModifier,
  }))

  cart.addItem(props.product, quantity.value, options)
  tg.haptic('medium')
  const isBogo = promo.value?.discountType === 'BOGO'
  toast.success(
    isBogo && quantity.value >= 2
      ? t('cart.addedBogo', { name: props.product.name })
      : t('publicOrder.addedToCart')
  )
  emit('close')
}
</script>

<template>
  <Transition name="sheet">
    <div
      v-if="isOpen && product"
      class="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
    >
      <div
        class="sheet-backdrop absolute inset-0 bg-stone-900/60 backdrop-blur-sm"
        @click="emit('close')"
      ></div>

      <div
        class="sheet-panel relative flex max-h-[88vh] w-full max-w-md md:max-w-lg flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl dark:bg-stone-900 sm:rounded-3xl"
        :style="{
          transform: dragOffset > 0 ? `translateY(${dragOffset}px)` : undefined,
          transition: isDragging ? 'none' : 'transform 0.25s ease-out',
        }"
      >
        <!-- Touch Drag Handle (Mobile gesture trigger) -->
        <div
          class="flex cursor-grab touch-none justify-center py-3 active:cursor-grabbing sm:hidden"
          @touchstart="onTouchStart"
          @touchmove="onTouchMove"
          @touchend="onTouchEnd"
        >
          <span
            class="h-1.5 w-12 rounded-full bg-stone-300 transition-colors hover:bg-stone-400 dark:bg-stone-700"
          ></span>
        </div>

        <!-- Header -->
        <div
          class="flex items-start justify-between border-b border-stone-100 p-5 pt-1 dark:border-stone-800"
          @touchstart="onTouchStart"
          @touchmove="onTouchMove"
          @touchend="onTouchEnd"
        >
          <div>
            <div class="flex items-center gap-2">
              <h2 class="text-lg font-bold text-stone-900 dark:text-stone-50">
                {{ product.name }}
              </h2>
              <span
                v-if="promoBadge"
                class="rounded-full bg-emerald-600/95 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-white"
              >
                {{ promoBadge }}
              </span>
            </div>
            <p class="text-xs text-stone-500 dark:text-stone-400">{{ product.category.name }}</p>
          </div>
          <button
            type="button"
            class="flex h-9 w-9 items-center justify-center rounded-full bg-stone-100 text-stone-500 transition active:scale-90 dark:bg-stone-800"
            @click="emit('close')"
          >
            <span class="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        <!-- Options (Scrollable area) -->
        <div class="flex-1 space-y-5 overflow-y-auto p-5">
          <div v-for="pos in product.optionSets" :key="pos.optionSet.id" class="space-y-2.5">
            <div class="flex items-center justify-between">
              <span class="text-sm font-bold text-stone-800 dark:text-stone-200">
                {{ pos.optionSet.name }}
              </span>
              <span
                v-if="pos.isRequired"
                class="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary"
              >
                {{ t('publicOrder.required') }}
              </span>
            </div>
            <div class="grid grid-cols-3 gap-2">
              <button
                v-for="el in pos.optionSet.elements"
                :key="el.id"
                type="button"
                :class="[
                  'flex flex-col items-center justify-center gap-0.5 rounded-xl border-2 p-3 text-center transition-all active:scale-95 touch-manipulation',
                  selected[pos.optionSet.id]?.elementId === el.id
                    ? 'border-primary bg-primary/5 font-bold text-primary'
                    : 'border-stone-100 bg-stone-50 text-stone-700 dark:border-stone-800 dark:bg-stone-900/50 dark:text-stone-300',
                ]"
                @click="selectElement(pos.optionSet.id, el, pos.optionSet.name)"
              >
                <span class="text-sm">{{ el.label }}</span>
                <span v-if="Number(el.priceModifier) > 0" class="text-[11px] opacity-80">
                  +{{ currencySymbol }}{{ Number(el.priceModifier).toFixed(2) }}
                </span>
              </button>
            </div>
          </div>

          <!-- Quantity Stepper -->
          <div class="flex flex-col gap-1.5 pt-1">
            <div class="flex items-center justify-between">
              <div class="flex flex-col">
                <span class="text-sm font-bold text-stone-800 dark:text-stone-200">
                  {{ t('publicOrder.quantity') }}
                </span>
                <span
                  v-if="promo?.discountType === 'BOGO' && quantity >= 2"
                  class="mt-0.5 flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wide text-emerald-600 dark:text-emerald-500"
                >
                  <span class="material-symbols-outlined text-[13px] leading-none">redeem</span>
                  {{ t('cart.bogoFree', { count: Math.floor(quantity / 2) }) }}
                </span>
                <span
                  v-else-if="promo?.discountType === 'BOGO' && quantity === 1"
                  class="mt-0.5 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-amber-600 dark:text-amber-500"
                >
                  <span class="material-symbols-outlined text-[13px] leading-none">add_circle</span>
                  {{ t('cart.bogoHint') }}
                </span>
              </div>
              <div class="flex items-center gap-4 rounded-xl bg-stone-100 p-1 dark:bg-stone-950">
                <Button
                  variant="secondary"
                  size="icon"
                  class="h-10 w-10 rounded-lg active:scale-90 touch-manipulation"
                  @click="dec"
                >
                  <span class="material-symbols-outlined text-base">remove</span>
                </Button>
                <span class="w-8 text-center text-base font-extrabold">{{ quantity }}</span>
                <Button
                  variant="secondary"
                  size="icon"
                  class="h-10 w-10 rounded-lg active:scale-90 touch-manipulation"
                  @click="inc"
                >
                  <span class="material-symbols-outlined text-base">add</span>
                </Button>
              </div>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div
          class="flex items-center justify-between border-t border-stone-100 p-5 dark:border-stone-800"
        >
          <div class="flex flex-col">
            <span class="text-[11px] font-bold uppercase tracking-wider text-stone-400">
              {{ t('publicOrder.total') }}
            </span>
            <span class="text-2xl font-extrabold text-stone-900 dark:text-stone-50">
              {{ currencySymbol }}{{ lineTotal.toFixed(2) }}
            </span>
          </div>
          <Button
            class="h-12 rounded-2xl px-8 font-bold shadow-sm transition active:scale-[0.98] touch-manipulation"
            @click="handleAdd"
          >
            {{ t('publicOrder.addToCart') }}
          </Button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
/* Backdrop fades; panel slides up from the bottom */
.sheet-enter-active,
.sheet-leave-active {
  transition: opacity 0.25s ease;
}
.sheet-enter-active .sheet-panel,
.sheet-leave-active .sheet-panel {
  transition: transform 0.32s cubic-bezier(0.34, 1.4, 0.64, 1);
}
.sheet-enter-from,
.sheet-leave-to {
  opacity: 0;
}
.sheet-enter-from .sheet-panel,
.sheet-leave-to .sheet-panel {
  transform: translateY(100%);
}
</style>
