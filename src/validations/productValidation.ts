import { z } from 'zod'
import { PRICE_MODE, TYPE, OPTIONS_SET_TYPE } from '@/constants/product'

const productInfo = 'menuManagement.productForm.productValidation.product'
const size = 'menuManagement.productForm.productValidation.size'
const choice = 'menuManagement.productForm.productValidation.choice'
const optionGroup = 'menuManagement.productForm.productValidation.optionGroup'

export const productSizeSchema = z.object({
  id: z.string(),
  size: z.string().min(1, `${size}.required`),
  price: z
    .number()
    .nullable()
    .refine(val => val === null || !isNaN(val), `${size}.priceInvalid`),
})
export const productChoiceSchema = z.object({
  id: z.string(),
  label: z.string().min(1, `${choice}.labelRequired`),
  priceModifier: z
    .number()
    .nullable()
    .refine(val => val === null || !isNaN(val), `${choice}.priceModifierInvalid`),
})
export const optionGroupSchema = z.object({
  id: z.string(),
  name: z.string().min(1, `${optionGroup}.nameRequired`),
  choices: z.array(productChoiceSchema).min(1, `${optionGroup}.choicesRequired`),
  type: z.enum([OPTIONS_SET_TYPE.SIZE, OPTIONS_SET_TYPE.CUSTOM]).optional(),
})
const baseProductSchema = z.object({
  name: z.string().min(1, `${productInfo}.nameRequired`).max(255, `${productInfo}.nameTooLong`),
  category: z.union([z.string().min(1, `${productInfo}.categoryRequired`), z.number()]),
  type: z.enum([TYPE.FOOD, TYPE.DRINK]),
  optionGroups: z.array(optionGroupSchema),
  description: z.string().optional(),
  imageUrl: z.string().nullable().optional(),
})
const fixedPriceSchema = baseProductSchema.extend({
  priceMode: z.literal(PRICE_MODE.FIXED),
  price: z.coerce.number().positive(`${productInfo}.priceRequiredAndPositive`),
  sizes: z.array(z.any()).optional(),
})
const bySizeSchema = baseProductSchema.extend({
  priceMode: z.literal(PRICE_MODE.BY_SIZE),
  price: z.number().nullable().optional(),
  sizes: z
    .array(productSizeSchema)
    .min(1, `${productInfo}$.sizesRequired`)
    .superRefine((sizes, ctx) => {
      sizes.forEach((size, index) => {
        if (!size.price || size.price <= 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `${productInfo}.sizePricePositive`,
            path: [index, 'price'],
          })
        }
      })
    }),
})

export const productFormSchema = z.discriminatedUnion('priceMode', [fixedPriceSchema, bySizeSchema])

export type ProductFormInput = z.infer<typeof productFormSchema>

// API payload schema - what we send to the backend
const basePayloadSchema = z.object({
  name: z.string().min(1),
  categoryId: z.number(),
  type: z.enum([TYPE.FOOD, TYPE.DRINK]),
  description: z.string().optional(),
  imageUrl: z.string().nullable().optional(),
  isAvailable: z.boolean(),
  optionSets: z
    .array(
      z.object({
        name: z.string(),
        elements: z.array(
          z.object({
            label: z.string(),
            priceModifier: z.number(),
          })
        ),
      })
    )
    .optional(),
})

export const createProductPayloadSchema = z.discriminatedUnion('priceMode', [
  basePayloadSchema.extend({
    priceMode: z.literal(PRICE_MODE.FIXED),
    price: z.number().positive(),
  }),
  basePayloadSchema.extend({
    priceMode: z.literal(PRICE_MODE.BY_SIZE),
    price: z.number().nullable().optional(),
    // The form submits size options via `optionSets` (a "Sizes & Prices" group),
    // so a separate `sizes` field is optional on the payload.
    sizes: z
      .array(
        z.object({
          size: z.number(),
          price: z.number().positive(),
        })
      )
      .optional(),
  }),
])

export type CreateProductPayload = z.infer<typeof createProductPayloadSchema>

export const createCategoryPayloadSchema = z.object({
  name: z.string().min(1, 'Category name is required'),
  isActive: z.boolean(),
})
