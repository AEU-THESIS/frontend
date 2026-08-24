<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Button } from '@/components/ui/button'
import { APP_ROUTES } from '@/constants/appRoutes'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()

const goMenu = () =>
  router.push({
    name: APP_ROUTES.PUBLIC_MENU.name,
    params: { slug: String(route.params.slug ?? '') },
  })
</script>

<template>
  <div class="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
    <div
      class="flex h-20 w-20 items-center justify-center rounded-full bg-stone-100 dark:bg-stone-800"
    >
      <span class="material-symbols-outlined text-4xl text-stone-400">search_off</span>
    </div>
    <div>
      <h1 class="text-2xl font-extrabold text-stone-900 dark:text-stone-50">
        {{ t('publicOrder.notFoundTitle') }}
      </h1>
      <p class="mt-1 text-sm text-stone-500 dark:text-stone-400">
        {{ t('publicOrder.notFoundMessage') }}
      </p>
    </div>
    <Button
      class="h-auto rounded-xl px-8 py-3 font-bold transition active:scale-95"
      @click="goMenu"
    >
      {{ t('publicOrder.backToMenu') }}
    </Button>
  </div>
</template>
