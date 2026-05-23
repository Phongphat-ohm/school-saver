"use client";

import { useState } from "react";
import { Bell } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { NotificationList } from "@/features/notifications/components/NotificationList";
import type { NotificationItem } from "@/features/notifications/types";

export function NotificationButton({ invitations, notifications }: { invitations: any[]; notifications: NotificationItem[] }) {
  const [open, setOpen] = useState(false);
  const pendingWorkspaceIds = new Set(invitations.map((invitation) => invitation.workspaceId));
  const visibleNotifications = notifications.filter(
    (notification) => !(notification.type === "INVITATION" && notification.workspace?.id && pendingWorkspaceIds.has(notification.workspace.id) && notification.title.includes("คำเชิญเข้า")),
  );
  const unreadCount = invitations.length + visibleNotifications.filter((notification) => !notification.readAt).length;

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
        <div className="grid max-h-[72vh] gap-3 overflow-y-auto pr-1">
          <div className="rounded-xl bg-blue-50 px-3 py-2">
            <p className="text-sm font-bold text-slate-950">ศูนย์การแจ้งเตือน</p>
            <p className="mt-0.5 text-xs text-slate-500">คำเชิญและการแจ้งเตือนทั้งหมดรวมอยู่ในรายการเดียว</p>
          </div>
          <NotificationList invitations={invitations} notifications={visibleNotifications} />
        </div>
      </Modal>
    </>
  );
}
