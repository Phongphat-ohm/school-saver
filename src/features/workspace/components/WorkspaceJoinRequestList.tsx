"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Inbox, MessageSquareText, ShieldCheck, UserRoundPlus } from "lucide-react";
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
    return (
      <div className="grid place-items-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
        <Inbox className="text-slate-300" size={30} />
        <p className="mt-3 text-sm font-semibold text-slate-700">ยังไม่มีคำขอเข้า workspace</p>
        <p className="mt-1 max-w-sm text-xs leading-5 text-slate-500">เมื่อมีผู้ใช้สแกน QR หรือกดขอเข้า workspace คำขอจะแสดงที่นี่</p>
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {requests.map((request) => (
        <div key={request.id} className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex min-w-0 items-start gap-3">
            <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-amber-100 text-amber-700">
              <UserRoundPlus size={20} />
            </div>
            <div className="min-w-0">
              <p className="truncate font-semibold text-slate-950">{request.invitedUser.fullName}</p>
              <p className="text-sm text-slate-500">{request.invitedUser.username}</p>
              {request.message ? (
                <p className="mt-2 inline-flex max-w-full items-start gap-2 rounded-xl bg-slate-50 px-3 py-2 text-sm leading-5 text-slate-600">
                  <MessageSquareText className="mt-0.5 shrink-0 text-slate-400" size={15} />
                  <span className="min-w-0 break-words">{request.message}</span>
                </p>
              ) : null}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-[minmax(0,220px)_auto] sm:items-end sm:justify-end">
            <Select
              label="Role หลังอนุมัติ"
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
              <ShieldCheck size={16} />
              อนุมัติ
              <Check size={15} />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
