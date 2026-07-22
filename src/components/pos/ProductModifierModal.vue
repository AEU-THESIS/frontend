<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Product, OptionSetElement } from '@/types/product.types'
import type { CartItemOption } from '@/types/order.types'
import { useCartStore } from '@/store/useCartStore'

const props = defineProps<{
  product: Product | null
  isOpen: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const { t } = useI18n()
const cartStore = useCartStore()

const quantity = ref(1)

// Whether an active "Buy 1 Get 1" promotion covers this product.
const isBogo = computed(
  () =>
    !!props.product &&
    cartStore.promotionForProduct(props.product.id, props.product.categoryId)?.discountType ===
      'BOGO'
)
const selectedElements = ref<
  Record<number, { elementId: number; label: string; priceModifier: number; groupName: string }>
>({})

// Helper to reset selection and pre-select defaults
const resetSelection = () => {
  if (!props.product) return
  // Start a "Buy 1 Get 1" item at 2 (one paid + one free) so it behaves like the
  // one-tap add on simple items. The barista can still adjust down to 1.
  quantity.value = isBogo.value ? 2 : 1
  selectedElements.value = {}

  // Pre-select first/default elements for each option set
  for (const pos of props.product.optionSets) {
    const elements = pos.optionSet.elements
    if (elements.length > 0) {
      const defaultEl = elements[0]
      selectedElements.value[pos.optionSet.id] = {
        elementId: defaultEl.id,
        label: defaultEl.label,
        priceModifier: Number(defaultEl.priceModifier),
        groupName: pos.optionSet.name,
      }
    }
  }
}

// Watch both product changes and modal visibility to trigger resetSelection
watch(
  [() => props.product, () => props.isOpen],
  ([newProduct, newIsOpen], oldState) => {
    const [oldProduct, oldIsOpen] = oldState || [null, false]
    if (newProduct && (newProduct !== oldProduct || (newIsOpen && !oldIsOpen))) {
      resetSelection()
    }
  },
  { immediate: true }
)

const selectElement = (optionSetId: number, element: OptionSetElement, groupName: string) => {
  selectedElements.value[optionSetId] = {
    elementId: element.id,
    label: element.label,
    priceModifier: Number(element.priceModifier),
    groupName,
  }
}

// Buy-1-Get-1 items only make sense in pairs, so step the quantity by 2 (min 2);
// everything else steps by 1 (min 1).
const qtyStep = computed(() => (isBogo.value ? 2 : 1))
const minQty = computed(() => (isBogo.value ? 2 : 1))

const incrementQty = () => {
  quantity.value = Math.min(99, quantity.value + qtyStep.value)
}

const decrementQty = () => {
  quantity.value = Math.max(minQty.value, quantity.value - qtyStep.value)
}

const activeModifiersTotal = computed(() => {
  return Object.values(selectedElements.value).reduce((sum, item) => sum + item.priceModifier, 0)
})

const itemUnitPrice = computed(() => {
  if (!props.product) return 0
  return Number(props.product.price) + activeModifiersTotal.value
})

// Gross (pre-discount) line total.
const itemGrossTotal = computed(() => itemUnitPrice.value * quantity.value)

// Free units and the resulting net total for a BOGO item (every 2nd unit free).
const freeUnits = computed(() => (isBogo.value ? Math.floor(quantity.value / 2) : 0))
const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100
const itemNetTotal = computed(() =>
  round2(itemGrossTotal.value - freeUnits.value * itemUnitPrice.value)
)

const handleAddToCart = () => {
  if (!props.product) return

  const cartOptions: CartItemOption[] = Object.entries(selectedElements.value).map(
    ([setId, el]) => ({
      optionSetId: parseInt(setId, 10),
      elementId: el.elementId,
      groupName: el.groupName,
      optionName: el.label,
      extraPrice: el.priceModifier,
    })
  )

  cartStore.addToCart(
    props.product.id,
    props.product.categoryId,
    props.product.name,
    props.product.imageUrl,
    Number(props.product.price),
    quantity.value,
    cartOptions
  )

  emit('close')
}
</script>

<template>
  <div
    v-if="isOpen && product"
    class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 select-none animate-in fade-in duration-200"
  >
    <!-- Overlay -->
    <div
      class="absolute inset-0 bg-stone-900/60 backdrop-blur-md transition-opacity duration-300"
      @click="emit('close')"
    ></div>

    <!-- Modal Container -->
    <div
      class="relative w-full max-w-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh] animate-in slide-in-from-bottom-8 duration-300 select-none"
    >
      <!-- Header -->
      <div
        class="p-6 pb-4 border-b border-stone-100 dark:border-stone-800 flex items-center justify-between"
      >
        <div>
          <h2 class="text-xl font-headline font-bold text-stone-900 dark:text-stone-50 select-none">
            {{ product.name }}
          </h2>
          <p class="text-xs text-stone-500 dark:text-stone-400 font-medium select-none">
            {{ product.category.name }}
          </p>
        </div>
        <Button
          type="button"
          variant="tertiary"
          size="icon"
          class="h-9 w-9 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400 flex items-center justify-center hover:bg-stone-200 dark:hover:bg-stone-700 hover:no-underline transition-colors p-0"
          @click="emit('close')"
        >
          <span class="material-symbols-outlined text-lg">close</span>
        </Button>
      </div>

      <!-- Content -->
      <div class="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
        <!-- Modifiers Groups -->
        <div
          v-for="pos in product.optionSets"
          :key="pos.optionSet.id"
          class="space-y-3 select-none"
        >
          <div class="flex items-center justify-between select-none">
            <span class="font-bold text-[15px] text-stone-800 dark:text-stone-200">
              {{ pos.optionSet.name }}
            </span>
            <span
              v-if="pos.isRequired"
              class="text-[10px] bg-primary/10 text-primary font-bold px-2 py-0.5 rounded-full uppercase tracking-wider select-none"
            >
              {{ t('cart.required') }}
            </span>
          </div>

          <div class="grid grid-cols-3 gap-2.5">
            <Button
              v-for="el in pos.optionSet.elements"
              :key="el.id"
              type="button"
              variant="tertiary"
              :class="[
                'p-3.5 rounded-xl border-2 text-center transition-all flex flex-col justify-center items-center gap-1 active:scale-98 select-none h-auto hover:no-underline',
                selectedElements[pos.optionSet.id]?.elementId === el.id
                  ? 'border-primary bg-primary/5 text-primary font-bold hover:bg-primary/5 hover:text-primary'
                  : 'border-stone-100 dark:border-stone-800 hover:border-stone-200 dark:hover:border-stone-700 text-stone-700 dark:text-stone-300 font-medium bg-stone-50 dark:bg-stone-900/50',
              ]"
              @click="selectElement(pos.optionSet.id, el, pos.optionSet.name)"
            >
              <span class="text-sm select-none">{{ el.label }}</span>
              <span v-if="Number(el.priceModifier) > 0" class="text-[11px] opacity-80 select-none">
                +${{ Number(el.priceModifier).toFixed(2) }}
              </span>
            </Button>
          </div>
        </div>

        <!-- Quantity Adjuster -->
        <div class="pt-2 flex items-center justify-between select-none">
          <span class="font-bold text-[15px] text-stone-800 dark:text-stone-200">{{
            t('cart.quantity')
          }}</span>
          <div
            class="flex items-center gap-4 bg-stone-100 dark:bg-stone-950 rounded-xl p-1 border border-stone-200/20"
          >
            <Button
              variant="secondary"
              size="icon"
              type="button"
              class="w-10 h-10 rounded-lg bg-white dark:bg-stone-800 border-stone-200 dark:border-stone-700 text-stone-800 dark:text-stone-50"
              @click="decrementQty"
            >
              <span class="material-symbols-outlined text-base">remove</span>
            </Button>
            <span
              class="font-extrabold text-stone-900 dark:text-stone-50 w-8 text-center text-base select-none"
            >
              {{ quantity }}
            </span>
            <Button
              variant="secondary"
              size="icon"
              type="button"
              class="w-10 h-10 rounded-lg bg-white dark:bg-stone-800 border-stone-200 dark:border-stone-700 text-stone-800 dark:text-stone-50"
              @click="incrementQty"
            >
              <span class="material-symbols-outlined text-base">add</span>
            </Button>
          </div>
        </div>

        <!-- Buy-1-Get-1 feedback for the chosen quantity -->
        <div
          v-if="isBogo"
          class="flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold"
          :class="
            Math.floor(quantity / 2) > 0
              ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-500'
              : 'bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-500'
          "
        >
          <span class="material-symbols-outlined text-[15px] leading-none">
            {{ Math.floor(quantity / 2) > 0 ? 'redeem' : 'add_circle' }}
          </span>
          {{
            Math.floor(quantity / 2) > 0
              ? t('cart.bogoFree', { count: Math.floor(quantity / 2) })
              : t('cart.bogoHint')
          }}
        </div>
      </div>

      <!-- Footer & Recalculated Summary -->
      <div
        class="p-6 border-t border-stone-100 dark:border-stone-800 bg-stone-50 dark:bg-stone-950/20 flex items-center justify-between select-none"
      >
        <div class="flex flex-col select-none">
          <span
            class="text-[11px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider mb-0.5"
            >{{ t('cart.totalAmount') }}</span
          >
          <span class="flex items-baseline gap-2">
            <span
              v-if="freeUnits > 0"
              class="text-sm font-bold text-stone-400 line-through dark:text-stone-500"
            >
              ${{ itemGrossTotal.toFixed(2) }}
            </span>
            <span class="text-2xl font-headline font-extrabold text-stone-900 dark:text-stone-50">
              ${{ itemNetTotal.toFixed(2) }}
            </span>
          </span>
        </div>
        <Button
          type="button"
          class="bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-8 py-3.5 h-auto rounded-xl shadow-lg shadow-primary/10 transition-all select-none"
          @click="handleAddToCart"
        >
          {{ t('cart.addToCart') }}
        </Button>
      </div>
    </div>
  </div>
</template>
