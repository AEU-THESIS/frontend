<script setup lang="ts">
import { computed } from 'vue'
import type { Product } from '@/types/product.types'

const props = defineProps<{
  product: Product
}>()

const emit = defineEmits<{
  (e: 'select', product: Product): void
}>()

const displayPrice = computed(() => {
  return `$${Number(props.product.price).toFixed(2)}`
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
        v-if="product.imageUrl"
        :src="product.imageUrl"
        :alt="product.name"
        class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        loading="lazy"
      />
      <div
        v-else
        class="w-full h-full flex flex-col items-center justify-center text-stone-300 dark:text-stone-700 select-none"
      >
        <span class="material-symbols-outlined text-4xl">local_cafe</span>
        <span class="text-[11px] font-semibold uppercase tracking-wider mt-1 opacity-70">
          {{ product.category.name }}
        </span>
      </div>

      <div
        v-if="product.optionSets && product.optionSets.length > 0"
        class="absolute top-3 right-3 bg-amber-600/95 dark:bg-amber-500/95 text-white rounded-full p-1.5 shadow-lg flex items-center justify-center backdrop-blur-sm transform translate-y-1 opacity-0 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300"
      >
        <span class="material-symbols-outlined text-sm">tune</span>
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
        <span
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
