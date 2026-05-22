import type { ReactNode } from "react";
import { Activity, AlertTriangle, Banknote, BriefcaseBusiness, ClipboardList, ShieldCheck, UsersRound, WalletCards } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { formatThaiDateTime } from "@/lib/date";
import { formatMoney } from "@/lib/money";

type SuperAdminOverview = {
  totals: {
    totalWorkspaces: number;
    totalUsers: number;
    activeUsers: number;
    inactiveUsers: number;
    superAdmins: number;
    totalMembers: number;
    activeRounds: number;
    totalRounds: number;
    totalPaidAmount: number;
    totalTransactionCount: number;
    todayPaidAmount: number;
    todayTransactionCount: number;
    totalOutstandingAmount: number;
    outstandingMemberRoundCount: number;
  };
  recentWorkspaces: Array<{
    id: string;
    name: string;
    description: string | null;
    createdAt: Date | string;
    owner: { fullName: string; username: string; email: string | null };
    _count: { workspaceMembers: number; members: number; rounds: number; paymentTransactions: number };
  }>;
  recentUsers: Array<{
    id: string;
    username: string;
    email: string | null;
    fullName: string;
    role: string;
    status: string;
    createdAt: Date | string;
    cancelledAt: Date | string | null;
    _count: { workspaceMemberships: number };
  }>;
  recentTransactions: Array<{
    id: string;
    amount: number;
    paidAt: Date | string;
    workspace: { name: string };
    member: { fullName: string; memberCode: string };
    round: { title: string };
    paymentMethod: { name: string; type: string };
    collectedBy: { fullName: string; username: string };
  }>;
  workspaces: Array<{
    id: string;
    name: string;
    status: string;
    memberCardToken: string;
    owner: { fullName: string; username: string };
    _count: { workspaceMembers: number; members: number; rounds: number; paymentTransactions: number };
  }>;
  users: Array<{
    id: string;
    username: string;
    email: string | null;
    fullName: string;
    role: string;
    status: string;
    _count: { workspaceMemberships: number; activityLogs: number };
  }>;
  recentActivityLogs: Array<{
    id: string;
    action: string;
    detail: string | null;
    outcome: string;
    ipAddress: string | null;
    path: string | null;
    createdAt: Date | string;
    workspace: { name: string } | null;
    user: { fullName: string; username: string } | null;
  }>;
  topWorkspacesByPaid: Array<{ workspaceId: string; workspaceName: string; totalPaidAmount: number; transactionCount: number }>;
  topWorkspacesByOutstanding: Array<{ workspaceId: string; workspaceName: string; totalOutstandingAmount: number; memberRoundCount: number }>;
  topWorkspacesByMembers: Array<{ workspaceId: string; workspaceName: string; memberCount: number }>;
};

const statCards = [
  { key: "workspaces", label: "เวิร์กสเปซ", icon: BriefcaseBusiness, tone: "bg-blue-50 text-blue-700" },
  { key: "users", label: "ผู้ใช้", icon: UsersRound, tone: "bg-emerald-50 text-emerald-700" },
  { key: "members", label: "สมาชิก", icon: ClipboardList, tone: "bg-violet-50 text-violet-700" },
  { key: "paid", label: "ยอดชำระรวม", icon: Banknote, tone: "bg-cyan-50 text-cyan-700" },
  { key: "today", label: "ยอดชำระวันนี้", icon: WalletCards, tone: "bg-amber-50 text-amber-700" },
  { key: "outstanding", label: "ยอดค้าง", icon: AlertTriangle, tone: "bg-rose-50 text-rose-700" },
] as const;

