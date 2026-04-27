<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import maintenanceImg from '@/assets/under-maintenance.png'

const { t } = useI18n()
</script>

<template>
  <div class="flex-1 flex items-center justify-center p-8 bg-stone-50 dark:bg-stone-900 h-full">
    <section
      class="bg-white dark:bg-stone-800 shadow-sm border border-stone-200 dark:border-stone-700 p-8 md:p-12 rounded-2xl flex flex-col items-center text-center justify-center max-w-2xl w-full"
    >
      <div class="w-full h-48 mb-8 rounded-2xl overflow-hidden bg-stone-100 dark:bg-stone-900">
        <img
          alt="Cafe maintenance"
          class="w-full h-full object-cover opacity-90"
          :src="maintenanceImg"
        />
      </div>
      <h2
        class="font-headline text-3xl font-semibold tracking-tight text-stone-800 dark:text-stone-50 mb-3"
      >
        {{ t('maintenance.title') }}
      </h2>
      <p
        class="font-body text-stone-500 dark:text-stone-400 mb-10 max-w-md leading-relaxed text-sm md:text-base"
      >
        {{ t('maintenance.message') }}
      </p>
      <Button
        class="bg-amber-700 text-white rounded-xl px-8 py-3.5 h-auto font-semibold hover:bg-amber-800 transition-all font-body"
      >
        {{ t('maintenance.contactSupport') }}
      </Button>
    </section>
  </div>
</template>
