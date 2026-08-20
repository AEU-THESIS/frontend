<script setup lang="ts">
import {
  TooltipProvider,
  TooltipRoot,
  TooltipTrigger,
  TooltipPortal,
  TooltipContent,
  TooltipArrow,
} from 'reka-ui'

/**
 * Styled hover/focus tooltip around any trigger content.
 *
 * Renders the trigger as-is when `content` is empty, so callers can pass a
 * conditional string and get a tooltip only when there is something to say:
 *
 * <AppTooltip :content="item.cannotDelete ? reason : ''">
 *   <button>…</button>
 * </AppTooltip>
 *
 * Wrap disabled controls in a plain element (a `span`) inside the slot —
 * `disabled` buttons swallow pointer events, so the tooltip would never open.
 */
withDefaults(
  defineProps<{
    /** Tooltip text. Empty or omitted renders the trigger with no tooltip. */
    content?: string
    side?: 'top' | 'right' | 'bottom' | 'left'
    /** Milliseconds to hover before the tooltip opens. */
    delayDuration?: number
  }>(),
  {
    side: 'top',
    delayDuration: 150,
  }
)
</script>

<template>
  <TooltipProvider :delay-duration="delayDuration">
    <TooltipRoot>
      <TooltipTrigger as-child>
        <slot />
      </TooltipTrigger>

      <TooltipPortal v-if="content">
        <TooltipContent
          :side="side"
          :side-offset="6"
          class="z-[60] max-w-[260px] rounded-md bg-zinc-900 dark:bg-stone-700 px-2.5 py-1.5 text-xs font-medium leading-snug text-white shadow-lg select-none"
        >
          {{ content }}
          <TooltipArrow class="fill-zinc-900 dark:fill-stone-700" :width="10" :height="5" />
        </TooltipContent>
      </TooltipPortal>
    </TooltipRoot>
  </TooltipProvider>
</template>
