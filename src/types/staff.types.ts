import { z } from 'zod'
import { createStaffSchema } from '@/validations/staffValidation'

export type CreateStaffInput = z.infer<typeof createStaffSchema>
