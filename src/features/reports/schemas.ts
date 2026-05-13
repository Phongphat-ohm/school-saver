import { z } from "zod";

export const dailyReportSchema = z.object({ date: z.coerce.date() });
export const reportIdSchema = z.object({ id: z.string().min(1) });
