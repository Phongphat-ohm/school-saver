import { z } from "zod";

export const paymentSchema = z.object({
  memberRoundId: z.string().min(1),
  amount: z.coerce.number().int().positive("จำนวนเงินต้องมากกว่า 0"),
  paymentMethodId: z.string().min(1, "กรุณาเลือกวิธีชำระเงิน"),
  paidAt: z.coerce.date(),
  note: z.string().optional(),
});

export const paymentSearchSchema = z.object({
  keyword: z.string().trim().optional().default(""),
});
