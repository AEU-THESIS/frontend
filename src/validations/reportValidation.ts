import { z } from 'zod'

/**
 * Issue messages are these codes rather than prose, so a form can map them onto
 * its own translation keys instead of re-deriving the rules from scratch.
 */
export type SalesSummaryExportRangeError = 'required' | 'invalidRange' | 'future'

const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'required')

/**
 * Window for the Sales Summary Excel export. The workbook renders one row-block
 * per day, so the range is inclusive on both ends and must not run backwards.
 */
export const salesSummaryExportRangeSchema = z
  .object({
    startDate: isoDateSchema,
    endDate: isoDateSchema,
  })
  .refine(range => range.startDate <= range.endDate, {
    path: ['endDate'],
    message: 'invalidRange',
  })

/**
 * The export form's rules: the window above plus the "no day in the future"
 * bound. That bound depends on the shop's today, so the caller supplies it —
 * which is why this is a factory rather than a constant.
 *
 * Checks accumulate in declaration order, so reading the first issue yields the
 * precedence required -> invalidRange -> future.
 */
export const salesSummaryExportFormSchema = (maxDate: string) =>
  salesSummaryExportRangeSchema.refine(
    range => range.startDate <= maxDate && range.endDate <= maxDate,
    { path: ['endDate'], message: 'future' }
  )

export type SalesSummaryExportRange = z.infer<typeof salesSummaryExportRangeSchema>