export function SuperAdminDashboard({ overview }: { overview: SuperAdminOverview }) {
  const stats = {
    workspaces: {
      value: overview.totals.totalWorkspaces.toLocaleString("th-TH"),
      detail: `${overview.totals.activeRounds.toLocaleString("th-TH")} รอบที่เปิดอยู่`,
    },
    users: {
      value: overview.totals.totalUsers.toLocaleString("th-TH"),
      detail: `${overview.totals.activeUsers.toLocaleString("th-TH")} ใช้งาน, ${overview.totals.superAdmins.toLocaleString("th-TH")} ผู้ดูแลสูงสุด`,
    },
    members: {
      value: overview.totals.totalMembers.toLocaleString("th-TH"),
      detail: `${overview.totals.totalRounds.toLocaleString("th-TH")} รอบเก็บเงิน`,
    },
    paid: {
      value: formatMoney(overview.totals.totalPaidAmount),
      detail: `${overview.totals.totalTransactionCount.toLocaleString("th-TH")} ธุรกรรม`,
    },
    today: {
      value: formatMoney(overview.totals.todayPaidAmount),
      detail: `${overview.totals.todayTransactionCount.toLocaleString("th-TH")} ธุรกรรมวันนี้`,
    },
    outstanding: {
      value: formatMoney(overview.totals.totalOutstandingAmount),
      detail: `${overview.totals.outstandingMemberRoundCount.toLocaleString("th-TH")} รายการสมาชิกค้างชำระ`,
    },
  };

  return (
    <div className="grid gap-5">
      <section className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
            <ShieldCheck size={14} />
            ผู้ดูแลสูงสุด
          </div>
          <h1 className="text-2xl font-black text-slate-950">ศูนย์ควบคุมแพลตฟอร์ม</h1>
          <p className="mt-1 text-sm text-slate-500">ภาพรวมข้อมูลทุกเวิร์กสเปซ ผู้ใช้ การชำระเงิน และบันทึกกิจกรรมทั้งระบบ</p>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {statCards.map((card) => {
          const Icon = card.icon;
          const item = stats[card.key];
          return (
            <Card className="rounded-2xl border-slate-200 bg-white p-4" key={card.key}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-500">{card.label}</p>
                  <p className="mt-2 truncate text-2xl font-black text-slate-950">{item.value}</p>
                  <p className="mt-1 text-xs font-medium text-slate-500">{item.detail}</p>
                </div>
                <div className={`grid size-11 shrink-0 place-items-center rounded-2xl ${card.tone}`}>
                  <Icon size={20} />
                </div>
              </div>
            </Card>
          );
        })}
      </section>

      <section className="grid gap-5 xl:grid-cols-3">
        <RankingCard
          title="เวิร์กสเปซยอดชำระสูงสุด"
          rows={overview.topWorkspacesByPaid.map((item) => ({
            id: item.workspaceId,
            label: item.workspaceName,
            value: formatMoney(item.totalPaidAmount),
            detail: `${item.transactionCount.toLocaleString("th-TH")} ธุรกรรม`,
          }))}
        />
        <RankingCard
          title="ยอดค้างสูงสุด"
          rows={overview.topWorkspacesByOutstanding.map((item) => ({
            id: item.workspaceId,
            label: item.workspaceName,
            value: formatMoney(item.totalOutstandingAmount),
            detail: `${item.memberRoundCount.toLocaleString("th-TH")} รายการสมาชิก`,
          }))}
        />
        <RankingCard
          title="เวิร์กสเปซสมาชิกมากสุด"
          rows={overview.topWorkspacesByMembers.map((item) => ({
            id: item.workspaceId,
            label: item.workspaceName,
            value: item.memberCount.toLocaleString("th-TH"),
            detail: "สมาชิก",
          }))}
        />
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <Card className="rounded-2xl border-slate-200 bg-white p-0">
          <SectionHeader title="เวิร์กสเปซล่าสุด" />
          <div className="divide-y divide-slate-100">
            {overview.recentWorkspaces.map((workspace) => (
              <div className="grid gap-3 p-4 sm:grid-cols-[1fr_auto]" key={workspace.id}>
                <div className="min-w-0">
                  <p className="truncate font-bold text-slate-950">{workspace.name}</p>
                  <p className="mt-1 truncate text-sm text-slate-500">เจ้าของ: {workspace.owner.fullName} ({workspace.owner.username})</p>
                  <p className="mt-1 text-xs text-slate-400">สร้างเมื่อ {formatThaiDateTime(workspace.createdAt)}</p>
                </div>
                <div className="grid grid-cols-2 gap-2 text-right text-xs text-slate-500">
                  <MiniMetric label="ผู้ใช้" value={workspace._count.workspaceMembers} />
                  <MiniMetric label="สมาชิก" value={workspace._count.members} />
                  <MiniMetric label="รอบ" value={workspace._count.rounds} />
                  <MiniMetric label="ชำระเงิน" value={workspace._count.paymentTransactions} />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="rounded-2xl border-slate-200 bg-white p-0">
          <SectionHeader title="ผู้ใช้ล่าสุด" />
          <div className="divide-y divide-slate-100">
            {overview.recentUsers.map((user) => (
              <div className="flex items-center justify-between gap-3 p-4" key={user.id}>
                <div className="min-w-0">
                  <p className="truncate font-bold text-slate-950">{user.fullName}</p>
                  <p className="mt-1 truncate text-sm text-slate-500">{user.username}{user.email ? ` · ${user.email}` : ""}</p>
                  <p className="mt-1 text-xs text-slate-400">{formatThaiDateTime(user.createdAt)}</p>
                </div>
                <div className="shrink-0 text-right">
                  <StatusPill tone={user.role === "SUPER_ADMIN" ? "emerald" : "slate"}>{user.role}</StatusPill>
                  <p className="mt-2 text-xs text-slate-500">{user._count.workspaceMemberships} เวิร์กสเปซ</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <Card className="rounded-2xl border-slate-200 bg-white p-0">
          <SectionHeader title="ธุรกรรมล่าสุด" />
          <div className="divide-y divide-slate-100">
            {overview.recentTransactions.map((transaction) => (
              <div className="grid gap-2 p-4 sm:grid-cols-[1fr_auto]" key={transaction.id}>
                <div className="min-w-0">
                  <p className="truncate font-bold text-slate-950">{transaction.member.fullName} · {transaction.round.title}</p>
                  <p className="mt-1 truncate text-sm text-slate-500">{transaction.workspace.name} · {transaction.paymentMethod.name} · {transaction.collectedBy.fullName}</p>
                  <p className="mt-1 text-xs text-slate-400">{formatThaiDateTime(transaction.paidAt)}</p>
                </div>
                <p className="font-black text-emerald-700">{formatMoney(transaction.amount)}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card className="rounded-2xl border-slate-200 bg-white p-0">
          <SectionHeader title="บันทึกกิจกรรมล่าสุด" icon={<Activity size={18} />} />
          <div className="divide-y divide-slate-100">
            {overview.recentActivityLogs.map((log) => (
              <div className="p-4" key={log.id}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-bold text-slate-950">{log.action}</p>
                    <p className="mt-1 line-clamp-2 text-sm text-slate-500">{log.detail ?? log.path ?? "ไม่มีรายละเอียด"}</p>
                    <p className="mt-1 text-xs text-slate-400">
                      {log.workspace?.name ?? "ทั้งแพลตฟอร์ม"} · {log.user?.fullName ?? "ระบบ"} · {formatThaiDateTime(log.createdAt)}
                    </p>
                  </div>
                  <StatusPill tone={log.outcome === "SUCCESS" ? "emerald" : "rose"}>{log.outcome}</StatusPill>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </section>

    </div>
  );
}

function SectionHeader({ title, icon }: { title: string; icon?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-slate-100 p-4">
      <h2 className="flex items-center gap-2 text-base font-black text-slate-950">
        {icon}
        {title}
      </h2>
    </div>
  );
}

function RankingCard({ title, rows }: { title: string; rows: Array<{ id: string; label: string; value: string; detail: string }> }) {
  return (
    <Card className="rounded-2xl border-slate-200 bg-white p-0">
      <SectionHeader title={title} />
      <div className="grid gap-2 p-4">
        {rows.length === 0 ? <p className="text-sm text-slate-500">ยังไม่มีข้อมูล</p> : null}
        {rows.map((row, index) => (
          <div className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 p-3" key={row.id}>
            <div className="min-w-0">
              <p className="truncate font-bold text-slate-950">{index + 1}. {row.label}</p>
              <p className="mt-1 text-xs text-slate-500">{row.detail}</p>
            </div>
            <p className="shrink-0 font-black text-slate-900">{row.value}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}

function MiniMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-2">
      <p className="font-black text-slate-950">{value.toLocaleString("th-TH")}</p>
      <p>{label}</p>
    </div>
  );
}

function StatusPill({ children, tone }: { children: ReactNode; tone: "emerald" | "rose" | "slate" }) {
  const toneClass = {
    emerald: "bg-emerald-50 text-emerald-700",
    rose: "bg-rose-50 text-rose-700",
    slate: "bg-slate-100 text-slate-700",
  }[tone];

  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-black ${toneClass}`}>{children}</span>;
}
