import { z } from "zod";

export const idSchema = z.string().min(1, "ไม่พบรหัสข้อมูล");

export const optionalTextSchema = z
  .string()
  .optional()
  .transform((value) => (value?.trim() ? value.trim() : undefined));

export const positiveMoneySchema = z.coerce.number().int("ต้องเป็นตัวเลขจำนวนเต็ม").positive("จำนวนเงินต้องมากกว่า 0");

export function formDataToObject(formData: FormData) {
  return Object.fromEntries(formData.entries());
}
