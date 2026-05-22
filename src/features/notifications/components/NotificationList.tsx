"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, ExternalLink, Inbox } from "lucide-react";
import { useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { markAllNotificationsReadAction, markNotificationReadAction } from "@/features/notifications/actions";
import type { NotificationItem } from "@/features/notifications/types";
import { showError } from "@/lib/swal";

export function NotificationList({ notifications }: { notifications: NotificationItem[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const unreadCount = notifications.filter((notification) => !notification.readAt).length;

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

  if (notifications.length === 0) {
    return (
      <div className="grid place-items-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center">
        <Inbox className="mb-3 text-slate-300" size={32} />
        <p className="font-semibold text-slate-700">ยังไม่มีการแจ้งเตือน</p>
        <p className="mt-1 text-sm text-slate-500">รายการใหม่จะแสดงรวมกับคำเชิญในปุ่มกระดิ่งนี้</p>
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-slate-700">แจ้งเตือนทั่วไป</p>
        {unreadCount > 0 ? (
          <Button className="min-h-9 rounded-xl px-3 py-1 text-xs" disabled={pending} type="button" variant="secondary" onClick={markAll}>
            อ่านทั้งหมด
          </Button>
        ) : null}
      </div>

      <div className="grid max-h-[24rem] gap-2 overflow-y-auto pr-1">
        {notifications.map((notification) => {
          const isUnread = !notification.readAt;
          const content = (
            <div className="min-w-0">
              <div className="flex items-start gap-2">
                <p className="min-w-0 flex-1 truncate font-semibold text-slate-950">{notification.title}</p>
                {notification.linkUrl ? <ExternalLink className="mt-0.5 shrink-0 text-slate-400" size={15} /> : null}
              </div>
              {notification.message ? <p className="mt-1 line-clamp-2 text-sm leading-5 text-slate-500">{notification.message}</p> : null}
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                {notification.workspace?.name ? <span>{notification.workspace.name}</span> : null}
                <span>{new Date(notification.createdAt).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" })}</span>
              </div>
            </div>
          );

          return (
            <div
              className={`flex items-start gap-3 rounded-2xl border p-3 ${
                isUnread ? "border-blue-100 bg-blue-50/70" : "border-slate-200 bg-white"
              }`}
              key={notification.id}
            >
              <span className={`mt-2 size-2 shrink-0 rounded-full ${isUnread ? "bg-blue-500" : "bg-slate-200"}`} />
              {notification.linkUrl ? (
                <Link className="min-w-0 flex-1" href={notification.linkUrl} onClick={() => markOne(notification.id)}>
                  {content}
                </Link>
              ) : (
                <div className="min-w-0 flex-1">{content}</div>
              )}
              {isUnread ? (
                <button
                  aria-label="ทำเครื่องหมายว่าอ่านแล้ว"
                  className="grid size-9 shrink-0 place-items-center rounded-xl text-slate-500 hover:bg-white"
                  disabled={pending}
                  type="button"
                  onClick={() => markOne(notification.id)}
                >
                  <Check size={17} />
                </button>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
