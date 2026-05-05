import { z } from 'zod'

export const createStaffSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
  roleId: z.number().int().positive('Role is required'),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  imageUrl: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
})
