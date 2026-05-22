"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { BellRing, KeyRound, Megaphone, ShieldCheck, ToggleLeft, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  regenerateWorkspaceMemberCardTokenAction,
  sendPlatformAnnouncementAction,
  updatePlatformUserRoleAction,
  updatePlatformUserStatusAction,
  updateWorkspaceStatusAction,
} from "@/features/admin/actions";
import { showConfirm, showError, showSuccess } from "@/lib/swal";

type WorkspaceRow = {
  id: string;
  name: string;
  status: string;
  memberCardToken: string;
  owner: { fullName: string; username: string };
  _count: { workspaceMembers: number; members: number; rounds: number; paymentTransactions: number };
};

type UserRow = {
  id: string;
  username: string;
  email: string | null;
  fullName: string;
  role: string;
  status: string;
  _count: { workspaceMemberships: number; activityLogs: number };
};

type TransactionRow = {
  id: string;
  amount: number;
  paidAt: Date | string;
  workspace: { name: string };
  member: { fullName: string; memberCode: string };
  round: { title: string };
  paymentMethod: { name: string };
  collectedBy: { fullName: string };
};

type ActivityLogRow = {
  id: string;
  action: string;
  detail: string | null;
  outcome: string;
  ipAddress: string | null;
  path: string | null;
  createdAt: Date | string;
  workspace: { name: string } | null;
  user: { fullName: string; username: string } | null;
};

