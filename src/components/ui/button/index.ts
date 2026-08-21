export { default as Button } from './Button.vue'

import { type VariantProps, cva } from 'class-variance-authority'

export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none',
  {
    variants: {
      variant: {
        default: 'bg-[#D2691E] text-primary-foreground hover:bg-[#B35919] disabled:bg-[#D2691E]/50',
        primary: 'bg-[#D2691E] text-primary-foreground hover:bg-[#B35919] disabled:bg-[#D2691E]/50',
        secondary:
          'bg-[#FFDDC7] text-[#2D241E] hover:bg-[#FFDFC9] disabled:bg-[#F9EFE9] disabled:text-[#B6A295]',
        tertiary: [
          'bg-transparent text-[#2D241E] shadow-none',
          'hover:bg-transparent',
          'disabled:text-[#B6A295] disabled:no-underline',
        ],
        outline:
          'border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 hover:bg-stone-50 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300',
        ghost: 'hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300',
        destructive: 'bg-red-600 text-white hover:bg-red-700 disabled:bg-red-400',
        icon: 'bg-[#EDEDED] text-[#2D241E] hover:bg-[#E2E2E2] rounded-xl',
      },
      size: {
        default: 'h-11 px-6 py-2',
        sm: 'h-9 px-4 text-xs',
        lg: 'h-12 px-10 text-base',
        icon: 'h-11 w-11 p-0',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'default',
    },
  }
)

export type ButtonVariants = VariantProps<typeof buttonVariants>
