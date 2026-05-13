import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { getCurrentWorkspaceOrThrow } from "@/lib/workspace";

export async function getCurrentUser() {
  const session = await getSession();
  if (!session) return null;
  return prisma.user.findFirst({
    where: { id: session.userId, status: "ACTIVE" },
    select: { id: true, username: true, fullName: true, status: true },
  });
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireWorkspace() {
  try {
    return await getCurrentWorkspaceOrThrow();
  } catch {
    redirect("/login");
  }
}
