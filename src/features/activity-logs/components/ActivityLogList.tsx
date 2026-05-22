import Link from "next/link";
import type React from "react";
import { Activity, BadgeCheck, CreditCard, FileClock, Search, Settings, ShieldAlert, UsersRound } from "lucide-react";
import { formatThaiDateTime } from "@/lib/date";

const actionLabels: Record<string, string> = {
  LOGIN: "เข้าสู่ระบบ",
  LOGIN_FAILED: "เข้าสู่ระบบไม่สำเร็จ",
  SECURITY_BLOCKED_IP: "บล็อก IP ชั่วคราว",
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

const outcomeLabels: Record<string, string> = {
  SUCCESS: "สำเร็จ",
  FAILURE: "ผิดพลาด",
  BLOCKED: "บล็อก",
};

const outcomeClasses: Record<string, string> = {
  SUCCESS: "bg-emerald-50 text-emerald-700",
  FAILURE: "bg-amber-50 text-amber-700",
  BLOCKED: "bg-red-50 text-red-700",
};

const categoryIcons = {
  security: ShieldAlert,
  user: UsersRound,
  payment: CreditCard,
  round: FileClock,
  verify: BadgeCheck,
  setting: Settings,
  default: Activity,
};

function getIcon(action: string, outcome: string) {
  if (outcome === "BLOCKED" || action.includes("FAILED") || action.includes("SECURITY")) return categoryIcons.security;
  if (action.includes("PAYMENT")) return categoryIcons.payment;
  if (action.includes("ROUND")) return categoryIcons.round;
  if (action.includes("USER") || action.includes("MEMBER") || action.includes("INVITATION")) return categoryIcons.user;
  if (action.includes("VERIFY")) return categoryIcons.verify;
  if (action.includes("WORKSPACE") || action.includes("PROFILE") || action.includes("PASSWORD")) return categoryIcons.setting;
  return categoryIcons.default;
}

type ActivityLogItem = {
  id: string;
  action: string;
  detail: string | null;
  outcome: string;
  ipAddress: string | null;
  userAgent: string | null;
  method: string | null;
  path: string | null;
  createdAt: Date;
  user: {
    id: string;
    username: string;
    fullName: string;
    email: string | null;
  } | null;
};

type ActivityLogListProps = {
  data: {
    logs: ActivityLogItem[];
    filters: {
      page: number;
      pageSize: number;
      maxCount: number;
      q: string;
      action: string;
      outcome: string;
      ipAddress: string;
    };
    pagination: {
      page: number;
      pageSize: number;
      maxCount: number;
      total: number;
      cappedTotal: number;
      pageCount: number;
      hasPreviousPage: boolean;
      hasNextPage: boolean;
    };
    options: {
      actions: string[];
      outcomes: string[];
    };
  };
};

export function ActivityLogList({ data }: ActivityLogListProps) {
  const { logs, filters, pagination, options } = data;

  return (
    <section className="grid gap-4">
      <div>
        <h1 className="text-3xl font-black text-slate-950">Activity Log</h1>
        <p className="mt-1 text-sm text-slate-500">ตรวจสอบการทำงาน, IP, เหตุการณ์ผิดพลาด และรายการที่ถูกบล็อกในระบบ</p>
      </div>

      <form className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <label className="grid min-w-0 gap-1.5 text-sm font-medium text-slate-700">
          <span>ค้นหา</span>
          <div className="flex min-h-11 items-center gap-2 rounded-lg border border-slate-200 px-3 focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-100">
            <Search size={18} className="text-slate-400" />
            <input name="q" defaultValue={filters.q} placeholder="action, detail, IP, user" className="w-full bg-transparent text-slate-900 outline-none placeholder:text-slate-400" />
          </div>
        </label>

        <div className="flex flex-wrap items-end gap-3">
        <Select name="action" label="Action" defaultValue={filters.action} wrapperClassName="flex-[1_1_220px]">
          <option value="">ทั้งหมด</option>
          {options.actions.map((action) => (
            <option key={action} value={action}>
              {actionLabels[action] ?? action}
            </option>
          ))}
        </Select>

        <Select name="outcome" label="ผลลัพธ์" defaultValue={filters.outcome} wrapperClassName="flex-[1_1_180px]">
          <option value="">ทั้งหมด</option>
          {options.outcomes.map((outcome) => (
            <option key={outcome} value={outcome}>
              {outcomeLabels[outcome] ?? outcome}
            </option>
          ))}
        </Select>

        <label className="grid min-w-0 flex-[1_1_170px] gap-1.5 text-sm font-medium text-slate-700">
          <span>IP</span>
          <input name="ipAddress" defaultValue={filters.ipAddress} className="min-h-11 rounded-lg border border-slate-200 bg-white px-3 text-slate-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
        </label>

        <div className="grid min-w-0 flex-[1_1_330px] grid-cols-2 gap-2 sm:grid-cols-[minmax(90px,120px)_minmax(90px,120px)_auto] sm:items-end">
          <label className="grid gap-1.5 text-sm font-medium text-slate-700">
            <span>ต่อหน้า</span>
            <input name="pageSize" type="number" min={1} max={100} defaultValue={filters.pageSize} className="min-h-11 rounded-lg border border-slate-200 px-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
          </label>
          <label className="grid gap-1.5 text-sm font-medium text-slate-700">
            <span>Max</span>
            <input name="maxCount" type="number" min={1} max={1000} defaultValue={filters.maxCount} className="min-h-11 rounded-lg border border-slate-200 px-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
          </label>
          <button className="col-span-2 min-h-11 rounded-lg bg-blue-700 px-4 text-sm font-bold text-white transition hover:bg-blue-800 sm:col-span-1" type="submit">
            กรอง
          </button>
        </div>
        </div>
      </form>

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-500">
        <span>
          แสดง {logs.length} รายการจาก {pagination.cappedTotal} รายการที่ใช้ได้ {pagination.total > pagination.maxCount ? `(จำกัด maxCount ${pagination.maxCount})` : ""}
        </span>
        <Link href="/activity-logs" className="font-semibold text-blue-700 hover:text-blue-800">
          ล้างตัวกรอง
        </Link>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        {logs.length ? (
          <div className="divide-y divide-slate-100">
            {logs.map((log) => {
              const Icon = getIcon(log.action, log.outcome);
              return (
                <article key={log.id} className="grid gap-3 p-4 sm:grid-cols-[auto_1fr_auto] sm:items-start">
                  <div className="flex size-11 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                    <Icon size={20} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-bold text-slate-950">{actionLabels[log.action] ?? log.action}</p>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500">{log.action}</span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${outcomeClasses[log.outcome] ?? "bg-slate-100 text-slate-600"}`}>
                        {outcomeLabels[log.outcome] ?? log.outcome}
                      </span>
                    </div>
                    {log.detail ? <p className="mt-1 text-sm text-slate-600">{log.detail}</p> : null}
                    <p className="mt-1 text-xs text-slate-400">
                      โดย {log.user ? log.user.fullName || log.user.username : "Guest/System"}
                      {log.user?.email ? ` • ${log.user.email}` : ""}
                    </p>
                    <p className="mt-1 break-words text-xs text-slate-400">
                      IP: {log.ipAddress ?? "-"} {log.method ? `• ${log.method}` : ""} {log.path ? `• ${log.path}` : ""}
                    </p>
                    {log.userAgent ? <p className="mt-1 line-clamp-1 break-all text-xs text-slate-400">{log.userAgent}</p> : null}
                  </div>
                  <time className="text-sm font-semibold text-slate-500 sm:text-right">{formatThaiDateTime(log.createdAt)}</time>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="p-8 text-center text-sm text-slate-500">ยังไม่มี activity log ที่ตรงกับตัวกรองนี้</div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-sm font-semibold text-slate-500">
          หน้า {pagination.page} / {pagination.pageCount}
        </span>
        <div className="flex gap-2">
          <PaginationLink disabled={!pagination.hasPreviousPage} page={pagination.page - 1} filters={filters}>
            ก่อนหน้า
          </PaginationLink>
          <PaginationLink disabled={!pagination.hasNextPage} page={pagination.page + 1} filters={filters}>
            ถัดไป
          </PaginationLink>
        </div>
      </div>
    </section>
  );
}

function Select({
  label,
  children,
  wrapperClassName = "",
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & { label: string; wrapperClassName?: string }) {
  return (
    <label className={`grid min-w-0 gap-1.5 text-sm font-medium text-slate-700 ${wrapperClassName}`}>
      <span>{label}</span>
      <select className="min-h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-slate-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" {...props}>
        {children}
      </select>
    </label>
  );
}

function PaginationLink({
  disabled,
  page,
  filters,
  children,
}: {
  disabled: boolean;
  page: number;
  filters: ActivityLogListProps["data"]["filters"];
  children: React.ReactNode;
}) {
  if (disabled) {
    return <span className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-bold text-slate-300">{children}</span>;
  }

  return (
    <Link href={buildActivityLogHref(filters, page)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 transition hover:border-blue-200 hover:text-blue-700">
      {children}
    </Link>
  );
}

function buildActivityLogHref(filters: ActivityLogListProps["data"]["filters"], page: number) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries({ ...filters, page })) {
    if (value !== "" && value !== undefined && value !== null) params.set(key, String(value));
  }
  return `/activity-logs?${params.toString()}`;
}
