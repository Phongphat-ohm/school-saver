import { redirect } from "next/navigation";
import { cache } from "react";
import { hasAcceptedCurrentLegal } from "@/constants/legal";
import { isMaintenanceModeEnabled } from "@/lib/platform-settings";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { getCurrentWorkspaceOrThrow } from "@/lib/workspace";

export const getCurrentUser = cache(async function getCurrentUser() {
  const session = await getSession();
  if (!session) return null;
  const user = await prisma.user.findFirst({
    where: { id: session.userId, status: "ACTIVE" },
    select: {
      id: true,
      username: true,
      email: true,
      emailVerifiedAt: true,
      fullName: true,
      role: true,
      status: true,
      termsAcceptedAt: true,
      termsVersion: true,
      privacyAcceptedAt: true,
      privacyVersion: true,
    },
  });
  if (!user) return null;
  return user;
});

export async function requireUser(options: { requireLegal?: boolean } = {}) {
  const requireLegal = options.requireLegal ?? true;
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "SUPER_ADMIN" && await isMaintenanceModeEnabled()) redirect("/login?maintenance=1");
  if (requireLegal && !hasAcceptedCurrentLegal(user)) redirect("/legal/consent");
  return user;
}

export async function requireWorkspace() {
  try {
    return await getCurrentWorkspaceOrThrow();
  } catch {
    redirect("/login");
  }
}
