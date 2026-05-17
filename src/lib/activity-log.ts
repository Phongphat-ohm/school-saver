import { prisma } from "@/lib/prisma";

type ActivityLogInput = {
  workspaceId: string;
  userId: string;
  action: string;
  detail?: string | null;
};

type ActivityLogWriter = {
  activityLog: {
    create(args: { data: ActivityLogInput }): Promise<unknown>;
  };
};

export async function logActivity(input: ActivityLogInput) {
  await writeActivityLog(prisma, input);
}

export async function writeActivityLog(client: ActivityLogWriter, input: ActivityLogInput) {
  await client.activityLog.create({
    data: {
      workspaceId: input.workspaceId,
      userId: input.userId,
      action: input.action,
      detail: input.detail,
    },
  });
}
