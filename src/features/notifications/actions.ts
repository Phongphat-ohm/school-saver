"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { errorResult, successResult } from "@/lib/result";
import { getSession } from "@/lib/session";

export async function getMyNotificationsAction() {
  try {
    const session = await getSession();
    if (!session) return errorResult("กรุณาเข้าสู่ระบบ");

    const notifications = await prisma.notification.findMany({
      where: { userId: session.userId },
      include: {
        workspace: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 30,
    });

    return successResult(notifications);
  } catch {
    return errorResult("ไม่สามารถดึงการแจ้งเตือนได้");
  }
}

export async function markNotificationReadAction(notificationId: string) {
  try {
    const session = await getSession();
    if (!session) return errorResult("กรุณาเข้าสู่ระบบ");

    const notification = await prisma.notification.findFirst({
      where: { id: notificationId, userId: session.userId },
      select: { id: true, readAt: true },
    });
    if (!notification) return errorResult("ไม่พบการแจ้งเตือนนี้");

    const updated = notification.readAt
      ? notification
      : await prisma.notification.update({
          where: { id: notification.id },
          data: { readAt: new Date() },
        });

    revalidatePath("/");
    return successResult(updated, "อ่านการแจ้งเตือนแล้ว");
  } catch {
    return errorResult("ไม่สามารถอัปเดตการแจ้งเตือนได้");
  }
}

export async function markAllNotificationsReadAction() {
  try {
    const session = await getSession();
    if (!session) return errorResult("กรุณาเข้าสู่ระบบ");

    await prisma.notification.updateMany({
      where: { userId: session.userId, readAt: null },
      data: { readAt: new Date() },
    });

    revalidatePath("/");
    return successResult(null, "อ่านการแจ้งเตือนทั้งหมดแล้ว");
  } catch {
    return errorResult("ไม่สามารถอัปเดตการแจ้งเตือนได้");
  }
}

