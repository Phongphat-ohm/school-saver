"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, ExternalLink, Inbox, Mail, Maximize2, Trash2, X } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { roleLabels } from "@/constants/roles";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { deleteReadNotificationsAction, markAllNotificationsReadAction, markNotificationReadAction } from "@/features/notifications/actions";
import type { NotificationItem } from "@/features/notifications/types";
import { acceptWorkspaceInvitationAction, declineWorkspaceInvitationAction } from "@/features/workspace/actions";
import { renderSafeMarkdown } from "@/lib/markdown";
import { closeLoading, showConfirm, showError, showLoading, showSuccess } from "@/lib/swal";

type InvitationItem = {
  id: string;
  role: string;
  message?: string | null;
  createdAt: Date | string;
  workspaceId: string;
  workspace: { id?: string; name: string };
  invitedBy: { fullName: string; username?: string };
};

type UnifiedItem =
  | { kind: "invitation"; id: string; createdAt: Date | string; invitation: InvitationItem }
  | { kind: "notification"; id: string; createdAt: Date | string; notification: NotificationItem };

function itemTime(value: Date | string) {
  return new Date(value).getTime();
}

function formatTime(value: Date | string) {
  return new Date(value).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" });
}

function isInvitationNotificationDuplicate(notification: NotificationItem, invitations: InvitationItem[]) {
  return (
    notification.type === "INVITATION" &&
    !!notification.workspace?.id &&
    notification.title.includes("คำเชิญเข้า") &&
    invitations.some((invitation) => invitation.workspaceId === notification.workspace?.id)
  );
}

