import { z } from "zod";

export const paymentMethodSchema = z.object({
  name: z.string().trim().min(1, "กรุณากรอกชื่อวิธีชำระเงิน"),
  type: z.enum(["CASH", "BANK_TRANSFER", "PROMPTPAY", "TRUE_MONEY", "OTHER"]),
  accountName: z.string().optional(),
  accountNumber: z.string().optional(),
  bankName: z.string().optional(),
  qrImageUrl: z.string().optional(),
});
