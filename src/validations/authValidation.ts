import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

export type LoginInput = z.infer<typeof loginSchema>

export const UserSchema = z.object({
  user_id: z.number(),
  name: z.string().optional(),
  email: z.string().optional(),
  shop_id: z.number(),
  role: z.string().nullable(),
})
