"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Clock3, Inbox, Mail, Send, UserRound, X } from "lucide-react";
import { roleLabels } from "@/constants/roles";
import { Button } from "@/components/ui/Button";
import { acceptWorkspaceInvitationAction, declineWorkspaceInvitationAction } from "@/features/workspace/actions";
import { closeLoading, showConfirm, showError, showLoading, showSuccess } from "@/lib/swal";

function RoleBadge({ role }: { role: string }) {
  return <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">{roleLabels[role as keyof typeof roleLabels] ?? role}</span>;
}

export function WorkspaceInvitationList({ invitations }: { invitations: any[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (invitations.length === 0) {
    return (
      <div className="grid place-items-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
        <Inbox className="text-slate-300" size={30} />
        <p className="mt-3 text-sm font-semibold text-slate-700">ยังไม่มีคำเชิญเข้า workspace</p>
        <p className="mt-1 max-w-sm text-xs leading-5 text-slate-500">คำเชิญที่ผู้อื่นส่งมาให้คุณจะปรากฏในส่วนนี้</p>
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {invitations.map((invitation) => (
        <div key={invitation.id} className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex min-w-0 items-start gap-3">
            <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-blue-100 text-blue-700">
              <Mail size={19} />
            </div>
            <div className="min-w-0">
              <p className="truncate font-semibold text-slate-950">{invitation.workspace.name}</p>
              <p className="mt-1 text-sm text-slate-500">เชิญโดย {invitation.invitedBy.fullName}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <RoleBadge role={invitation.role} />
                <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">รอตอบรับ</span>
              </div>
              {invitation.message ? <p className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-sm leading-5 text-slate-600">{invitation.message}</p> : null}
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
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
              <Check size={16} />
              ตอบรับ
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="gap-2"
              disabled={pending}
              onClick={() => {
                startTransition(async () => {
                  if (!(await showConfirm("ปฏิเสธคำเชิญ", "ต้องการปฏิเสธคำเชิญนี้หรือไม่?"))) return;
                  showLoading("กำลังปฏิเสธคำเชิญ");
                  const result = await declineWorkspaceInvitationAction(invitation.id);
                  closeLoading();
                  if (result.success) {
                    await showSuccess(result.message ?? "ปฏิเสธแล้ว");
                    router.refresh();
                  } else await showError(result.message);
                });
              }}
            >
              <X size={16} />
              ปฏิเสธ
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

export function SentWorkspaceInvitationList({ invitations }: { invitations: any[] }) {
  if (invitations.length === 0) {
    return (
      <div className="grid place-items-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
        <Send className="text-slate-300" size={30} />
        <p className="mt-3 text-sm font-semibold text-slate-700">ยังไม่มีคำเชิญที่รอตอบรับ</p>
        <p className="mt-1 max-w-sm text-xs leading-5 text-slate-500">เมื่อส่งคำเชิญแล้ว รายการที่ยังไม่ถูกตอบรับจะแสดงที่นี่</p>
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {invitations.map((invitation) => (
        <div key={invitation.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid size-10 shrink-0 place-items-center rounded-2xl bg-slate-100 text-slate-600">
              <UserRound size={18} />
            </div>
            <div className="min-w-0">
              <p className="truncate font-semibold text-slate-950">{invitation.invitedUser.fullName}</p>
              <p className="truncate text-sm text-slate-500">{invitation.invitedUser.username}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <RoleBadge role={invitation.role} />
            <span className="inline-flex min-h-8 items-center gap-2 rounded-full bg-amber-100 px-3 text-xs font-bold text-amber-700">
              <Clock3 size={14} />
              รอตอบรับ
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
