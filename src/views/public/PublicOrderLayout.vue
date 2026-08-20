<script setup lang="ts">
import { onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { usePublicShopStore } from '@/store/usePublicShopStore'

const route = useRoute()
const { t } = useI18n()
const shopStore = usePublicShopStore()

const load = () => {
  const slug = String(route.params.slug ?? '')
  if (slug) shopStore.loadMenu(slug)
}

onMounted(load)
watch(() => route.params.slug, load)
</script>

<template>
  <div class="min-h-screen bg-stone-100 dark:bg-stone-950">
    <!-- Phone-width column on mobile; a centered app-card on tablet/desktop so a
         browser visitor sees an intentional layout, not a stranded strip. -->
    <div
      class="tg-app mx-auto flex min-h-screen max-w-md flex-col bg-stone-50 dark:bg-stone-900 md:my-6 md:min-h-[calc(100vh-3rem)] md:overflow-hidden md:rounded-[2rem] md:shadow-2xl md:ring-1 md:ring-stone-200/60 dark:md:ring-stone-800"
    >
      <!-- Loading skeleton -->
      <div v-if="shopStore.loading" class="p-4">
        <div class="mb-3 h-7 w-40 animate-pulse rounded-lg bg-stone-200 dark:bg-stone-800"></div>
        <div class="mb-4 h-10 w-full animate-pulse rounded-xl bg-stone-200 dark:bg-stone-800"></div>
        <div class="mb-4 flex gap-2">
          <div
            v-for="i in 4"
            :key="i"
            class="h-7 w-16 animate-pulse rounded-full bg-stone-200 dark:bg-stone-800"
          ></div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div v-for="i in 6" :key="i" class="overflow-hidden rounded-2xl">
            <div class="aspect-square animate-pulse bg-stone-200 dark:bg-stone-800"></div>
            <div class="space-y-2 p-2.5">
              <div class="h-3 w-3/4 animate-pulse rounded bg-stone-200 dark:bg-stone-800"></div>
              <div class="h-3 w-1/3 animate-pulse rounded bg-stone-200 dark:bg-stone-800"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Error -->
      <div
        v-else-if="shopStore.error || !shopStore.shop"
        class="flex flex-1 flex-col items-center justify-center gap-2 p-10 text-center"
      >
        <span class="material-symbols-outlined text-5xl text-stone-300">storefront</span>
        <p class="font-bold text-stone-700 dark:text-stone-200">
          {{ t('publicOrder.shopNotFound') }}
        </p>
      </div>

      <!-- Content with page transition -->
      <router-view v-else v-slot="{ Component }">
        <transition name="page" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </div>
  </div>
</template>

<style scoped>
.page-enter-active,
.page-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.22s ease;
}
.page-enter-from {
  opacity: 0;
  transform: translateY(10px);
}
.page-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
