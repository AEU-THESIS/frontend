<script setup lang="ts">
import type { TablePrimitiveProps } from '@/types/table.types'
import { cn } from '@/lib/utils'

const props = defineProps<TablePrimitiveProps>()
</script>

<template>
  <caption data-slot="table-caption" :class="cn('text-muted-foreground mt-4 text-sm', props.class)">
    <slot />
  </caption>
</template>
