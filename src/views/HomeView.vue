<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
</script>

<template>
  <div class="min-h-screen flex items-center justify-center">
    <h1 class="text-4xl font-bold">{{ t('app.title') }}</h1>
  </div>
</template>
