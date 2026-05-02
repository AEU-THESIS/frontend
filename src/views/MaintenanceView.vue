<script setup lang="ts">
import { Headset } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-[#FBF8F6] p-6">
    <div class="flex flex-col items-center text-center p-8 bg-white rounded-[2.5rem] shadow-sm max-w-md w-full border border-[#F1E9E4]">
      
      <div class="w-full aspect-[16/9] mb-8 rounded-[1.5rem] overflow-hidden">
        <img 
          src="../../assets/cafe.jpg"
          class="w-full h-full object-cover"
        />
      </div>

      <h2 class="text-3xl font-bold text-[#2D241E] mb-4">
        {{ t('maintenance.title') }}
      </h2>
      
      <div class="space-y-4 px-2">
        <p class="text-[#5B5048] text-sm leading-relaxed">
          {{ t('maintenance.text') }}
        </p>
      </div>

      <div class="mt-10">
        <ui-button variant="secondary" :icon="Headset">
          {{ t('maintenance.contactSupport') }}
        </ui-button>
      </div>
    </div>
  </div>
</template>