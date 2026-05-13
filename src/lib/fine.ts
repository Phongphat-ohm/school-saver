import type { CollectionRound, MemberRound } from "@/generated/prisma/client";
import { startOfDay } from "@/lib/date";

export type CalculateFineInput = {
  dueDate: Date;
  payDate: Date;
  fineEnabled: boolean;
  fineType: "NONE" | "DAILY" | "WEEKLY" | "FIXED";
  fineAmount: number;
  fineMaxAmount?: number | null;
};

export function calculateFine(input: CalculateFineInput) {
  const dueDate = startOfDay(input.dueDate);
  const payDate = startOfDay(input.payDate);
  if (!input.fineEnabled || input.fineType === "NONE" || payDate <= dueDate) return 0;

  const lateDays = Math.max(0, Math.ceil((payDate.getTime() - dueDate.getTime()) / 86_400_000));
  let fine = 0;
  if (input.fineType === "DAILY") fine = lateDays * input.fineAmount;
  if (input.fineType === "WEEKLY") fine = Math.ceil(lateDays / 7) * input.fineAmount;
  if (input.fineType === "FIXED") fine = input.fineAmount;
  return input.fineMaxAmount ? Math.min(fine, input.fineMaxAmount) : fine;
}

export function calculateCurrentMemberRound(
  memberRound: Pick<MemberRound, "paidAmount" | "targetAmount" | "fineAmount" | "status">,
  round: Pick<CollectionRound, "dueDate" | "fineEnabled" | "fineType" | "fineAmount" | "fineMaxAmount">,
  today: Date,
) {
  const locked = memberRound.status === "PAID" || memberRound.status === "LATE_PAID" || memberRound.status === "WAIVED";
  const lateDays = Math.max(0, Math.ceil((startOfDay(today).getTime() - startOfDay(round.dueDate).getTime()) / 86_400_000));
  const currentFine = locked
    ? memberRound.fineAmount
    : calculateFine({
        dueDate: round.dueDate,
        payDate: today,
        fineEnabled: round.fineEnabled,
        fineType: round.fineType,
        fineAmount: round.fineAmount,
        fineMaxAmount: round.fineMaxAmount,
      });
  const totalRequiredAmount = memberRound.targetAmount + currentFine;
  const outstandingAmount = Math.max(totalRequiredAmount - memberRound.paidAmount, 0);
  let currentStatus = memberRound.status;
  if (!locked) {
    if (outstandingAmount <= 0) currentStatus = lateDays > 0 ? "LATE_PAID" : "PAID";
    else if (lateDays > 0) currentStatus = memberRound.paidAmount > 0 ? "PARTIAL_OVERDUE" : "OVERDUE";
    else currentStatus = memberRound.paidAmount > 0 ? "PARTIAL" : "UNPAID";
  }
  return { currentFine, outstandingAmount, lateDays, currentStatus, totalRequiredAmount };
}
