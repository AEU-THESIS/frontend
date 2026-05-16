<script setup lang="ts">
import { WifiOffIcon, RefreshCwIcon } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const reloadPage = () => {
  window.location.reload()
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-[#FBF8F6] p-8">
    <div class="flex flex-col items-center text-center p-12 bg-white rounded-[2.5rem] shadow-sm max-w-lg w-full border border-[#F1E9E4]">
      
      <div class="mb-10">
        <div class="size-24 bg-[#FFEEE3] rounded-full flex items-center justify-center shadow-inner">
          <WifiOffIcon class="size-10 text-[#C1352E]" />
        </div>
      </div>

      <h2 class="text-3xl font-bold text-[#2D241E] mb-2">{{ t('offlineview.noConnection') }}</h2>
      <h3 class="text-xl font-semibold text-[#5B5048] mb-6">{{ t('offlineview.wifi') }}...</h3>
      
      <p class="text-[#9D9691] text-base leading-relaxed mb-10 px-4">
        {{ t('offlineview.text') }}
      </p>

      <div class="flex flex-col w-full gap-3 max-w-xs">
        <Button variant="primary" @click="reloadPage" :icon="RefreshCwIcon">{{ t('offlineview.tryAgain') }}</Button>
      </div>
    </div>
  </div>
</template>