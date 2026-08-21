<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { usePublicShopStore } from '@/store/usePublicShopStore'

const { t } = useI18n()
const shopStore = usePublicShopStore()
</script>

<template>
  <div class="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
    <!-- Animated block icon -->
    <div
      class="mb-8 flex size-28 items-center justify-center rounded-full bg-red-50 dark:bg-red-950/30 ring-8 ring-red-100/50 dark:ring-red-900/20"
    >
      <svg
        class="size-14 text-red-400 dark:text-red-500 blocked-icon"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        stroke-width="1.5"
        stroke="currentColor"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
        />
      </svg>
    </div>

    <!-- Title -->
    <h1 class="text-2xl font-bold text-stone-800 dark:text-stone-100 mb-3">
      {{ t('publicOrder.blocked.title') }}
    </h1>

    <!-- Message -->
    <p class="text-base text-stone-500 dark:text-stone-400 leading-relaxed mb-2 max-w-sm">
      {{ t('publicOrder.blocked.message') }}
    </p>

    <!-- Contact hint -->
    <p class="text-sm text-stone-400 dark:text-stone-500 mb-8 max-w-xs">
      {{ t('publicOrder.blocked.contact') }}
    </p>

    <!-- Shop name pill (if available) -->
    <div
      v-if="shopStore.shop?.name"
      class="inline-flex items-center gap-2 rounded-full bg-stone-100 dark:bg-stone-800 px-4 py-2 text-sm font-medium text-stone-600 dark:text-stone-300"
    >
      <span class="material-symbols-outlined text-base">storefront</span>
      {{ shopStore.shop.name }}
    </div>
  </div>
</template>

<style scoped>
.blocked-icon {
  animation: gentle-pulse 3s ease-in-out infinite;
}

@keyframes gentle-pulse {
  0%,
  100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.7;
    transform: scale(1.05);
  }
}
</style>
