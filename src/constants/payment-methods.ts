import type { PaymentMethodType } from "@/generated/prisma/client";

export const paymentMethodTypeLabels: Record<PaymentMethodType, string> = {
  CASH: "เงินสด",
  BANK_TRANSFER: "โอนธนาคาร",
  PROMPTPAY: "พร้อมเพย์",
  TRUE_MONEY: "TrueMoney",
  OTHER: "อื่น ๆ",
};

export const paymentMethodTypeOptions = Object.entries(paymentMethodTypeLabels).map(([value, label]) => ({
  value,
  label,
}));

export const defaultPaymentMethods = [
  { name: "เงินสด", type: "CASH" as const },
  { name: "โอนธนาคาร", type: "BANK_TRANSFER" as const },
  { name: "พร้อมเพย์", type: "PROMPTPAY" as const },
];
