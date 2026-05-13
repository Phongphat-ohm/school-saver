"use client";

import { useState } from "react";
import { Bell } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { WorkspaceInvitationList } from "@/features/workspace/components/WorkspaceInvitationList";

export function NotificationButton({ invitations }: { invitations: any[] }) {
  const [open, setOpen] = useState(false);
  const unreadCount = invitations.length;

  return (
    <>
      <button
        className="relative grid size-11 place-items-center rounded-2xl text-slate-500 hover:bg-slate-100"
        type="button"
        aria-label="Notifications"
        onClick={() => setOpen(true)}
      >
        <Bell size={18} />
        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 grid min-w-5 place-items-center rounded-full bg-red-500 px-1.5 text-[10px] font-black text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </button>

      <Modal title="การแจ้งเตือน" open={open} onClose={() => setOpen(false)}>
        <div className="grid gap-4">
          <div className="rounded-2xl bg-blue-50 p-4">
            <p className="font-bold text-slate-950">คำเชิญเข้า Workspace</p>
            <p className="mt-1 text-sm text-slate-500">ตรวจสอบคำเชิญที่รอตอบรับจากห้องหรือกลุ่มอื่น</p>
          </div>
          <WorkspaceInvitationList invitations={invitations} />
        </div>
      </Modal>
    </>
  );
}
