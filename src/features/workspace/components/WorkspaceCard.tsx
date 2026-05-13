"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { BriefcaseBusiness, CheckCircle2, MousePointerClick } from "lucide-react";
import { roleLabels } from "@/constants/roles";
import { switchWorkspaceAction } from "@/features/workspace/actions";
import { Button } from "@/components/ui/Button";
import { showError, showLoading, showSuccess, closeLoading } from "@/lib/swal";

export function WorkspaceCard({
  workspace,
  currentWorkspaceId,
}: {
  workspace: { id: string; name: string; description: string | null; role: keyof typeof roleLabels };
  currentWorkspaceId?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const active = workspace.id === currentWorkspaceId;

  return (
    <div className={active ? "rounded-[1.5rem] bg-blue-600 p-4 text-white shadow-sm" : "rounded-[1.5rem] bg-white p-4 shadow-sm"}>
      <div className="flex items-start gap-3">
        <div className={active ? "grid size-11 place-items-center rounded-2xl bg-white/20" : "grid size-11 place-items-center rounded-2xl bg-blue-50 text-blue-700"}>
          <BriefcaseBusiness size={21} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate font-bold">{workspace.name}</p>
            {active ? <CheckCircle2 size={17} /> : null}
          </div>
          <p className={active ? "mt-1 text-sm text-blue-100" : "mt-1 text-sm text-slate-500"}>{workspace.description ?? "ไม่มีรายละเอียด"}</p>
          <p className={active ? "mt-2 text-xs font-semibold text-blue-100" : "mt-2 text-xs font-semibold text-blue-700"}>{roleLabels[workspace.role]}</p>
        </div>
      </div>
      <Button
        type="button"
        variant={active ? "secondary" : "primary"}
        disabled={active || pending}
        className="mt-4 w-full gap-2"
        onClick={() => {
          startTransition(async () => {
            showLoading("กำลังสลับ workspace");
            const result = await switchWorkspaceAction(workspace.id);
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
        <MousePointerClick size={17} />
        {active ? "ใช้งานอยู่" : "สลับมาใช้"}
      </Button>
    </div>
  );
}
