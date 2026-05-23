import { z } from "zod";

export const collectionRoundSchema = z
  .object({
    title: z.string().trim().min(1, "กรุณากรอกชื่อรอบ"),
    description: z.string().optional(),
    targetAmount: z.coerce.number().int().positive("ยอดเป้าหมายต้องมากกว่า 0"),
    startDate: z.coerce.date(),
    dueDate: z.coerce.date(),
    fineEnabled: z.coerce.boolean().default(false),
    fineType: z.enum(["NONE", "DAILY", "WEEKLY", "FIXED"]).default("NONE"),
    fineAmount: z.coerce.number().int().min(0).default(0),
    fineMaxAmount: z.coerce.number().int().min(0).optional().nullable(),
    includedMemberIds: z.array(z.string().min(1)).optional(),
    waivedMemberIds: z.array(z.string().min(1)).optional(),
  })
  .refine((data) => data.dueDate >= data.startDate, {
    message: "วันที่ครบกำหนดต้องมากกว่าหรือเท่ากับวันที่เริ่มเก็บ",
    path: ["dueDate"],
  });
