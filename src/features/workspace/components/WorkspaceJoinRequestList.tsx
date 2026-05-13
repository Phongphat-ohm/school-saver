"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { roleOptions } from "@/constants/roles";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { approveJoinRequestAction } from "@/features/workspace/actions";
import { closeLoading, showError, showLoading, showSuccess } from "@/lib/swal";

export function WorkspaceJoinRequestList({ requests }: { requests: any[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [roles, setRoles] = useState<Record<string, string>>({});
  const visibleRoleOptions = roleOptions.filter((option) => option.value !== "OWNER");

  if (requests.length === 0) {
    return <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">ยังไม่มีคำขอเข้า workspace</p>;
  }

  return (
    <div className="grid gap-3">
      {requests.map((request) => (
        <div key={request.id} className="grid gap-3 rounded-2xl bg-slate-50 p-4 md:grid-cols-[1fr_180px_auto] md:items-end">
          <div>
            <p className="font-semibold text-slate-950">{request.invitedUser.fullName}</p>
            <p className="text-sm text-slate-500">{request.invitedUser.username}</p>
            {request.message ? <p className="mt-1 text-sm text-slate-600">{request.message}</p> : null}
          </div>
          <Select
            label="Role"
            value={roles[request.id] ?? "VIEWER"}
            onChange={(event) => setRoles((prev) => ({ ...prev, [request.id]: event.target.value }))}
            options={visibleRoleOptions}
          />
          <Button
            type="button"
            disabled={pending}
            className="gap-2"
            onClick={() => {
              startTransition(async () => {
                showLoading("กำลังอนุมัติคำขอ");
                const result = await approveJoinRequestAction({ invitationId: request.id, role: roles[request.id] ?? "VIEWER" });
                closeLoading();
                if (result.success) {
                  await showSuccess(result.message ?? "อนุมัติแล้ว");
                  router.refresh();
                } else await showError(result.message);
              });
            }}
          >
            <Check size={16} />อนุมัติ
          </Button>
        </div>
      ))}
    </div>
  );
}
