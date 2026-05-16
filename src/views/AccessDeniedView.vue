<script setup lang="ts">
import { LockClosedIcon } from '@heroicons/vue/24/outline'

import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const handleSwitchUser = () => {
}

const handleLogOut = () => {
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-[#FBF8F6] p-6">
    <div class="flex flex-col items-center text-center p-10 bg-white rounded-[2.5rem] shadow-sm max-w-sm w-full border border-[#F1E9E4]">
      
      <div class="mb-8">
        <div class="size-24 bg-[#FFEEE3] rounded-full flex items-center justify-center">
          <LockClosedIcon class="size-10 text-[#C1352E]" />
        </div>
      </div>

      <h2 class="text-3xl font-bold text-[#2D241E] mb-4">{{ t('accessDenied.title') }}</h2>
      <p class="text-[#5B5048] text-sm leading-relaxed mb-10 px-2">
        {{ t('accessDenied.text') }}
      </p>

      <div class="w-full flex flex-col gap-3">
        <Button 
          variant="primary" 
          class="w-full" 
          @click="handleSwitchUser"
        >
        {{ t('accessDenied.swithchUser') }}
        </Button>

        <Button 
          variant="tertiary" 
          class="w-full" 
          @click="handleLogOut"
        >
          {{ t('accessDenied.logout') }}
        </Button>
      </div>
    </div>
  </div>
</template>