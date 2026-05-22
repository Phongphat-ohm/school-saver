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
  sortBy: z.enum(["paidAt", "amount", "member", "round"]).optional().default("paidAt"),
  sortDir: z.enum(["asc", "desc"]).optional().default("desc"),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(10).max(100).optional().default(25),
});

export const updatePaymentTransactionSchema = z.object({
  amount: z.coerce.number().int().positive("จำนวนเงินต้องมากกว่า 0"),
  paymentMethodId: z.string().min(1, "กรุณาเลือกวิธีชำระเงิน"),
  paidAt: z.coerce.date(),
  note: z.string().optional(),
});
