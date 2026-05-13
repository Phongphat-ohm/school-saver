import type { PaymentMethod } from "@/generated/prisma/client";

export type PaymentMethodFormValues = Pick<
  PaymentMethod,
  "name" | "type" | "accountName" | "accountNumber" | "bankName" | "qrImageUrl"
>;
