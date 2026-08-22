<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { usePublicShopStore } from '@/store/usePublicShopStore'

const { t } = useI18n()
const shopStore = usePublicShopStore()
</script>

<template>
  <div class="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
    <!-- Animated closed storefront icon -->
    <div
      class="mb-8 flex size-28 items-center justify-center rounded-full bg-amber-50 dark:bg-amber-950/30 ring-8 ring-amber-100/50 dark:ring-amber-900/20"
    >
      <span
        class="material-symbols-outlined text-5xl text-amber-600 dark:text-amber-400 closed-icon"
      >
        storefront
      </span>
    </div>

    <!-- Title -->
    <h1 class="text-2xl font-bold text-stone-800 dark:text-stone-100 mb-3">
      {{ t('publicOrder.closed.title') }}
    </h1>

    <!-- Message -->
    <p class="text-base text-stone-500 dark:text-stone-400 leading-relaxed mb-2 max-w-sm">
      {{ t('publicOrder.closed.message') }}
    </p>

    <!-- Note / apology hint -->
    <p class="text-sm text-stone-400 dark:text-stone-500 mb-8 max-w-xs">
      {{ t('publicOrder.closed.note') }}
    </p>

    <!-- Shop name pill -->
    <div
      v-if="shopStore.shop?.name"
      class="inline-flex items-center gap-2 rounded-full bg-stone-100 dark:bg-stone-800 px-4 py-2 text-sm font-medium text-stone-600 dark:text-stone-300"
    >
      <span class="material-symbols-outlined text-base">store</span>
      {{ shopStore.shop.name }}
    </div>
  </div>
</template>

<style scoped>
.closed-icon {
  animation: gentle-pulse 3s ease-in-out infinite;
}

@keyframes gentle-pulse {
  0%,
  100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.8;
    transform: scale(1.06);
  }
}
</style>
