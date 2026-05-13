"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, X } from "lucide-react";
import { roleLabels } from "@/constants/roles";
import { Button } from "@/components/ui/Button";
import { acceptWorkspaceInvitationAction, declineWorkspaceInvitationAction } from "@/features/workspace/actions";
import { closeLoading, showConfirm, showError, showLoading, showSuccess } from "@/lib/swal";

export function WorkspaceInvitationList({ invitations }: { invitations: any[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (invitations.length === 0) {
    return <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">ยังไม่มีคำเชิญเข้า workspace</p>;
  }

  return (
    <div className="grid gap-3">
      {invitations.map((invitation) => (
        <div key={invitation.id} className="rounded-2xl bg-slate-50 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-semibold text-slate-950">{invitation.workspace.name}</p>
              <p className="mt-1 text-sm text-slate-500">
                เชิญโดย {invitation.invitedBy.fullName} • role {roleLabels[invitation.role as keyof typeof roleLabels]}
              </p>
              {invitation.message ? <p className="mt-2 text-sm text-slate-600">{invitation.message}</p> : null}
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                className="gap-2"
                disabled={pending}
                onClick={() => {
                  startTransition(async () => {
                    showLoading("กำลังตอบรับคำเชิญ");
                    const result = await acceptWorkspaceInvitationAction(invitation.id);
                    closeLoading();
                    if (result.success) {
                      await showSuccess(result.message ?? "ตอบรับแล้ว");
                      router.refresh();
                    } else await showError(result.message);
                  });
                }}
              >
                <Check size={16} />ตอบรับ
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="gap-2"
                disabled={pending}
                onClick={() => {
                  startTransition(async () => {
                    if (!(await showConfirm("ปฏิเสธคำเชิญ", "ต้องการปฏิเสธคำเชิญนี้หรือไม่?"))) return;
                    showLoading();
                    const result = await declineWorkspaceInvitationAction(invitation.id);
                    closeLoading();
                    if (result.success) {
                      await showSuccess(result.message ?? "ปฏิเสธแล้ว");
                      router.refresh();
                    } else await showError(result.message);
                  });
                }}
              >
                <X size={16} />ปฏิเสธ
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function SentWorkspaceInvitationList({ invitations }: { invitations: any[] }) {
  if (invitations.length === 0) {
    return <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">ยังไม่มีคำเชิญที่รอตอบรับ</p>;
  }

  return (
    <div className="grid gap-2">
      {invitations.map((invitation) => (
        <div key={invitation.id} className="rounded-2xl bg-slate-50 p-3 text-sm">
          <p className="font-semibold text-slate-950">{invitation.invitedUser.fullName}</p>
          <p className="text-slate-500">
            {invitation.invitedUser.username} • role {roleLabels[invitation.role as keyof typeof roleLabels]} • รอตอบรับ
          </p>
        </div>
      ))}
    </div>
  );
}
