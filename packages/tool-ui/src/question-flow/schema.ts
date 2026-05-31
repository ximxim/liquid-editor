import { z } from 'zod'

export const QuestionFlowArgsSchema = z.object({
  question: z.string(),
  options: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
      description: z.string().optional(),
    }),
  ),
})

export const QuestionFlowReceiptSchema = z.object({
  selectedId: z.string(),
})

export type QuestionFlowArgs = z.infer<typeof QuestionFlowArgsSchema>
export type QuestionFlowReceipt = z.infer<typeof QuestionFlowReceiptSchema>
