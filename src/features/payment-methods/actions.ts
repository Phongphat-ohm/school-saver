"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { OWNER_ADMIN, requireWorkspaceRole } from "@/lib/permissions";
import { getCurrentWorkspaceOrThrow } from "@/lib/workspace";
import { errorResult, successResult } from "@/lib/result";
import { paymentMethodSchema } from "@/features/payment-methods/schemas";

export async function getPaymentMethodsAction() {
  try {
    const { workspaceId } = await getCurrentWorkspaceOrThrow();
    const methods = await prisma.paymentMethod.findMany({
      where: { workspaceId, status: "ACTIVE" },
      orderBy: { createdAt: "asc" },
    });
    return successResult(methods);
  } catch {
    return errorResult("ไม่สามารถดึงวิธีชำระเงินได้");
  }
}

export async function createPaymentMethodAction(data: unknown) {
  try {
    const { workspaceId } = await requireWorkspaceRole(OWNER_ADMIN);
    const parsed = paymentMethodSchema.safeParse(data);
    if (!parsed.success) return errorResult("ข้อมูลวิธีชำระเงินไม่ถูกต้อง", parsed.error.flatten().fieldErrors);
    const duplicated = await prisma.paymentMethod.findUnique({
      where: { workspaceId_name: { workspaceId, name: parsed.data.name } },
    });
    if (duplicated) return errorResult("ชื่อวิธีชำระเงินนี้มีอยู่แล้วใน workspace นี้");
    const method = await prisma.paymentMethod.create({ data: { workspaceId, ...parsed.data, status: "ACTIVE" } });
    revalidatePath("/payment-methods");
    return successResult(method, "เพิ่มวิธีชำระเงินสำเร็จ");
  } catch {
    return errorResult("ไม่สามารถเพิ่มวิธีชำระเงินได้");
  }
}

export async function updatePaymentMethodAction(id: string, data: unknown) {
  try {
    const { workspaceId } = await requireWorkspaceRole(OWNER_ADMIN);
    const parsed = paymentMethodSchema.safeParse(data);
    if (!parsed.success) return errorResult("ข้อมูลวิธีชำระเงินไม่ถูกต้อง", parsed.error.flatten().fieldErrors);
    const method = await prisma.paymentMethod.findFirst({ where: { id, workspaceId } });
    if (!method) return errorResult("ไม่พบวิธีชำระเงินใน workspace นี้");
    const duplicated = await prisma.paymentMethod.findFirst({
      where: { workspaceId, name: parsed.data.name, NOT: { id } },
    });
    if (duplicated) return errorResult("ชื่อวิธีชำระเงินนี้มีอยู่แล้วใน workspace นี้");
    const updated = await prisma.paymentMethod.update({ where: { id }, data: parsed.data });
    revalidatePath("/payment-methods");
    return successResult(updated, "แก้ไขวิธีชำระเงินสำเร็จ");
  } catch {
    return errorResult("ไม่สามารถแก้ไขวิธีชำระเงินได้");
  }
}

export async function disablePaymentMethodAction(id: string) {
  try {
    const { workspaceId } = await requireWorkspaceRole(OWNER_ADMIN);
    const method = await prisma.paymentMethod.findFirst({ where: { id, workspaceId } });
    if (!method) return errorResult("ไม่พบวิธีชำระเงินใน workspace นี้");
    const updated = await prisma.paymentMethod.update({ where: { id }, data: { status: "INACTIVE" } });
    revalidatePath("/payment-methods");
    return successResult(updated, "ปิดใช้งานวิธีชำระเงินแล้ว");
  } catch {
    return errorResult("ไม่สามารถปิดใช้งานวิธีชำระเงินได้");
  }
}
