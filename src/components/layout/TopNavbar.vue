<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
</script>

<template>
  <header
    class="h-16 bg-white dark:bg-stone-900 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between px-8 shrink-0"
  >
    <h2 class="font-bold text-stone-800 dark:text-stone-50 text-lg">
      {{ t('navbar.menuManagement') }}
    </h2>
    <div class="flex items-center gap-3">
      <button
        class="w-10 h-10 rounded-full flex items-center justify-center text-stone-500 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
      >
        <span class="material-symbols-outlined text-[22px]">notifications</span>
      </button>
      <button
        class="w-10 h-10 rounded-full flex items-center justify-center text-stone-500 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
      >
        <span class="material-symbols-outlined text-[22px]">settings</span>
      </button>
      <div
        class="w-8 h-8 rounded-full bg-stone-200 dark:bg-stone-700 overflow-hidden ml-2 cursor-pointer ring-2 ring-transparent hover:ring-amber-700 transition-all"
      >
        <img
          src="https://i.pravatar.cc/150?u=a042581f4e29026704d"
          alt="Profile"
          class="w-full h-full object-cover"
        />
      </div>
    </div>
  </header>
</template>
