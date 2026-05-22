import { prisma } from "@/lib/prisma";

type ProcessDueScheduledAnnouncementsOptions = {
  actorUserId?: string;
  limit?: number;
};

export async function processDueScheduledAnnouncements({ actorUserId, limit = 20 }: ProcessDueScheduledAnnouncementsOptions = {}) {
  const now = new Date();
  const dueItems = await prisma.scheduledAnnouncement.findMany({
    where: { status: "SCHEDULED", scheduledAt: { lte: now } },
    orderBy: { scheduledAt: "asc" },
    take: limit,
  });

  let sentCount = 0;
  let notificationCount = 0;
  const processedIds: string[] = [];

  for (const item of dueItems) {
    const result = await prisma.$transaction(async (tx) => {
      const claimed = await tx.scheduledAnnouncement.updateMany({
        where: {
          id: item.id,
          status: "SCHEDULED",
          scheduledAt: { lte: now },
        },
        data: { status: "SENT", sentAt: now },
      });
      if (claimed.count === 0) return { sent: false, notifications: 0 };

      if (item.userIds.length > 0) {
        await tx.notification.createMany({
          data: item.userIds.map((userId) => ({
            userId,
            workspaceId: item.workspaceId,
            type: "SYSTEM" as const,
            title: item.title,
            message: item.message,
            linkUrl: "/dashboard",
          })),
        });
      }

      await tx.activityLog.create({
        data: {
          workspaceId: item.workspaceId,
          userId: actorUserId,
          action: actorUserId ? "SUPER_ADMIN_SEND_SCHEDULED_ANNOUNCEMENT" : "CRON_SEND_SCHEDULED_ANNOUNCEMENT",
          detail: `ส่ง scheduled "${item.title}" ถึง ${item.userIds.length} คน`,
        },
      });

      return { sent: true, notifications: item.userIds.length };
    });

    if (result.sent) {
      sentCount += 1;
      notificationCount += result.notifications;
      processedIds.push(item.id);
    }
  }

  return {
    checked: dueItems.length,
    sentCount,
    notificationCount,
    processedIds,
  };
}