export function SuperAdminManagementPanel({
  workspaces,
  users,
  transactions,
  activityLogs,
}: {
  workspaces: WorkspaceRow[];
  users: UserRow[];
  transactions: TransactionRow[];
  activityLogs: ActivityLogRow[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [workspaceSearch, setWorkspaceSearch] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [announcementTarget, setAnnouncementTarget] = useState<"ALL" | "WORKSPACE" | "USER">("ALL");
  const [announcementWorkspaceId, setAnnouncementWorkspaceId] = useState(workspaces[0]?.id ?? "");
  const [announcementUserId, setAnnouncementUserId] = useState(users[0]?.id ?? "");
  const [announcementTitle, setAnnouncementTitle] = useState("");
  const [announcementMessage, setAnnouncementMessage] = useState("");

  const filteredWorkspaces = useMemo(() => {
    const keyword = workspaceSearch.trim().toLowerCase();
    if (!keyword) return workspaces;
    return workspaces.filter((workspace) => `${workspace.name} ${workspace.owner.fullName} ${workspace.owner.username}`.toLowerCase().includes(keyword));
  }, [workspaceSearch, workspaces]);

  const filteredUsers = useMemo(() => {
    const keyword = userSearch.trim().toLowerCase();
    if (!keyword) return users;
    return users.filter((user) => `${user.fullName} ${user.username} ${user.email ?? ""}`.toLowerCase().includes(keyword));
  }, [userSearch, users]);

  function runAction(action: () => Promise<{ success: boolean; message?: string }>) {
    startTransition(async () => {
      const result = await action();
      if (!result.success) {
        await showError(result.message ?? "ดำเนินการไม่สำเร็จ");
        return;
      }
      await showSuccess(result.message ?? "ดำเนินการสำเร็จ");
      router.refresh();
    });
  }

  async function toggleWorkspaceStatus(workspace: WorkspaceRow) {
    const nextStatus = workspace.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    const confirmed = await showConfirm("ยืนยันการเปลี่ยนสถานะ", `ต้องการเปลี่ยน ${workspace.name} เป็น ${nextStatus} หรือไม่`);
    if (!confirmed) return;
    runAction(() => updateWorkspaceStatusAction({ workspaceId: workspace.id, status: nextStatus }));
  }

  async function resetToken(workspace: WorkspaceRow) {
    const confirmed = await showConfirm("รีเซ็ตลิงก์ member card", `ลิงก์สาธารณะเดิมของ ${workspace.name} จะใช้งานไม่ได้ ต้องการดำเนินการต่อหรือไม่`);
    if (!confirmed) return;
    runAction(() => regenerateWorkspaceMemberCardTokenAction({ workspaceId: workspace.id }));
  }

  async function toggleUserStatus(user: UserRow) {
    const nextStatus = user.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    const confirmed = await showConfirm("ยืนยันการเปลี่ยนสถานะผู้ใช้", `ต้องการเปลี่ยน ${user.fullName} เป็น ${nextStatus} หรือไม่`);
    if (!confirmed) return;
    runAction(() => updatePlatformUserStatusAction({ userId: user.id, status: nextStatus }));
  }

  async function toggleUserRole(user: UserRow) {
    const nextRole = user.role === "SUPER_ADMIN" ? "USER" : "SUPER_ADMIN";
    const confirmed = await showConfirm("ยืนยันการเปลี่ยนสิทธิ์", `ต้องการเปลี่ยน ${user.fullName} เป็น ${nextRole} หรือไม่`);
    if (!confirmed) return;
    runAction(() => updatePlatformUserRoleAction({ userId: user.id, role: nextRole }));
  }

  function sendAnnouncement() {
    runAction(() =>
      sendPlatformAnnouncementAction({
        target: announcementTarget,
        workspaceId: announcementTarget === "WORKSPACE" ? announcementWorkspaceId : undefined,
        userId: announcementTarget === "USER" ? announcementUserId : undefined,
        title: announcementTitle,
        message: announcementMessage,
      }),
    );
    setAnnouncementTitle("");
    setAnnouncementMessage("");
  }

  return (
    <div className="grid gap-5">
      <section className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <Panel title="จัดการเวิร์กสเปซ" icon={<ShieldCheck size={18} />}>
          <input
            className="mb-3 min-h-11 w-full rounded-2xl border border-slate-200 px-4 text-sm outline-none focus:border-blue-400"
            placeholder="ค้นหาเวิร์กสเปซหรือเจ้าของ"
            value={workspaceSearch}
            onChange={(event) => setWorkspaceSearch(event.target.value)}
          />
          <div className="grid max-h-[34rem] gap-3 overflow-y-auto pr-1">
            {filteredWorkspaces.map((workspace) => (
              <div className="rounded-2xl border border-slate-200 bg-white p-4" key={workspace.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-black text-slate-950">{workspace.name}</p>
                      <StatusPill tone={workspace.status === "ACTIVE" ? "emerald" : "rose"}>{workspace.status}</StatusPill>
                    </div>
                    <p className="mt-1 text-sm text-slate-500">เจ้าของ: {workspace.owner.fullName} ({workspace.owner.username})</p>
                    <p className="mt-2 text-xs text-slate-400">
                      {workspace._count.workspaceMembers} ผู้ใช้ · {workspace._count.members} สมาชิก · {workspace._count.rounds} รอบ · {workspace._count.paymentTransactions} การชำระเงิน
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button className="min-h-9 rounded-xl px-3 py-1 text-xs" disabled={isPending} type="button" variant="secondary" onClick={() => toggleWorkspaceStatus(workspace)}>
                      <ToggleLeft className="mr-1" size={14} />
                      {workspace.status === "ACTIVE" ? "ปิดใช้งาน" : "เปิดใช้งาน"}
                    </Button>
                    <Button className="min-h-9 rounded-xl px-3 py-1 text-xs" disabled={isPending} type="button" variant="secondary" onClick={() => resetToken(workspace)}>
                      <KeyRound className="mr-1" size={14} />
                      รีเซ็ต token
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="ศูนย์ประกาศ" icon={<Megaphone size={18} />}>
          <div className="grid gap-3">
            <label className="grid gap-1 text-sm font-semibold text-slate-700">
              ผู้รับ
              <select className="min-h-11 rounded-2xl border border-slate-200 px-3" value={announcementTarget} onChange={(event) => setAnnouncementTarget(event.target.value as "ALL" | "WORKSPACE" | "USER")}>
                <option value="ALL">ทุกคนในระบบ</option>
                <option value="WORKSPACE">เฉพาะเวิร์กสเปซ</option>
                <option value="USER">เฉพาะผู้ใช้</option>
              </select>
            </label>
            {announcementTarget === "WORKSPACE" ? (
              <label className="grid gap-1 text-sm font-semibold text-slate-700">
                เวิร์กสเปซ
                <select className="min-h-11 rounded-2xl border border-slate-200 px-3" value={announcementWorkspaceId} onChange={(event) => setAnnouncementWorkspaceId(event.target.value)}>
                  {workspaces.map((workspace) => (
                    <option key={workspace.id} value={workspace.id}>{workspace.name}</option>
                  ))}
                </select>
              </label>
            ) : null}
            {announcementTarget === "USER" ? (
              <label className="grid gap-1 text-sm font-semibold text-slate-700">
                ผู้ใช้
                <select className="min-h-11 rounded-2xl border border-slate-200 px-3" value={announcementUserId} onChange={(event) => setAnnouncementUserId(event.target.value)}>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>{user.fullName} ({user.username})</option>
                  ))}
                </select>
              </label>
            ) : null}
            <input className="min-h-11 rounded-2xl border border-slate-200 px-4 text-sm" placeholder="หัวข้อประกาศ" value={announcementTitle} onChange={(event) => setAnnouncementTitle(event.target.value)} />
            <textarea className="min-h-28 rounded-2xl border border-slate-200 p-4 text-sm" placeholder="รายละเอียดประกาศ" value={announcementMessage} onChange={(event) => setAnnouncementMessage(event.target.value)} />
            <Button disabled={isPending || announcementTitle.trim().length < 3 || announcementMessage.trim().length < 3} type="button" onClick={sendAnnouncement}>
              <BellRing className="mr-2" size={16} />
              ส่งประกาศ
            </Button>
          </div>
        </Panel>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <Panel title="จัดการผู้ใช้" icon={<UserCheck size={18} />}>
          <input
            className="mb-3 min-h-11 w-full rounded-2xl border border-slate-200 px-4 text-sm outline-none focus:border-blue-400"
            placeholder="ค้นหาชื่อ username หรือ email"
            value={userSearch}
            onChange={(event) => setUserSearch(event.target.value)}
          />
          <div className="grid max-h-[34rem] gap-3 overflow-y-auto pr-1">
            {filteredUsers.map((user) => (
              <div className="rounded-2xl border border-slate-200 bg-white p-4" key={user.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-black text-slate-950">{user.fullName}</p>
                      <StatusPill tone={user.status === "ACTIVE" ? "emerald" : "rose"}>{user.status}</StatusPill>
                      <StatusPill tone={user.role === "SUPER_ADMIN" ? "blue" : "slate"}>{user.role}</StatusPill>
                    </div>
                    <p className="mt-1 text-sm text-slate-500">{user.username}{user.email ? ` · ${user.email}` : ""}</p>
                    <p className="mt-2 text-xs text-slate-400">{user._count.workspaceMemberships} เวิร์กสเปซ · {user._count.activityLogs} บันทึก</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button className="min-h-9 rounded-xl px-3 py-1 text-xs" disabled={isPending} type="button" variant="secondary" onClick={() => toggleUserStatus(user)}>
                      {user.status === "ACTIVE" ? "ปิดบัญชี" : "เปิดบัญชี"}
                    </Button>
                    <Button className="min-h-9 rounded-xl px-3 py-1 text-xs" disabled={isPending} type="button" variant="secondary" onClick={() => toggleUserRole(user)}>
                      {user.role === "SUPER_ADMIN" ? "ถอน Super" : "ตั้ง Super"}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="ตรวจสอบการเงิน">
          <div className="grid max-h-[34rem] gap-2 overflow-y-auto pr-1">
            {transactions.map((transaction) => (
              <div className="rounded-2xl bg-slate-50 p-3" key={transaction.id}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-bold text-slate-950">{transaction.workspace.name}</p>
                    <p className="mt-1 truncate text-sm text-slate-500">{transaction.member.fullName} · {transaction.round.title}</p>
                    <p className="mt-1 text-xs text-slate-400">{new Date(transaction.paidAt).toLocaleString("th-TH")}</p>
                  </div>
                  <p className="shrink-0 font-black text-emerald-700">{transaction.amount.toLocaleString("th-TH")} บาท</p>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </section>

      <Panel title="บันทึกกิจกรรมและความปลอดภัย">
        <div className="grid max-h-[34rem] gap-2 overflow-y-auto pr-1 md:grid-cols-2">
          {activityLogs.map((log) => (
            <div className="rounded-2xl border border-slate-200 bg-white p-4" key={log.id}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-black text-slate-950">{log.action}</p>
                  <p className="mt-1 line-clamp-2 text-sm text-slate-500">{log.detail ?? log.path ?? "ไม่มีรายละเอียด"}</p>
                  <p className="mt-2 text-xs text-slate-400">
                    {log.workspace?.name ?? "ทั้งแพลตฟอร์ม"} · {log.user?.fullName ?? "ระบบ"} · {new Date(log.createdAt).toLocaleString("th-TH")}
                  </p>
                </div>
                <StatusPill tone={log.outcome === "SUCCESS" ? "emerald" : "rose"}>{log.outcome}</StatusPill>
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

function Panel({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        {icon ? <span className="text-slate-500">{icon}</span> : null}
        <h2 className="text-base font-black text-slate-950">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function StatusPill({ children, tone }: { children: React.ReactNode; tone: "emerald" | "rose" | "slate" | "blue" }) {
  const toneClass = {
    emerald: "bg-emerald-50 text-emerald-700",
    rose: "bg-rose-50 text-rose-700",
    slate: "bg-slate-100 text-slate-700",
    blue: "bg-blue-50 text-blue-700",
  }[tone];

  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-black ${toneClass}`}>{children}</span>;
}
