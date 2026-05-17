import type { WorkspaceRole } from "@/generated/prisma/client";

export type CreateWorkspaceUserValues = {
  username: string;
  password: string;
  fullName: string;
  email?: string | null;
  role: WorkspaceRole;
};
