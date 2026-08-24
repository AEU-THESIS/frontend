<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Product } from '@/types/product.types'
import type { Promotion } from '@/types/promotion.types'
import { getImageUrl } from '@/utils/image'
import NoImage from '@/assets/no-image.jpg'

const props = defineProps<{
  product: Product
  // The active promotion that covers this product, if any (drives the promo badge
  // and — for a percentage promo — the struck-through discounted price).
  promotion?: Promotion | null
}>()

const emit = defineEmits<{
  (e: 'select', product: Product): void
}>()

const { t } = useI18n()

// The numeric base price shown on the card (fixed price, else the cheapest size).
const basePrice = computed(
  () =>
    Number(
      props.product.price ||
        props.product.optionSets?.[0]?.optionSet.elements?.[0]?.priceModifier ||
        0
    ) || 0
)

const displayPrice = computed(() => `$${basePrice.value.toFixed(2)}`)

// A percentage or fixed-amount promo maps to a discounted price display on the card.
// BOGO applies across pairs of units, so it only shows the BOGO badge.
const discountedPrice = computed(() => {
  const promo = props.promotion
  if (!promo) return null
  if (promo.discountType === 'PERCENTAGE') {
    const value = basePrice.value * (1 - promo.discountValue / 100)
    return `$${(Math.round(value * 100) / 100).toFixed(2)}`
  }
  if (promo.discountType === 'FIXED_AMOUNT') {
    const value = Math.max(0, basePrice.value - promo.discountValue)
    return `$${(Math.round(value * 100) / 100).toFixed(2)}`
  }
  return null
})

// Short label shown on the promo badge.
const promoBadge = computed(() => {
  const promo = props.promotion
  if (!promo) return null
  switch (promo.discountType) {
    case 'PERCENTAGE':
      return t('home.promo.percentOff', { value: promo.discountValue })
    case 'FIXED_AMOUNT':
      return t('home.promo.amountOff', { value: `$${promo.discountValue.toFixed(2)}` })
    case 'BOGO':
      return t('home.promo.bogo')
    default:
      return null
  }
})

const handleSelect = () => {
  emit('select', props.product)
}
</script>

<template>
  <div
    class="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 hover:border-amber-600 dark:hover:border-amber-500 hover:shadow-xl hover:shadow-amber-500/5 dark:hover:shadow-amber-950/10 rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 group flex flex-col active:scale-98 select-none"
    @click="handleSelect"
  >
    <!-- Image & Tag -->
    <div class="relative w-full aspect-square bg-stone-100 dark:bg-stone-950 overflow-hidden">
      <img
        :src="product.imageUrl ? getImageUrl(product.imageUrl) : NoImage"
        :alt="product.name"
        class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        loading="lazy"
      />
      <!-- <div
        v-else
        class="w-full h-full flex flex-col items-center justify-center text-stone-300 dark:text-stone-700 select-none"
      >
        <span class="material-symbols-outlined text-4xl">local_cafe</span>
        <span class="text-[11px] font-semibold uppercase tracking-wider mt-1 opacity-70">
          {{ product.category.name }}
        </span>
      </div> -->

      <div
        v-if="product.optionSets && product.optionSets.length > 0"
        class="absolute top-3 right-3 bg-amber-600/95 dark:bg-amber-500/95 text-white rounded-full p-1.5 shadow-lg flex items-center justify-center backdrop-blur-sm transform translate-y-1 opacity-0 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300"
      >
        <span class="material-symbols-outlined text-sm">tune</span>
      </div>

      <!-- Promotion badge — flags items covered by an active promotion. -->
      <div
        v-if="promoBadge"
        class="absolute top-3 left-3 flex items-center gap-1 rounded-full bg-emerald-600/95 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-white shadow-lg backdrop-blur-sm"
      >
        <span class="material-symbols-outlined text-[13px] leading-none">sell</span>
        {{ promoBadge }}
      </div>
    </div>

    <!-- Product Info -->
    <div class="p-4 flex flex-col grow select-none">
      <h3
        class="font-bold text-stone-800 dark:text-stone-100 text-[15px] leading-snug line-clamp-2 mb-1 group-hover:text-amber-600 dark:group-hover:text-amber-500 transition-colors"
      >
        {{ product.name }}
      </h3>
      <p class="text-xs text-stone-500 dark:text-stone-400 font-medium select-none mt-auto">
        {{ product.category.name }}
      </p>

      <div class="flex items-center justify-between mt-3 select-none">
        <span v-if="discountedPrice" class="flex flex-col leading-none">
          <span class="text-[11px] font-bold text-stone-400 line-through dark:text-stone-500">
            {{ displayPrice }}
          </span>
          <span
            class="font-headline font-extrabold text-emerald-600 dark:text-emerald-500 text-[17px] tracking-tight"
          >
            {{ discountedPrice }}
          </span>
        </span>
        <span
          v-else
          class="font-headline font-extrabold text-stone-900 dark:text-stone-50 text-[17px] tracking-tight"
        >
          {{ displayPrice }}
        </span>

        <Button
          type="button"
          class="h-8 w-8 rounded-lg bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 flex items-center justify-center group-hover:bg-amber-600 dark:group-hover:bg-amber-500 group-hover:text-white dark:group-hover:text-white transition-all duration-200 p-0"
        >
          <span class="material-symbols-outlined text-lg">add</span>
        </Button>
      </div>
    </div>
  </div>
</template>
