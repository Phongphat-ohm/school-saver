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

export const paymentHistoryFilterSchema = z.object({
  roundId: z.string().trim().optional(),
  member: z.string().trim().optional(),
  startDate: z.string().trim().optional(),
  endDate: z.string().trim().optional(),
});

export const updatePaymentTransactionSchema = z.object({
  amount: z.coerce.number().int().positive("จำนวนเงินต้องมากกว่า 0"),
  paymentMethodId: z.string().min(1, "กรุณาเลือกวิธีชำระเงิน"),
  paidAt: z.coerce.date(),
  note: z.string().optional(),
});
