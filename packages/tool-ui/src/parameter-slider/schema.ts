import { z } from 'zod'

export const ParameterSliderArgsSchema = z.object({
  label: z.string(),
  min: z.number(),
  max: z.number(),
  step: z.number(),
  value: z.number(),
  unit: z.string().optional(),
})

export const ParameterSliderReceiptSchema = z.object({
  value: z.number(),
})

export type ParameterSliderArgs = z.infer<typeof ParameterSliderArgsSchema>
export type ParameterSliderReceipt = z.infer<typeof ParameterSliderReceiptSchema>
