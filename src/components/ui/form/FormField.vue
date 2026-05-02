<script setup lang="ts">
import { ref, computed } from 'vue'
import { Eye, EyeOff, ChevronDown } from 'lucide-vue-next'
import { cn } from '@/lib/utils'

interface FieldOption {
  label: string
  value: string | number
}

interface Props {
  modelValue: any
  type?: 'text' | 'password' | 'select' | 'email' | 'number'
  label?: string
  placeholder?: string
  error?: string
  options?: FieldOption[]
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  type: 'text',
  disabled: false
})

const emit = defineEmits(['update:modelValue'])

const showPassword = ref(false)
const inputType = computed(() => {
  if (props.type === 'password') return showPassword.value ? 'text' : 'password'
  return props.type
})

const baseClass = cn(
  'w-full h-12 px-4 rounded-xl text-sm transition-all outline-none border border-transparent',
  'bg-[#E6E6E6] text-[#2D241E] placeholder:text-[#9D9691]',
  'focus:bg-[#DEDEDE] focus:border-[#CACACA]',
  'disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-[#F2F2F2]'
)

const errorClass = 'bg-[#FEE2E2] border-[#EF4444] text-[#B91C1C] placeholder:text-[#EF4444]/60'
</script>

<template>
  <div :class="cn('flex flex-col gap-1.5 w-full mb-4', disabled && 'opacity-60')">
    <label v-if="label" class="text-xs font-medium text-[#5B5048] px-1">
      {{ label }}
    </label>

    <div class="relative flex items-center">
      <template v-if="type === 'select'">
        <select
          :value="modelValue"
          :disabled="disabled"
          @change="emit('update:modelValue', ($event.target as HTMLSelectElement).value)"
          :class="cn(baseClass, 'appearance-none cursor-pointer', error && errorClass)"
        >
          <option value="" disabled selected v-if="placeholder">{{ placeholder }}</option>
          <option v-for="opt in options" :key="opt.value" :value="opt.value">
            {{ opt.label }}
          </option>
        </select>
        <ChevronDown class="absolute right-4 size-4 pointer-events-none text-[#5B5048]" />
      </template>

      <template v-else>
        <input
          :type="inputType"
          :value="modelValue"
          :disabled="disabled"
          :placeholder="placeholder"
          @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
          :class="cn(baseClass, error && errorClass)"
        />
        
        <button
          v-if="type === 'password' && !disabled"
          type="button"
          @click="showPassword = !showPassword"
          class="absolute right-4 text-[#5B5048]"
        >
          <component :is="showPassword ? EyeOff : Eye" class="size-5" />
        </button>
      </template>
    </div>

    <span v-if="error" class="text-[10px] text-[#B91C1C] font-medium px-1">
      {{ error }}
    </span>
  </div>
</template>