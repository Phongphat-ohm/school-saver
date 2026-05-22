import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getActiveSupportSessionForWorkspace } from "@/lib/support-access";

const DEFAULT_FAILURE_WINDOW_MINUTES = 15;
const DEFAULT_FAILURE_BLOCK_MAX = 10;

export const activityLogOutcomes = ["SUCCESS", "FAILURE", "BLOCKED"] as const;
export type ActivityLogOutcome = (typeof activityLogOutcomes)[number];

type ActivityLogInput = {
  workspaceId?: string | null;
  userId?: string | null;
  action: string;
  detail?: string | null;
  outcome?: ActivityLogOutcome;
  ipAddress?: string | null;
  userAgent?: string | null;
  method?: string | null;
  path?: string | null;
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
  const metadata = await getRequestActivityMetadata();
  const supportSession = input.workspaceId ? await getActiveSupportSessionForWorkspace(input.workspaceId) : null;
  const detail = supportSession
    ? `[SUPPORT:${supportSession.id}:${supportSession.mode}] ${input.detail ?? ""}`.trim()
    : input.detail;
  await client.activityLog.create({
    data: {
      workspaceId: input.workspaceId ?? null,
      userId: input.userId ?? null,
      action: input.action,
      detail,
      outcome: input.outcome ?? "SUCCESS",
      ipAddress: input.ipAddress ?? metadata.ipAddress,
      userAgent: input.userAgent ?? metadata.userAgent,
      method: input.method ?? metadata.method,
      path: input.path ?? metadata.path,
    },
  });
}

export async function logSecurityFailure(input: Omit<ActivityLogInput, "outcome">) {
  await logActivity({ ...input, outcome: "FAILURE" });
}

export async function isRequestIpBlocked() {
  const metadata = await getRequestActivityMetadata();
  if (!metadata.ipAddress) return false;

  const failureWindowMinutes = getPositiveInteger(process.env.ACTIVITY_LOG_FAILURE_WINDOW_MINUTES, DEFAULT_FAILURE_WINDOW_MINUTES);
  const maxFailures = getPositiveInteger(process.env.ACTIVITY_LOG_FAILURE_BLOCK_MAX, DEFAULT_FAILURE_BLOCK_MAX);
  const since = new Date(Date.now() - failureWindowMinutes * 60 * 1000);

  const failureCount = await prisma.activityLog.count({
    where: {
      ipAddress: metadata.ipAddress,
      outcome: "FAILURE",
      createdAt: { gte: since },
    },
  });

  if (failureCount < maxFailures) return false;

  await logActivity({
    action: "SECURITY_BLOCKED_IP",
    detail: `Blocked after ${failureCount} failed actions in ${failureWindowMinutes} minutes`,
    outcome: "BLOCKED",
    ipAddress: metadata.ipAddress,
    userAgent: metadata.userAgent,
    method: metadata.method,
    path: metadata.path,
  });
  return true;
}

async function getRequestActivityMetadata() {
  try {
    const headerStore = await headers();
    return {
      ipAddress: getClientIp(headerStore),
      userAgent: truncate(headerStore.get("user-agent"), 512),
      method: truncate(headerStore.get("x-forwarded-method") ?? headerStore.get("x-method"), 16),
      path: truncate(headerStore.get("next-url") ?? headerStore.get("x-invoke-path") ?? headerStore.get("referer"), 512),
    };
  } catch {
    return {
      ipAddress: null,
      userAgent: null,
      method: null,
      path: null,
    };
  }
}

function getClientIp(headerStore: Headers) {
  const forwardedFor = headerStore.get("x-forwarded-for")?.split(",")[0]?.trim();
  return truncate(forwardedFor ?? headerStore.get("x-real-ip") ?? headerStore.get("cf-connecting-ip"), 64);
}

function getPositiveInteger(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function truncate(value: string | null | undefined, maxLength: number) {
  if (!value) return null;
  return value.length > maxLength ? value.slice(0, maxLength) : value;
}
