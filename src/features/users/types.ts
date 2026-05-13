import type { WorkspaceRole } from "@/generated/prisma/client";

export type CreateWorkspaceUserValues = {
  username: string;
  password: string;
  fullName: string;
  role: WorkspaceRole;
};
