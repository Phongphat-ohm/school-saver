import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { EmptyState } from "@/components/ui/EmptyState";
import { getAdminUserDetailAction } from "@/features/admin/actions";
import { ResetPasswordButton, UserRoleButton, UserStatusButton } from "@/features/admin/components/AdminClientControls";
import { formatThaiDateTime } from "@/lib/date";
import { formatMoney } from "@/lib/money";

export default async function AdminUserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await getAdminUserDetailAction({ userId: id });

  if (!result.success) {
    if (result.message === "ไม่พบผู้ใช้") notFound();
    return <EmptyState title="ไม่สามารถดึงรายละเอียดผู้ใช้ได้" description={result.message} />;
  }

  const { user, collectedTotal } = result.data;

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link className="text-sm font-semibold text-blue-700 hover:text-blue-800" href="/admin/users">
            กลับไปหน้าผู้ใช้
          </Link>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-black text-slate-950">{user.fullName}</h1>
            <Pill tone={user.status === "ACTIVE" ? "emerald" : "rose"}>{user.status}</Pill>
            <Pill tone={user.role === "SUPER_ADMIN" ? "blue" : "slate"}>{user.role}</Pill>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            {user.username}
            {user.email ? ` · ${user.email}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <UserStatusButton userId={user.id} fullName={user.fullName} status={user.status} />
          <UserRoleButton userId={user.id} fullName={user.fullName} role={user.role} />
          <ResetPasswordButton userId={user.id} fullName={user.fullName} />
        </div>
      </div>

      <section className="grid gap-3 md:grid-cols-4">
        <Metric label="เวิร์กสเปซ" value={user._count.workspaceMemberships.toLocaleString("th-TH")} />
        <Metric label="เป็นเจ้าของ" value={user._count.ownedWorkspaces.toLocaleString("th-TH")} />
        <Metric label="ยอดที่เก็บ" value={formatMoney(collectedTotal.amount)} detail={`${collectedTotal.count.toLocaleString("th-TH")} ธุรกรรม`} />
        <Metric label="บันทึกกิจกรรม" value={user._count.activityLogs.toLocaleString("th-TH")} />
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(280px,380px)_minmax(0,1fr)]">
        <Panel title="บัญชี">
          <Info label="User ID" value={user.id} />
          <Info label="ยืนยันอีเมล" value={user.emailVerifiedAt ? formatThaiDateTime(user.emailVerifiedAt) : "ยังไม่ยืนยัน"} />
          <Info label="ยอมรับเงื่อนไข" value={user.termsAcceptedAt ? formatThaiDateTime(user.termsAcceptedAt) : "ยังไม่ยอมรับ"} />
          <Info label="ยอมรับนโยบายความเป็นส่วนตัว" value={user.privacyAcceptedAt ? formatThaiDateTime(user.privacyAcceptedAt) : "ยังไม่ยอมรับ"} />
          <Info label="สร้างเมื่อ" value={formatThaiDateTime(user.createdAt)} />
          <Info label="อัปเดตเมื่อ" value={formatThaiDateTime(user.updatedAt)} />
          {user.cancelledAt ? <Info label="ยกเลิกเมื่อ" value={formatThaiDateTime(user.cancelledAt)} /> : null}
          {user.restoreUntil ? <Info label="กู้คืนได้ถึง" value={formatThaiDateTime(user.restoreUntil)} /> : null}
          {user.anonymizedAt ? <Info label="ลบข้อมูลส่วนตัวเมื่อ" value={formatThaiDateTime(user.anonymizedAt)} /> : null}
        </Panel>

        <Panel title="เวิร์กสเปซที่เข้าร่วม">
          <div className="grid gap-2">
            {user.workspaceMemberships.map((membership) => (
              <div className="rounded-2xl border border-slate-200 p-3" key={membership.id}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-black text-slate-950">{membership.workspace.name}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      เจ้าของ: {membership.workspace.owner.fullName} ({membership.workspace.owner.username})
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      {membership.workspace._count.members.toLocaleString("th-TH")} สมาชิก · {membership.workspace._count.rounds.toLocaleString("th-TH")} รอบ ·{" "}
                      {membership.workspace._count.paymentTransactions.toLocaleString("th-TH")} การชำระเงิน
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    <Pill tone={membership.status === "ACTIVE" ? "emerald" : "rose"}>{membership.status}</Pill>
                    <Pill tone="slate">{membership.role}</Pill>
                  </div>
                </div>
              </div>
            ))}
            {!user.workspaceMemberships.length ? <p className="text-sm text-slate-500">ไม่มีเวิร์กสเปซที่เข้าร่วม</p> : null}
          </div>
        </Panel>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <Panel title="เวิร์กสเปซที่เป็นเจ้าของ">
          <div className="grid gap-2">
            {user.ownedWorkspaces.map((workspace) => (
              <div className="rounded-2xl bg-slate-50 p-3" key={workspace.id}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold text-slate-950">{workspace.name}</p>
                    <p className="mt-1 text-xs text-slate-500">สร้าง {formatThaiDateTime(workspace.createdAt)}</p>
                  </div>
                  <Pill tone={workspace.status === "ACTIVE" ? "emerald" : "rose"}>{workspace.status}</Pill>
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  {workspace._count.workspaceMembers.toLocaleString("th-TH")} ผู้ใช้ · {workspace._count.members.toLocaleString("th-TH")} สมาชิก ·{" "}
                  {workspace._count.rounds.toLocaleString("th-TH")} รอบ
                </p>
              </div>
            ))}
            {!user.ownedWorkspaces.length ? <p className="text-sm text-slate-500">ไม่ได้เป็นเจ้าของเวิร์กสเปซใด</p> : null}
          </div>
        </Panel>

        <Panel title="ธุรกรรมที่เก็บเงิน">
          <div className="grid max-h-[32rem] gap-2 overflow-y-auto pr-1">
            {user.collectedTransactions.map((transaction) => (
              <div className="rounded-2xl bg-slate-50 p-3" key={transaction.id}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-bold text-slate-950">{transaction.workspace.name}</p>
                    <p className="mt-1 truncate text-sm text-slate-500">
                      {transaction.member.fullName} · {transaction.round.title} · {transaction.paymentMethod.name}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">{formatThaiDateTime(transaction.paidAt)}</p>
                  </div>
                  <p className="shrink-0 font-black text-emerald-700">{formatMoney(transaction.amount)}</p>
                </div>
              </div>
            ))}
            {!user.collectedTransactions.length ? <p className="text-sm text-slate-500">ยังไม่มีรายการเก็บเงิน</p> : null}
          </div>
        </Panel>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <Panel title="บันทึกกิจกรรมล่าสุด">
          <div className="grid max-h-[34rem] gap-2 overflow-y-auto pr-1">
            {user.activityLogs.map((log) => (
              <div className="rounded-2xl border border-slate-200 p-3" key={log.id}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-bold text-slate-950">{log.action}</p>
                    <p className="mt-1 line-clamp-2 text-sm text-slate-500">{log.detail ?? log.path ?? "ไม่มีรายละเอียด"}</p>
                    <p className="mt-1 text-xs text-slate-400">
                      {log.workspace?.name ?? "ทั้งแพลตฟอร์ม"} · {log.ipAddress ?? "ไม่มี IP"} · {formatThaiDateTime(log.createdAt)}
                    </p>
                  </div>
                  <Pill tone={log.outcome === "SUCCESS" ? "emerald" : "rose"}>{log.outcome}</Pill>
                </div>
              </div>
            ))}
            {!user.activityLogs.length ? <p className="text-sm text-slate-500">ยังไม่มีบันทึกกิจกรรม</p> : null}
          </div>
        </Panel>

        <Panel title="การแจ้งเตือน">
          <div className="grid max-h-[34rem] gap-2 overflow-y-auto pr-1">
            {user.notifications.map((notification) => (
              <div className="rounded-2xl border border-slate-200 p-3" key={notification.id}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold text-slate-950">{notification.title}</p>
                    <p className="mt-1 text-sm text-slate-500">{notification.message ?? "-"}</p>
                    <p className="mt-1 text-xs text-slate-400">
                      {notification.type} · {notification.workspace?.name ?? "ทั้งแพลตฟอร์ม"} · {formatThaiDateTime(notification.createdAt)}
                    </p>
                  </div>
                  <Pill tone={notification.readAt ? "emerald" : "amber"}>{notification.readAt ? "อ่านแล้ว" : "ยังไม่อ่าน"}</Pill>
                </div>
              </div>
            ))}
            {!user.notifications.length ? <p className="text-sm text-slate-500">ยังไม่มีการแจ้งเตือน</p> : null}
          </div>
        </Panel>
      </section>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm">
      <h2 className="mb-3 text-base font-black text-slate-950">{title}</h2>
      {children}
    </section>
  );
}

function Metric({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <p className="text-sm font-semibold text-slate-500">{label}</p>
      <p className="mt-2 text-xl font-black text-slate-950">{value}</p>
      {detail ? <p className="mt-1 text-xs text-slate-500">{detail}</p> : null}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-slate-100 py-2 last:border-b-0">
      <p className="text-xs font-semibold text-slate-400">{label}</p>
      <p className="mt-1 break-words text-sm font-semibold text-slate-800">{value}</p>
    </div>
  );
}

function Pill({ children, tone }: { children: ReactNode; tone: "emerald" | "rose" | "blue" | "slate" | "amber" }) {
  const cls = {
    emerald: "bg-emerald-50 text-emerald-700",
    rose: "bg-rose-50 text-rose-700",
    blue: "bg-blue-50 text-blue-700",
    slate: "bg-slate-100 text-slate-700",
    amber: "bg-amber-50 text-amber-700",
  }[tone];
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-black ${cls}`}>{children}</span>;
}
