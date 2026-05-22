import "server-only";

import { cache } from "react";
import type { WorkspaceStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

const DEFAULTS = {
  max_members_per_workspace: "500",
  maintenance_mode: "false",
  otp_rate_limit_seconds: "60",
  default_workspace_status: "ACTIVE",
} as const;

function parseBoolean(value: string | undefined, fallback: boolean) {
  if (!value) return fallback;
  return ["1", "true", "yes", "on", "enabled"].includes(value.trim().toLowerCase());
}

function parseInteger(value: string | undefined, fallback: number, options: { min?: number; max?: number } = {}) {
  const parsed = Number.parseInt(value ?? "", 10);
  const number = Number.isFinite(parsed) ? parsed : fallback;
  return Math.min(options.max ?? number, Math.max(options.min ?? number, number));
}

export const getPlatformSetting = cache(async function getPlatformSetting(key: string) {
  const setting = await prisma.platformSetting.findUnique({
    where: { key },
    select: { value: true },
  });
  return setting?.value;
});

export async function isMaintenanceModeEnabled() {
  return parseBoolean(await getPlatformSetting("maintenance_mode"), parseBoolean(DEFAULTS.maintenance_mode, false));
}

export async function getOtpRateLimitSeconds() {
  return parseInteger(await getPlatformSetting("otp_rate_limit_seconds"), Number(DEFAULTS.otp_rate_limit_seconds), {
    min: 0,
    max: 3600,
  });
}

export async function getDefaultWorkspaceStatus(): Promise<WorkspaceStatus> {
  const value = (await getPlatformSetting("default_workspace_status")) ?? DEFAULTS.default_workspace_status;
  return value === "INACTIVE" ? "INACTIVE" : "ACTIVE";
}

export async function getPlatformMemberLimit() {
  return parseInteger(await getPlatformSetting("max_members_per_workspace"), Number(DEFAULTS.max_members_per_workspace), {
    min: 1,
    max: 1_000_000,
  });
}

export async function getWorkspaceLimit(workspaceId: string, key: string, fallback: number) {
  const limit = await prisma.workspaceLimit.findUnique({
    where: { workspaceId_key: { workspaceId, key } },
    select: { value: true },
  });
  return Math.max(0, limit?.value ?? fallback);
}

export async function getWorkspaceMemberLimit(workspaceId: string) {
  return getWorkspaceLimit(workspaceId, "max_members", await getPlatformMemberLimit());
}

export async function getWorkspaceFeatureFlag(workspaceId: string, key: string, fallback = false) {
  const flag = await prisma.workspaceFeatureFlag.findUnique({
    where: { workspaceId_key: { workspaceId, key } },
    select: { enabled: true },
  });
  return flag?.enabled ?? fallback;
}
