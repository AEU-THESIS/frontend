<script setup lang="ts">
import { type Component, type HTMLAttributes } from 'vue'
import { Primitive, type PrimitiveProps } from 'reka-ui'
import { cn } from '@/lib/utils'
import { type ButtonVariants, buttonVariants } from '.'

interface Props extends PrimitiveProps {
  variant?: ButtonVariants['variant']
  size?: ButtonVariants['size']
  class?: HTMLAttributes['class']
  icon?: Component //
  iconPlacement?: 'left' | 'right'
}

const props = withDefaults(defineProps<Props>(), {
  as: 'button',
  iconPlacement: 'left',
})
</script>

<template>
  <Primitive
    data-slot="button"
    :as="as"
    :as-child="asChild"
    :class="cn(buttonVariants({ variant, size }), props.class)"
  >
    <!-- Left Icon -->
    <template v-if="icon && iconPlacement === 'left'">
      <component :is="icon" class="size-4 shrink-0" />
    </template>

    <slot />

    <!-- Right Icon -->
    <template v-if="icon && iconPlacement === 'right'">
      <component :is="icon" class="size-4 shrink-0" />
    </template>
  </Primitive>
</template>
