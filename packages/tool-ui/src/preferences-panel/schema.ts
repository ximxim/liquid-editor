import { z } from 'zod'

export const PreferencesPanelFieldSchema = z.object({
  id: z.string(),
  label: z.string(),
  type: z.enum(['slider', 'select', 'toggle']),
  options: z.array(z.string()).optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  value: z.union([z.string(), z.number(), z.boolean()]),
})

export const PreferencesPanelArgsSchema = z.object({
  title: z.string(),
  fields: z.array(PreferencesPanelFieldSchema),
})

export const PreferencesPanelReceiptSchema = z.object({
  values: z.record(z.union([z.string(), z.number(), z.boolean()])),
})

export type PreferencesPanelField = z.infer<typeof PreferencesPanelFieldSchema>
export type PreferencesPanelArgs = z.infer<typeof PreferencesPanelArgsSchema>
export type PreferencesPanelReceipt = z.infer<typeof PreferencesPanelReceiptSchema>
