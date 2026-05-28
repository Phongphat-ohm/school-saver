import "server-only";

import { cache } from "react";
import packageJson from "../../package.json";
import { prisma } from "@/lib/prisma";

export type VersionParts = [number, number, number];

export const packageAppVersion = packageJson.version;

export function parseAppVersion(value: string): VersionParts | null {
  const match = value.trim().match(/^v?(\d+)\.(\d+)\.(\d+)$/);
  if (!match) return null;
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

export function compareAppVersions(a: string, b: string) {
  const left = parseAppVersion(a);
  const right = parseAppVersion(b);
  if (!left || !right) throw new Error("Version must use semantic version format, for example 1.2.3");
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) return left[index] - right[index];
  }
  return 0;
}

export const getCurrentAppVersion = cache(async function getCurrentAppVersion() {
  const latest = await prisma.appVersion.findFirst({
    where: { status: "ACTIVE" },
    orderBy: [{ activatedAt: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      version: true,
      title: true,
      features: true,
      createdAt: true,
      activatedAt: true,
      status: true,
    },
  });
  return latest ?? { id: null, version: packageAppVersion, title: "Initial version", features: "", createdAt: null, activatedAt: null, status: "ACTIVE" as const };
});
