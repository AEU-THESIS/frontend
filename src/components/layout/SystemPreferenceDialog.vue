<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useDark, useToggle } from '@vueuse/core'

defineProps<{
  isOpen: boolean
}>()

const emit = defineEmits<{
  (e: 'update:isOpen', value: boolean): void
}>()

const { t, locale } = useI18n()

// Theme toggle logic using VueUse
const isDark = useDark()
const toggleDark = useToggle(isDark)

const setLight = () => {
  if (isDark.value) toggleDark()
}

const setDark = () => {
  if (!isDark.value) toggleDark()
}

const setLanguage = (lang: string) => {
  locale.value = lang
  localStorage.setItem('app-locale', lang)
}
</script>

<template>
  <div
    v-if="isOpen"
    class="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200"
  >
    <div
      class="absolute inset-0 bg-stone-900/60 backdrop-blur-sm"
      @click="emit('update:isOpen', false)"
    ></div>
    <div
      class="relative w-full max-w-sm bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
    >
      <div
        class="px-6 py-4 border-b border-stone-100 dark:border-stone-800 flex items-center justify-between"
      >
        <h3 class="text-lg font-bold text-stone-900 dark:text-stone-50">
          {{ t('preferences.title') }}
        </h3>
        <button
          class="text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 transition-colors flex items-center justify-center"
          @click="emit('update:isOpen', false)"
        >
          <span class="material-symbols-outlined text-xl">close</span>
        </button>
      </div>
      <div class="p-6 space-y-6">
        <!-- Language -->
        <div>
          <label class="block text-sm font-semibold text-stone-700 dark:text-stone-300 mb-3">{{
            t('preferences.language')
          }}</label>
          <div class="flex items-center gap-3">
            <button
              :class="[
                'flex-1 py-2 px-3 rounded-lg border-2 text-sm text-center font-bold transition-colors',
                locale === 'en'
                  ? 'border-primary bg-primary/5 text-primary'
                  : 'border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800',
              ]"
              @click="setLanguage('en')"
            >
              {{ t('preferences.english') }}
            </button>
            <button
              :class="[
                'flex-1 py-2 px-3 rounded-lg border-2 text-sm text-center font-bold transition-colors',
                locale === 'kh'
                  ? 'border-primary bg-primary/5 text-primary'
                  : 'border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800',
              ]"
              @click="setLanguage('kh')"
            >
              {{ t('preferences.khmer') }}
            </button>
          </div>
        </div>

        <!-- Theme -->
        <div>
          <label class="block text-sm font-semibold text-stone-700 dark:text-stone-300 mb-3">{{
            t('preferences.theme')
          }}</label>
          <div class="flex items-center gap-3">
            <button
              :class="[
                'flex-1 py-2 px-3 rounded-lg border-2 text-sm text-center flex items-center justify-center gap-2 font-bold transition-colors',
                !isDark
                  ? 'border-primary bg-primary/5 text-primary'
                  : 'border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800',
              ]"
              @click="setLight"
            >
              <span class="material-symbols-outlined text-base">light_mode</span>
              {{ t('preferences.light') }}
            </button>
            <button
              :class="[
                'flex-1 py-2 px-3 rounded-lg border-2 text-sm text-center flex items-center justify-center gap-2 font-bold transition-colors',
                isDark
                  ? 'border-primary bg-primary/5 text-primary'
                  : 'border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800',
              ]"
              @click="setDark"
            >
              <span class="material-symbols-outlined text-base">dark_mode</span>
              {{ t('preferences.dark') }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
