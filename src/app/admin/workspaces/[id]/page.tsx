import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { EmptyState } from "@/components/ui/EmptyState";
import { getAdminWorkspaceDetailAction } from "@/features/admin/actions";
import { ResetMemberCardTokenButton, WorkspaceStatusButton } from "@/features/admin/components/AdminClientControls";
import { formatThaiDateTime } from "@/lib/date";
import { formatMoney } from "@/lib/money";

export default async function AdminWorkspaceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await getAdminWorkspaceDetailAction({ workspaceId: id });

  if (!result.success) {
    if (result.message === "ไม่พบ workspace") notFound();
    return <EmptyState title="ไม่สามารถดึงรายละเอียดเวิร์กสเปซได้" description={result.message} />;
  }

  const { workspace, totals, memberStatusGroups, roundStatusGroups, audit } = result.data;

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link className="text-sm font-semibold text-blue-700 hover:text-blue-800" href="/admin/workspaces">
            กลับไปหน้าเวิร์กสเปซ
          </Link>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-black text-slate-950">{workspace.name}</h1>
            <Pill tone={workspace.status === "ACTIVE" ? "emerald" : "rose"}>{workspace.status}</Pill>
          </div>
          <p className="mt-1 text-sm text-slate-500">{workspace.description ?? "ไม่มีคำอธิบาย"}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <WorkspaceStatusButton workspaceId={workspace.id} workspaceName={workspace.name} status={workspace.status} />
          <ResetMemberCardTokenButton workspaceId={workspace.id} workspaceName={workspace.name} />
        </div>
      </div>

      <section className="grid gap-3 md:grid-cols-4">
        <Metric label="ผู้ใช้" value={workspace._count.workspaceMembers.toLocaleString("th-TH")} />
        <Metric label="สมาชิก" value={workspace._count.members.toLocaleString("th-TH")} />
        <Metric label="ชำระแล้ว" value={formatMoney(totals.paidAmount)} detail={`${totals.paymentCount.toLocaleString("th-TH")} ธุรกรรม`} />
        <Metric label="ยอดค้าง" value={formatMoney(totals.outstandingAmount)} detail={`${totals.outstandingCount.toLocaleString("th-TH")} รายการค้าง`} />
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(280px,380px)_minmax(0,1fr)]">
        <Panel title="เวิร์กสเปซ">
          <Info label="Workspace ID" value={workspace.id} />
          <Info label="เจ้าของ" value={`${workspace.owner.fullName} (${workspace.owner.username})`} />
          <Info label="อีเมลเจ้าของ" value={workspace.owner.email ?? "-"} />
          <Info label="Member card token" value={workspace.memberCardToken} />
          <Info label="สร้างเมื่อ" value={formatThaiDateTime(workspace.createdAt)} />
          <Info label="อัปเดตเมื่อ" value={formatThaiDateTime(workspace.updatedAt)} />
        </Panel>

        <Panel title="สรุปสถานะ">
          <div className="grid gap-3 sm:grid-cols-2">
            <SummaryBlock title="สมาชิก" rows={memberStatusGroups.map((row) => ({ label: row.status, value: row.count }))} />
            <SummaryBlock title="รอบ" rows={roundStatusGroups.map((row) => ({ label: row.status, value: row.count }))} />
          </div>
        </Panel>
      </section>

      <section className="grid gap-5 xl:grid-cols-3">
        <Panel title="Audit: รหัสสมาชิกซ้ำ">
          <div className="grid max-h-[24rem] gap-2 overflow-y-auto pr-1">
            {audit.duplicateMemberCodes.map((item) => (
              <div className="rounded-2xl border border-amber-100 bg-amber-50 p-3" key={item.memberCode}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-black text-slate-950">รหัส {item.memberCode}</p>
                    <p className="mt-1 text-xs font-semibold text-amber-800">
                      ทั้งหมด {item.total} · ACTIVE {item.activeCount} · HIDDEN {item.hiddenCount}
                    </p>
                  </div>
                  <Pill tone={item.activeCount > 1 ? "rose" : "amber"}>{item.activeCount > 1 ? "ต้องตรวจ" : "ปกติ"}</Pill>
                </div>
                <div className="mt-2 grid gap-1">
                  {item.members.map((member) => (
                    <p className="text-xs text-slate-600" key={member.id}>
                      {member.fullName} · {member.status}
                    </p>
                  ))}
                </div>
              </div>
            ))}
            {!audit.duplicateMemberCodes.length ? <p className="text-sm text-slate-500">ไม่พบรหัสสมาชิกซ้ำ</p> : null}
          </div>
        </Panel>

        <Panel title="Health: สมาชิกถูกลบแต่มียอดค้าง">
          <div className="mb-3 rounded-2xl bg-slate-50 p-3">
            <p className="text-xs font-semibold text-slate-500">ยอดค้างรวมในรอบเปิด</p>
            <p className="mt-1 text-lg font-black text-slate-950">{formatMoney(audit.hiddenOpenOutstandingTotal)}</p>
          </div>
          <div className="grid max-h-[20rem] gap-2 overflow-y-auto pr-1">
            {audit.hiddenOpenOutstandingRows.map((row) => (
              <div className="rounded-2xl border border-rose-100 bg-rose-50 p-3" key={row.id}>
                <p className="font-bold text-slate-950">{row.member.fullName}</p>
                <p className="mt-1 text-xs text-slate-600">รหัส {row.member.memberCode} · {row.round.title}</p>
                <p className="mt-2 text-sm font-black text-rose-700">{formatMoney(row.remainingAmount)}</p>
              </div>
            ))}
            {!audit.hiddenOpenOutstandingRows.length ? <p className="text-sm text-slate-500">ไม่พบสมาชิกที่ถูกลบแล้วยังค้างในรอบเปิด</p> : null}
          </div>
        </Panel>

        <Panel title="Audit: แก้ไขสมาชิกในรอบ">
          <div className="grid max-h-[24rem] gap-2 overflow-y-auto pr-1">
            {audit.roundMemberAuditLogs.map((log) => (
              <div className="rounded-2xl border border-slate-200 p-3" key={log.id}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-bold text-slate-950">{log.user?.fullName ?? log.user?.username ?? "ระบบ"}</p>
                    <p className="mt-1 line-clamp-2 text-sm text-slate-500">{log.detail ?? "-"}</p>
                    <p className="mt-1 text-xs text-slate-400">{formatThaiDateTime(log.createdAt)}</p>
                  </div>
                  <Pill tone={log.outcome === "SUCCESS" ? "emerald" : "rose"}>{log.outcome}</Pill>
                </div>
              </div>
            ))}
            {!audit.roundMemberAuditLogs.length ? <p className="text-sm text-slate-500">ยังไม่มี log การแก้ไขสมาชิกในรอบ</p> : null}
          </div>
        </Panel>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <Panel title="ผู้ใช้ในเวิร์กสเปซ">
          <div className="grid max-h-[32rem] gap-2 overflow-y-auto pr-1">
            {workspace.workspaceMembers.map((membership) => (
              <div className="rounded-2xl border border-slate-200 p-3" key={membership.id}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-bold text-slate-950">{membership.user.fullName}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {membership.user.username}
                      {membership.user.email ? ` · ${membership.user.email}` : ""}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">เข้าร่วม {formatThaiDateTime(membership.createdAt)}</p>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    <Pill tone={membership.status === "ACTIVE" ? "emerald" : "rose"}>{membership.status}</Pill>
                    <Pill tone="slate">{membership.role}</Pill>
                  </div>
                </div>
              </div>
            ))}
            {!workspace.workspaceMembers.length ? <p className="text-sm text-slate-500">ยังไม่มีผู้ใช้ในเวิร์กสเปซ</p> : null}
          </div>
        </Panel>

        <Panel title="รอบเก็บเงิน">
          <div className="grid max-h-[32rem] gap-2 overflow-y-auto pr-1">
            {workspace.rounds.map((round) => (
              <div className="rounded-2xl bg-slate-50 p-3" key={round.id}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-bold text-slate-950">{round.title}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {formatThaiDateTime(round.startDate)} - {formatThaiDateTime(round.dueDate)}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      {round._count.memberRounds.toLocaleString("th-TH")} รายการสมาชิก · {round._count.paymentTransactions.toLocaleString("th-TH")} การชำระเงิน
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <Pill tone={round.status === "OPEN" ? "emerald" : round.status === "CANCELLED" ? "rose" : "slate"}>{round.status}</Pill>
                    <p className="mt-2 text-sm font-black text-slate-900">{formatMoney(round.targetAmount)}</p>
                  </div>
                </div>
              </div>
            ))}
            {!workspace.rounds.length ? <p className="text-sm text-slate-500">ยังไม่มีรอบเก็บเงิน</p> : null}
          </div>
        </Panel>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <Panel title="ธุรกรรมล่าสุด">
          <div className="grid max-h-[34rem] gap-2 overflow-y-auto pr-1">
            {workspace.paymentTransactions.map((transaction) => (
              <div className="rounded-2xl bg-slate-50 p-3" key={transaction.id}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-bold text-slate-950">
                      {transaction.member.fullName} · {transaction.round.title}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {transaction.paymentMethod.name} · {transaction.collectedBy.fullName || transaction.collectedBy.username}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">{formatThaiDateTime(transaction.paidAt)}</p>
                  </div>
                  <p className="shrink-0 font-black text-emerald-700">{formatMoney(transaction.amount)}</p>
                </div>
              </div>
            ))}
            {!workspace.paymentTransactions.length ? <p className="text-sm text-slate-500">ยังไม่มีธุรกรรม</p> : null}
          </div>
        </Panel>

        <Panel title="บันทึกกิจกรรมล่าสุด">
          <div className="grid max-h-[34rem] gap-2 overflow-y-auto pr-1">
            {workspace.activityLogs.map((log) => (
              <div className="rounded-2xl border border-slate-200 p-3" key={log.id}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-bold text-slate-950">{log.action}</p>
                    <p className="mt-1 line-clamp-2 text-sm text-slate-500">{log.detail ?? log.path ?? "ไม่มีรายละเอียด"}</p>
                    <p className="mt-1 text-xs text-slate-400">
                      {log.user?.fullName ?? "ระบบ"} · {log.ipAddress ?? "ไม่มี IP"} · {formatThaiDateTime(log.createdAt)}
                    </p>
                  </div>
                  <Pill tone={log.outcome === "SUCCESS" ? "emerald" : "rose"}>{log.outcome}</Pill>
                </div>
              </div>
            ))}
            {!workspace.activityLogs.length ? <p className="text-sm text-slate-500">ยังไม่มีบันทึกกิจกรรม</p> : null}
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

function SummaryBlock({ title, rows }: { title: string; rows: Array<{ label: string; value: number }> }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-3">
      <p className="font-black text-slate-950">{title}</p>
      <div className="mt-3 grid gap-2">
        {rows.map((row) => (
          <div className="flex items-center justify-between gap-3 text-sm" key={row.label}>
            <span className="font-semibold text-slate-600">{row.label}</span>
            <span className="font-black text-slate-950">{row.value.toLocaleString("th-TH")}</span>
          </div>
        ))}
        {!rows.length ? <p className="text-sm text-slate-500">ไม่มีข้อมูล</p> : null}
      </div>
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
