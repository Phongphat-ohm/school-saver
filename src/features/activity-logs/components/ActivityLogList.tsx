import { Activity, BadgeCheck, CreditCard, FileClock, Settings, UsersRound } from "lucide-react";

const actionLabels: Record<string, string> = {
  CREATE_WORKSPACE: "สร้าง workspace",
  UPDATE_WORKSPACE: "แก้ไข workspace",
  SWITCH_WORKSPACE: "สลับ workspace",
  INVITE_WORKSPACE_USER: "เชิญผู้ใช้",
  REQUEST_JOIN_WORKSPACE: "ขอเข้า workspace",
  APPROVE_JOIN_REQUEST: "อนุมัติคำขอเข้า workspace",
  ACCEPT_WORKSPACE_INVITATION: "ตอบรับคำเชิญ",
  DECLINE_WORKSPACE_INVITATION: "ปฏิเสธคำเชิญ",
  UPDATE_WORKSPACE_MEMBER_ROLE: "เปลี่ยนสิทธิ์ผู้ใช้",
  REMOVE_WORKSPACE_MEMBER: "นำผู้ใช้ออกจาก workspace",
  CREATE_USER: "สร้างผู้ใช้",
  DISABLE_USER: "ปิดใช้งานผู้ใช้",
  DELETE_USER: "ลบผู้ใช้ออกจาก workspace",
  UPDATE_PROFILE: "แก้ไขโปรไฟล์",
  CHANGE_PASSWORD: "เปลี่ยนรหัสผ่าน",
  VERIFY_EMAIL: "ยืนยันอีเมล",
  CREATE_MEMBER: "เพิ่มสมาชิก",
  UPDATE_MEMBER: "แก้ไขสมาชิก",
  DISABLE_MEMBER: "ปิดใช้งานสมาชิก",
  IMPORT_MEMBERS: "นำเข้าสมาชิก",
  CREATE_PAYMENT_METHOD: "เพิ่มวิธีชำระเงิน",
  UPDATE_PAYMENT_METHOD: "แก้ไขวิธีชำระเงิน",
  DISABLE_PAYMENT_METHOD: "ปิดใช้งานวิธีชำระเงิน",
  CREATE_ROUND: "สร้างรอบเก็บเงิน",
  UPDATE_ROUND: "แก้ไขรอบเก็บเงิน",
  CLOSE_ROUND: "ปิดรอบ",
  OPEN_ROUND: "เปิดรอบ",
  CANCEL_ROUND: "ยกเลิกรอบ",
  RESTORE_CANCELLED_ROUND: "กู้คืนรอบ",
  COLLECT_PAYMENT: "รับเงิน",
  CANCEL_PAYMENT: "ยกเลิกรับเงิน",
  WAIVE_PAYMENT: "ยกเว้นยอด",
};

const categoryIcons = {
  user: UsersRound,
  payment: CreditCard,
  round: FileClock,
  verify: BadgeCheck,
  setting: Settings,
  default: Activity,
};

function getIcon(action: string) {
  if (action.includes("PAYMENT")) return categoryIcons.payment;
  if (action.includes("ROUND")) return categoryIcons.round;
  if (action.includes("USER") || action.includes("MEMBER") || action.includes("INVITATION")) return categoryIcons.user;
  if (action.includes("VERIFY")) return categoryIcons.verify;
  if (action.includes("WORKSPACE") || action.includes("PROFILE") || action.includes("PASSWORD")) return categoryIcons.setting;
  return categoryIcons.default;
}

function formatDateTime(date: Date | string) {
  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date));
}

type ActivityLogItem = {
  id: string;
  action: string;
  detail: string | null;
  createdAt: Date;
  user: {
    username: string;
    fullName: string;
    email: string | null;
  };
};

export function ActivityLogList({ logs }: { logs: ActivityLogItem[] }) {
  return (
    <section className="grid gap-4">
      <div>
        <h1 className="text-3xl font-black text-slate-950">Activity Log</h1>
        <p className="mt-1 text-sm text-slate-500">ประวัติการทำรายการล่าสุดใน workspace นี้</p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {logs.length ? (
          <div className="divide-y divide-slate-100">
            {logs.map((log) => {
              const Icon = getIcon(log.action);
              return (
                <article key={log.id} className="grid gap-3 p-4 sm:grid-cols-[auto_1fr_auto] sm:items-center">
                  <div className="flex size-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                    <Icon size={20} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-bold text-slate-950">{actionLabels[log.action] ?? log.action}</p>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500">{log.action}</span>
                    </div>
                    {log.detail ? <p className="mt-1 text-sm text-slate-600">{log.detail}</p> : null}
                    <p className="mt-1 text-xs text-slate-400">
                      โดย {log.user.fullName || log.user.username}
                      {log.user.email ? ` • ${log.user.email}` : ""}
                    </p>
                  </div>
                  <time className="text-sm font-semibold text-slate-500 sm:text-right">{formatDateTime(log.createdAt)}</time>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="p-8 text-center text-sm text-slate-500">ยังไม่มี activity log ใน workspace นี้</div>
        )}
      </div>
    </section>
  );
}
