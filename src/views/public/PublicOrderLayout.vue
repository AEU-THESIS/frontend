<script setup lang="ts">
import { onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { usePublicShopStore } from '@/store/usePublicShopStore'
import { APP_ROUTES } from '@/constants/appRoutes'

const route = useRoute()
const router = useRouter()
const shopStore = usePublicShopStore()

let loadVersion = 0

const load = async () => {
  const slug = String(route.params.slug ?? '')
  if (!slug) {
    router.replace({ name: APP_ROUTES.NOT_FOUND.name })
    return
  }
  const version = ++loadVersion
  const success = await shopStore.loadMenu(slug)
  if (version !== loadVersion) return
  if (!success || shopStore.error || !shopStore.shop) {
    router.replace({ name: APP_ROUTES.NOT_FOUND.name })
  }
}

onMounted(load)
watch(() => route.params.slug, load)
</script>

<template>
  <div class="min-h-screen w-full bg-stone-100 dark:bg-stone-950 flex justify-center">
    <!-- Seamless full-height container on mobile and responsive max-width on tablet/PC -->
    <div
      class="tg-app w-full max-w-md md:max-w-xl lg:max-w-2xl min-h-screen flex flex-col bg-stone-50 dark:bg-stone-900 border-x border-stone-200/50 dark:border-stone-800/50 shadow-sm"
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
        <div class="grid grid-cols-2 gap-3 md:grid-cols-3">
          <div v-for="i in 6" :key="i" class="overflow-hidden rounded-2xl">
            <div class="aspect-square animate-pulse bg-stone-200 dark:bg-stone-800"></div>
            <div class="space-y-2 p-2.5">
              <div class="h-3 w-3/4 animate-pulse rounded bg-stone-200 dark:bg-stone-800"></div>
              <div class="h-3 w-1/3 animate-pulse rounded bg-stone-200 dark:bg-stone-800"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Content with page transition -->
      <router-view v-else-if="shopStore.shop" v-slot="{ Component }">
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
