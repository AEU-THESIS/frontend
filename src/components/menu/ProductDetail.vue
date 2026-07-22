<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import NoImage from '@/assets/no-image.jpg' // adjust path as needed
import { OPTIONS_SET_TYPE } from '@/constants/product'
import type { Product, ProductOptionSet } from '@/types/product.types'
import { useProductStore } from '@/store/useProductStore'
import { getImageUrl } from '@/utils/image'

const props = defineProps({
  productId: {
    type: [Number, null],
    default: null,
  },
})

// ---------- Data -------------
const productStore = useProductStore()
const product = ref<Product | null>(null)

// ---------- Computed -------------
const resolvedPrice = computed(() => (!product.value ? '' : resolvePrice(product.value)))

// ---------- Functions -------------
function resolvePrice(item: Product): string {
  const sizeOptionSet = item.optionSets.find(
    (os: ProductOptionSet) => os.optionSet.type === OPTIONS_SET_TYPE.SIZE
  )

  if (sizeOptionSet) {
    const firstElement = sizeOptionSet.optionSet.elements[0]

    if (firstElement) {
      return formatPrice(firstElement.priceModifier)
    }
  }

  return formatPrice(item.price)
}
function formatPrice(price: number | null): string {
  return `$${price?.toFixed(2) || '0.00'}`
}

onMounted(async () => {
  if (props.productId) {
    product.value = await productStore.fetchProductDetail(props.productId)
  }
})
</script>

<template>
  <div v-if="product" class="flex flex-col md:flex-row -mx-6 -my-5 md:h-[560px]">
    <!-- Left: Image -->
    <div
      class="w-full md:w-2/5 h-64 md:h-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden shrink-0 p-4"
    >
      <img
        :src="product.imageUrl ? getImageUrl(product.imageUrl) : NoImage"
        :alt="product.name"
        class="w-full h-full object-cover rounded-lg"
      />
    </div>

    <!-- Right: Details -->
    <div class="flex-1 flex flex-col min-h-0">
      <!-- Scrollable content area -->
      <div class="flex-1 overflow-y-auto p-8 space-y-6">
        <!-- Category & Status -->
        <div class="flex items-center justify-between">
          <span
            class="text-[10px] font-bold tracking-widest text-zinc-400 dark:text-zinc-500 uppercase"
          >
            {{ product.category?.name }}
          </span>
          <span
            class="flex items-center gap-1 rounded-full"
            :class="
              product.isAvailable
                ? 'bg-emerald-50 dark:bg-emerald-950/30'
                : 'bg-red-50 dark:bg-red-950/30'
            "
          >
            <span
              class="text-[11px] font-semibold"
              :class="
                product.isAvailable
                  ? 'text-emerald-600 dark:text-emerald-500'
                  : 'text-red-600 dark:text-red-500'
              "
            >
              {{ product.isAvailable ? 'On Sale' : 'Not Available' }}
            </span>
          </span>
        </div>

        <!-- Name & Price -->
        <div>
          <h2 class="text-xl font-bold text-zinc-900 dark:text-zinc-100 leading-snug">
            {{ product.name }}
          </h2>
          <p class="mt-2 text-3xl font-bold text-amber-700 dark:text-amber-500 tabular-nums">
            {{ resolvedPrice }}
          </p>
        </div>

        <!-- Option Sets -->
        <template v-if="product.optionSets?.length > 0">
          <div
            v-for="(optionSet, index) in product.optionSets"
            :key="optionSet.optionSet.id"
            class="space-y-3"
          >
            <div v-if="index > 0" class="h-px bg-zinc-100 dark:bg-zinc-800" />
            <p
              class="text-[10px] font-bold tracking-widest text-zinc-400 dark:text-zinc-500 uppercase"
            >
              {{ optionSet.optionSet.name }}
            </p>
            <div class="grid grid-cols-3 gap-3">
              <button
                v-for="element in optionSet.optionSet.elements"
                :key="element.id"
                class="flex flex-col items-center rounded-lg border-2 py-3 transition-colors hover:border-amber-300"
              >
                <span
                  class="text-[10px] font-bold tracking-widest text-zinc-400 dark:text-zinc-500 uppercase"
                >
                  {{ element.label }}
                </span>
                <span class="mt-1 text-sm font-bold">
                  {{
                    optionSet.optionSet.type === OPTIONS_SET_TYPE.SIZE
                      ? formatPrice(element.priceModifier)
                      : '+' + formatPrice(element.priceModifier)
                  }}
                </span>
              </button>
            </div>
          </div>
        </template>

        <!-- No-options state -->
        <template v-else>
          <div class="h-px bg-zinc-100" />
          <div
            class="flex items-start gap-3 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-800 px-4 py-3.5"
          >
            <span
              class="material-symbols-outlined text-[18px] text-zinc-400 dark:text-zinc-500 mt-px shrink-0"
              style="font-variation-settings: 'FILL' 0"
              >info</span
            >
            <div>
              <p class="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                No customisation options
              </p>
              <p class="mt-0.5 text-xs text-zinc-400 dark:text-zinc-500 leading-relaxed">
                This item is sold as-is at a fixed price. No size or add-on choices are available.
              </p>
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>

  <!-- Loading state -->
  <div v-else class="flex items-center justify-center py-8">
    <p class="text-zinc-500 dark:text-zinc-400">Loading product details...</p>
  </div>
</template>
