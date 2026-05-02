<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const router = useRouter()

const goHome = () => {
  router.push('/')
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-[#FBF8F6] p-8">
    
    <div class="flex flex-col items-center text-center p-12 bg-white rounded-[2.5rem] shadow-sm max-w-lg w-full border border-[#F1E9E4]">
      
      <div class="relative mb-10">
        <div class="size-56 md:size-64 rounded-full overflow-hidden border-8 border-[#FBF8F6] shadow-inner relative z-10">
          <img 
            src="../assets/cafe.jpg" 
            alt="Spilled Coffee" 
            class="object-cover w-full h-full scale-110"
          />
        </div>
      </div>

      <h1 class="text-4xl md:text-5xl font-bold text-[#2D241E] mb-3">
        404
      </h1>
      <h2 class="text-xl md:text-2xl font-semibold text-[#5B5048] mb-6">
        {{ t('notFound.empty') }}
      </h2>
      
      <p class="text-[#9D9691] text-base md:text-lg leading-relaxed mb-10 px-4">
        {{ t('notFound.text') }}
      </p>

      <div class="w-full max-w-xs">
        <ui-button 
          variant="primary" 
          size="lg" 
          class="w-full h-14 text-lg rounded-2xl"
          @click="goHome"
        >
          {{ t('notFound.backHome') }}
        </ui-button>
      </div>
    </div>
  </div>
</template>

<style scoped>
@keyframes float {
  0% { transform: translateY(0px); }
  50% { transform: translateY(-10px); }
  100% { transform: translateY(0px); }
}

.rounded-full {
  animation: float 6s ease-in-out infinite;
}
</style>