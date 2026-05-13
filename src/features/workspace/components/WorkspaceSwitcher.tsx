"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { switchWorkspaceAction } from "@/features/workspace/actions";
import { showError, showLoading, showSuccess, closeLoading } from "@/lib/swal";

export function WorkspaceSwitcher({
  currentWorkspaceId,
  workspaces,
}: {
  currentWorkspaceId?: string;
  workspaces: Array<{ id: string; name: string }>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <select
      className="min-h-11 max-w-44 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700"
      value={currentWorkspaceId ?? ""}
      disabled={pending}
      onChange={(event) => {
        const workspaceId = event.target.value;
        startTransition(async () => {
          showLoading("กำลังสลับ workspace");
          const result = await switchWorkspaceAction(workspaceId);
          closeLoading();
          if (result.success) {
            await showSuccess("สลับ workspace แล้ว");
            router.refresh();
          } else {
            await showError(result.message);
          }
        });
      }}
    >
      {workspaces.map((workspace) => (
        <option key={workspace.id} value={workspace.id}>
          {workspace.name}
        </option>
      ))}
    </select>
  );
}