export function NotificationList({ invitations = [], notifications }: { invitations?: InvitationItem[]; notifications: NotificationItem[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState<UnifiedItem | null>(null);
  const visibleNotifications = notifications.filter((notification) => !isInvitationNotificationDuplicate(notification, invitations));
  const unreadCount = visibleNotifications.filter((notification) => !notification.readAt).length;
  const readCount = visibleNotifications.filter((notification) => notification.readAt).length;
  const items = useMemo<UnifiedItem[]>(
    () =>
      [
        ...invitations.map((invitation) => ({ kind: "invitation" as const, id: `invitation-${invitation.id}`, createdAt: invitation.createdAt, invitation })),
        ...visibleNotifications.map((notification) => ({ kind: "notification" as const, id: `notification-${notification.id}`, createdAt: notification.createdAt, notification })),
      ].sort((a, b) => itemTime(b.createdAt) - itemTime(a.createdAt)),
    [invitations, visibleNotifications],
  );
  const selectedMessage =
    selected?.kind === "notification" ? selected.notification.message : selected?.kind === "invitation" ? selected.invitation.message : "";
  const selectedHtml = useMemo(() => (selectedMessage ? renderSafeMarkdown(selectedMessage) : ""), [selectedMessage]);

  function markOne(notificationId: string) {
    startTransition(async () => {
      const result = await markNotificationReadAction(notificationId);
      if (!result.success) {
        await showError(result.message);
        return;
      }
      router.refresh();
    });
  }

  function markAll() {
    startTransition(async () => {
      const result = await markAllNotificationsReadAction();
      if (!result.success) {
        await showError(result.message);
        return;
      }
      router.refresh();
    });
  }

  function deleteRead() {
    startTransition(async () => {
      if (!(await showConfirm("ลบการแจ้งเตือนที่อ่านแล้ว", "ต้องการลบการแจ้งเตือนที่อ่านแล้วทั้งหมดหรือไม่?"))) return;
      showLoading("กำลังลบการแจ้งเตือน");
      const result = await deleteReadNotificationsAction();
      closeLoading();
      if (!result.success) {
        await showError(result.message);
        return;
      }
      await showSuccess(result.message ?? "ลบการแจ้งเตือนที่อ่านแล้ว");
      setSelected(null);
      router.refresh();
    });
  }

  function acceptInvitation(invitationId: string) {
    startTransition(async () => {
      showLoading("กำลังตอบรับคำเชิญ");
      const result = await acceptWorkspaceInvitationAction(invitationId);
      closeLoading();
      if (result.success) {
        await showSuccess(result.message ?? "ตอบรับแล้ว");
        setSelected(null);
        router.refresh();
      } else await showError(result.message);
    });
  }

  function declineInvitation(invitationId: string) {
    startTransition(async () => {
      if (!(await showConfirm("ปฏิเสธคำเชิญ", "ต้องการปฏิเสธคำเชิญนี้หรือไม่?"))) return;
      showLoading("กำลังปฏิเสธคำเชิญ");
      const result = await declineWorkspaceInvitationAction(invitationId);
      closeLoading();
      if (result.success) {
        await showSuccess(result.message ?? "ปฏิเสธแล้ว");
        setSelected(null);
        router.refresh();
      } else await showError(result.message);
    });
  }

  if (items.length === 0) {
    return (
      <div className="grid place-items-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center">
        <Inbox className="mb-3 text-slate-300" size={32} />
        <p className="font-semibold text-slate-700">ยังไม่มีการแจ้งเตือน</p>
        <p className="mt-1 text-xs text-slate-500">รายการใหม่จะแสดงที่ปุ่มกระดิ่งนี้</p>
      </div>
    );
  }

  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-slate-700">รายการล่าสุด</p>
        <div className="flex flex-wrap justify-end gap-2">
          {readCount > 0 ? (
            <Button className="min-h-8 rounded-xl px-3 py-1 text-xs" disabled={pending} type="button" variant="danger" onClick={deleteRead}>
              <Trash2 className="mr-1" size={13} />
              ลบที่อ่านแล้ว
            </Button>
          ) : null}
          {unreadCount > 0 ? (
            <Button className="min-h-8 rounded-xl px-3 py-1 text-xs" disabled={pending} type="button" variant="secondary" onClick={markAll}>
              อ่านทั้งหมด
            </Button>
          ) : null}
        </div>
      </div>

      <div className="grid max-h-[28rem] gap-2 overflow-y-auto pr-1">
        {items.map((item) => {
          if (item.kind === "invitation") {
            const invitation = item.invitation;
            return (
              <div key={item.id} className="flex items-start gap-3 rounded-xl border border-amber-100 bg-amber-50/60 p-3">
                <span className="mt-2 grid size-7 shrink-0 place-items-center rounded-lg bg-white text-amber-600">
                  <Mail size={15} />
                </span>
                <button className="min-w-0 flex-1 text-left" type="button" onClick={() => setSelected(item)}>
                  <p className="truncate text-sm font-semibold text-slate-950">คำเชิญเข้า {invitation.workspace.name}</p>
                  <p className="mt-0.5 truncate text-xs text-slate-500">
                    โดย {invitation.invitedBy.fullName} · {roleLabels[invitation.role as keyof typeof roleLabels] ?? invitation.role}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">{formatTime(invitation.createdAt)}</p>
                </button>
                <div className="flex shrink-0 gap-1">
                  <button className="grid size-8 place-items-center rounded-lg bg-white text-emerald-600 hover:bg-emerald-50" disabled={pending} type="button" onClick={() => acceptInvitation(invitation.id)} aria-label="ตอบรับคำเชิญ">
                    <Check size={16} />
                  </button>
                  <button className="grid size-8 place-items-center rounded-lg bg-white text-slate-500 hover:bg-slate-100" disabled={pending} type="button" onClick={() => declineInvitation(invitation.id)} aria-label="ปฏิเสธคำเชิญ">
                    <X size={16} />
                  </button>
                  <button className="grid size-8 place-items-center rounded-lg bg-white text-slate-500 hover:bg-slate-100" type="button" onClick={() => setSelected(item)} aria-label="ดูรายละเอียดคำเชิญ">
                    <Maximize2 size={15} />
                  </button>
                </div>
              </div>
            );
          }

          const notification = item.notification;
          const isUnread = !notification.readAt;
          const notificationHref = getNotificationHref(notification);
          const content = (
            <div className="min-w-0">
              <div className="flex items-start gap-2">
                <p className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-950">{notification.title}</p>
                {notificationHref ? <ExternalLink className="mt-0.5 shrink-0 text-slate-400" size={14} /> : null}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                {notification.workspace?.name ? <span className="truncate">{notification.workspace.name}</span> : null}
                <span>{formatTime(notification.createdAt)}</span>
              </div>
            </div>
          );

          return (
            <div className={`flex items-start gap-3 rounded-xl border p-3 ${isUnread ? "border-blue-100 bg-blue-50/70" : "border-slate-200 bg-white"}`} key={item.id}>
              <span className={`mt-2 size-2 shrink-0 rounded-full ${isUnread ? "bg-blue-500" : "bg-slate-200"}`} />
              {notificationHref ? (
                <Link className="min-w-0 flex-1" href={notificationHref} onClick={() => markOne(notification.id)}>
                  {content}
                </Link>
              ) : (
                <button className="min-w-0 flex-1 text-left" type="button" onClick={() => setSelected(item)}>
                  {content}
                </button>
              )}
              {isUnread ? (
                <button aria-label="ทำเครื่องหมายว่าอ่านแล้ว" className="grid size-8 shrink-0 place-items-center rounded-lg text-slate-500 hover:bg-white" disabled={pending} type="button" onClick={() => markOne(notification.id)}>
                  <Check size={16} />
                </button>
              ) : null}
              <button
                aria-label="ดูรายละเอียดการแจ้งเตือน"
                className="grid size-8 shrink-0 place-items-center rounded-lg text-slate-500 hover:bg-slate-50"
                type="button"
                onClick={() => {
                  setSelected(item);
                  if (isUnread) markOne(notification.id);
                }}
              >
                <Maximize2 size={15} />
              </button>
            </div>
          );
        })}
      </div>

      <Modal
        title={selected?.kind === "invitation" ? `คำเชิญเข้า ${selected.invitation.workspace.name}` : selected?.notification.title ?? "Notification"}
        open={!!selected}
        onClose={() => setSelected(null)}
        size="screen"
      >
        {selected ? (
          <div className="flex h-full min-h-0 flex-col gap-4">
            {selected.kind === "invitation" ? (
              <div className="grid shrink-0 gap-3 rounded-lg border border-amber-100 bg-amber-50 p-4 text-sm text-slate-700">
                <p>
                  <span className="font-semibold">เชิญโดย:</span> {selected.invitation.invitedBy.fullName}
                </p>
                <p>
                  <span className="font-semibold">สิทธิ์:</span> {roleLabels[selected.invitation.role as keyof typeof roleLabels] ?? selected.invitation.role}
                </p>
                <p className="text-xs text-slate-500">{formatTime(selected.invitation.createdAt)}</p>
                <Link
                  className="inline-flex min-h-10 w-fit items-center gap-2 rounded-lg bg-amber-600 px-4 text-sm font-bold text-white hover:bg-amber-700"
                  href={getInvitationJoinHref(selected.invitation.workspaceId)}
                >
                  เปิดหน้าเข้าร่วม workspace
                  <ExternalLink size={16} />
                </Link>
              </div>
            ) : null}
            <div
              className="markdown-body min-h-0 flex-1 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-5 text-sm leading-7 text-slate-700"
              dangerouslySetInnerHTML={{ __html: selectedHtml || "<p>ไม่มีรายละเอียดเพิ่มเติม</p>" }}
            />
            <div className="flex shrink-0 flex-wrap items-center gap-2 text-xs text-slate-400">
              {selected.kind === "notification" && selected.notification.workspace?.name ? <span>{selected.notification.workspace.name}</span> : null}
              <span>{formatTime(selected.createdAt)}</span>
            </div>
            {selected.kind === "invitation" ? (
              <div className="grid shrink-0 gap-2 sm:grid-cols-2">
                <Button type="button" className="gap-2" disabled={pending} onClick={() => acceptInvitation(selected.invitation.id)}>
                  <Check size={16} />
                  ตอบรับ
                </Button>
                <Button type="button" variant="secondary" className="gap-2" disabled={pending} onClick={() => declineInvitation(selected.invitation.id)}>
                  <X size={16} />
                  ปฏิเสธ
                </Button>
              </div>
            ) : getNotificationHref(selected.notification) ? (
              <Link className="inline-flex min-h-10 w-fit items-center gap-2 rounded-lg bg-blue-700 px-4 text-sm font-bold text-white" href={getNotificationHref(selected.notification) ?? "#"}>
                เปิดหน้าที่เกี่ยวข้อง
                <ExternalLink size={16} />
              </Link>
            ) : null}
          </div>
        ) : null}
      </Modal>
    </div>
  );
}

function getInvitationJoinHref(workspaceId: string) {
  return `/workspaces/join/${encodeURIComponent(workspaceId)}`;
}

function getNotificationHref(notification: NotificationItem) {
  if (notification.type === "INVITATION" && notification.workspace?.id) {
    return getInvitationJoinHref(notification.workspace.id);
  }
  return notification.linkUrl ?? null;
}
