import type { WorkspaceRole } from "@/generated/prisma/client";

export type MyWorkspace = {
  id: string;
  name: string;
  description: string | null;
  role: WorkspaceRole;
};
