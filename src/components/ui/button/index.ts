export { default as Button } from './Button.vue'

import { type VariantProps, cva } from 'class-variance-authority'

export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none',
  {
    variants: {
      variant: {
        primary: 'bg-[#2D241E] text-white hover:bg-[#5B5048] disabled:bg-[#9D9691]',
        secondary:
          'bg-[#FFDDC7] text-[#2D241E] hover:bg-[#FFDFC9] disabled:bg-[#F9EFE9] disabled:text-[#B6A295]',
        tertiary: [
          'bg-transparent text-[#2D241E] shadow-none', // Default
          'hover:bg-transparent', // Hover
          'disabled:text-[#B6A295] disabled:no-underline', // Disabled
        ],
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
