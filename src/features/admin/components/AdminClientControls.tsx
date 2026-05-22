"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Download, KeyRound, Power, Search, Send, ShieldCheck, UserCheck, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  enterSupportSessionAction,
  endSupportSessionAction,
  exitSupportSessionAction,
  cancelScheduledAnnouncementAction,
  createAnnouncementTemplateAction,
  createRecipientGroupAction,
  createAdminDataExportAction,
  regenerateWorkspaceMemberCardTokenAction,
  resetPlatformUserPasswordAction,
  schedulePlatformAnnouncementAction,
  sendPlatformAnnouncementAction,
  sendDueScheduledAnnouncementsAction,
  startSupportSessionAction,
  updatePlatformSettingAction,
  updatePlatformUserRoleAction,
  updatePlatformUserStatusAction,
  updateWorkspaceStatusAction,
  upsertWorkspaceFeatureFlagAction,
  upsertWorkspaceLimitAction,
} from "@/features/admin/actions";
import { showConfirm, showError, showSuccess } from "@/lib/swal";

type ActionResultLike = Promise<{ success: boolean; message?: string }>;

export function AdminActionButton({
  label,
  confirmTitle,
  confirmText,
  action,
  variant = "secondary",
}: {
  label: string;
  confirmTitle: string;
  confirmText: string;
  action: () => ActionResultLike;
  variant?: "primary" | "secondary" | "danger" | "ghost";
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  async function run() {
    const confirmed = await showConfirm(confirmTitle, confirmText);
    if (!confirmed) return;
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

  return (
    <Button className="min-h-9 rounded-xl px-3 py-1 text-xs" disabled={pending} type="button" variant={variant} onClick={run}>
      {label}
    </Button>
  );
}

export function WorkspaceStatusButton({ workspaceId, workspaceName, status }: { workspaceId: string; workspaceName: string; status: string }) {
  const nextStatus = status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
  return (
    <AdminActionButton
      label={status === "ACTIVE" ? "ปิดใช้งาน" : "เปิดใช้งาน"}
      confirmTitle="เปลี่ยนสถานะเวิร์กสเปซ"
      confirmText={`ต้องการเปลี่ยน ${workspaceName} เป็น ${nextStatus} หรือไม่`}
      action={() => updateWorkspaceStatusAction({ workspaceId, status: nextStatus })}
      variant={status === "ACTIVE" ? "danger" : "secondary"}
    />
  );
}

export function ResetMemberCardTokenButton({ workspaceId, workspaceName }: { workspaceId: string; workspaceName: string }) {
  return (
    <AdminActionButton
      label="รีเซ็ต token"
      confirmTitle="รีเซ็ต member card token"
      confirmText={`ลิงก์สาธารณะเดิมของ ${workspaceName} จะใช้งานไม่ได้ ต้องการดำเนินการต่อหรือไม่`}
      action={() => regenerateWorkspaceMemberCardTokenAction({ workspaceId })}
    />
  );
}

export function UserStatusButton({ userId, fullName, status }: { userId: string; fullName: string; status: string }) {
  const nextStatus = status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
  return (
    <AdminActionButton
      label={status === "ACTIVE" ? "ปิดบัญชี" : "เปิดบัญชี"}
      confirmTitle="เปลี่ยนสถานะผู้ใช้"
      confirmText={`ต้องการเปลี่ยน ${fullName} เป็น ${nextStatus} หรือไม่`}
      action={() => updatePlatformUserStatusAction({ userId, status: nextStatus })}
      variant={status === "ACTIVE" ? "danger" : "secondary"}
    />
  );
}

export function UserRoleButton({ userId, fullName, role }: { userId: string; fullName: string; role: string }) {
  const nextRole = role === "SUPER_ADMIN" ? "USER" : "SUPER_ADMIN";
  return (
    <AdminActionButton
      label={role === "SUPER_ADMIN" ? "ถอน Super" : "ตั้ง Super"}
      confirmTitle="เปลี่ยนสิทธิ์ผู้ใช้"
      confirmText={`ต้องการเปลี่ยน ${fullName} เป็น ${nextRole} หรือไม่`}
      action={() => updatePlatformUserRoleAction({ userId, role: nextRole })}
    />
  );
}

export function ResetPasswordButton({ userId, fullName }: { userId: string; fullName: string }) {
  return (
    <AdminActionButton
      label="รีเซ็ตรหัสผ่าน"
      confirmTitle="รีเซ็ตรหัสผ่าน"
      confirmText={`ต้องการสร้างรหัสผ่านชั่วคราวให้ ${fullName} หรือไม่`}
      action={() => resetPlatformUserPasswordAction({ userId })}
    />
  );
}

export function AnnouncementForm({
  workspaces,
  users,
  templates = [],
  recipientGroups = [],
}: {
  workspaces: Array<{ id: string; name: string }>;
  users: Array<{ id: string; fullName: string; username: string; email?: string | null }>;
  templates?: Array<{ id: string; name: string; title: string; message: string }>;
  recipientGroups?: Array<{ id: string; name: string; description?: string | null; _count: { members: number } }>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [target, setTarget] = useState<"ALL" | "WORKSPACE" | "USER" | "GROUP">("ALL");
  const [workspaceId, setWorkspaceId] = useState(workspaces[0]?.id ?? "");
  const [groupId, setGroupId] = useState(recipientGroups[0]?.id ?? "");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const filteredUsers = users.filter((user) => {
    const query = userSearch.trim().toLowerCase();
    if (!query) return true;
    return [user.fullName, user.username, user.email ?? ""].some((value) => value.toLowerCase().includes(query));
  });
  const visibleSelectedCount = filteredUsers.filter((user) => selectedUserIds.includes(user.id)).length;
  const userTargetReady = target !== "USER" || selectedUserIds.length > 0;
  const targetReady = userTargetReady && (target !== "WORKSPACE" || !!workspaceId) && (target !== "GROUP" || !!groupId);

  function toggleUser(userId: string) {
    setSelectedUserIds((current) => (current.includes(userId) ? current.filter((id) => id !== userId) : [...current, userId]));
  }

  function selectVisibleUsers() {
    setSelectedUserIds((current) => Array.from(new Set([...current, ...filteredUsers.map((user) => user.id)])));
  }

  function submit() {
    startTransition(async () => {
      const result = await sendPlatformAnnouncementAction({
        target: target === "GROUP" ? "USER" : target,
        workspaceId: target === "WORKSPACE" ? workspaceId : undefined,
        groupId: target === "GROUP" ? groupId : undefined,
        userIds: target === "USER" ? selectedUserIds : undefined,
        title,
        message,
      });
      if (!result.success) {
        await showError(result.message);
        return;
      }
      await showSuccess(result.message ?? "ส่งประกาศแล้ว");
      setTitle("");
      setMessage("");
      setSelectedUserIds([]);
      setUserSearch("");
      router.refresh();
    });
  }

  function schedule() {
    startTransition(async () => {
      const result = await schedulePlatformAnnouncementAction({
        target: target === "GROUP" ? "USER" : target,
        workspaceId: target === "WORKSPACE" ? workspaceId : undefined,
        groupId: target === "GROUP" ? groupId : undefined,
        userIds: target === "USER" ? selectedUserIds : undefined,
        title,
        message,
        scheduledAt,
      });
      if (!result.success) {
        await showError(result.message);
        return;
      }
      await showSuccess(result.message ?? "นัดส่งประกาศแล้ว");
      setTitle("");
      setMessage("");
      setScheduledAt("");
      setSelectedUserIds([]);
      setUserSearch("");
      router.refresh();
    });
  }

  function useTemplate(templateId: string) {
    const template = templates.find((item) => item.id === templateId);
    if (!template) return;
    setTitle(template.title);
    setMessage(template.message);
  }

  return (
    <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4">
      {templates.length ? (
        <select className="min-h-11 rounded-2xl border border-slate-200 px-3" defaultValue="" onChange={(event) => useTemplate(event.target.value)}>
          <option value="">ใช้ template ข้อความ</option>
          {templates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}
        </select>
      ) : null}
      <select className="min-h-11 rounded-2xl border border-slate-200 px-3" value={target} onChange={(event) => setTarget(event.target.value as "ALL" | "WORKSPACE" | "USER" | "GROUP")}>
        <option value="ALL">ทุกคนในระบบ</option>
        <option value="WORKSPACE">เฉพาะ workspace</option>
        <option value="GROUP">กลุ่มผู้รับที่บันทึกไว้</option>
        <option value="USER">เฉพาะผู้ใช้</option>
      </select>
      {target === "WORKSPACE" ? (
        <select className="min-h-11 rounded-2xl border border-slate-200 px-3" value={workspaceId} onChange={(event) => setWorkspaceId(event.target.value)}>
          {workspaces.map((workspace) => <option key={workspace.id} value={workspace.id}>{workspace.name}</option>)}
        </select>
      ) : null}
      {target === "GROUP" ? (
        <select className="min-h-11 rounded-2xl border border-slate-200 px-3" value={groupId} onChange={(event) => setGroupId(event.target.value)}>
          {recipientGroups.map((group) => <option key={group.id} value={group.id}>{group.name} ({group._count.members.toLocaleString("th-TH")} คน)</option>)}
        </select>
      ) : null}
      {target === "USER" ? (
        <div className="grid gap-3 rounded-2xl border border-slate-200 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
              <UserCheck size={16} />
              <span>ผู้รับที่เลือก {selectedUserIds.length.toLocaleString("th-TH")} คน</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button className="min-h-9 rounded-xl px-3 py-1 text-xs" disabled={filteredUsers.length === 0 || visibleSelectedCount === filteredUsers.length} type="button" variant="secondary" onClick={selectVisibleUsers}>
                เลือกทั้งหมดที่เห็น
              </Button>
              <Button className="min-h-9 rounded-xl px-3 py-1 text-xs" disabled={selectedUserIds.length === 0} type="button" variant="ghost" onClick={() => setSelectedUserIds([])}>
                <X className="mr-1" size={14} />
                ล้าง
              </Button>
            </div>
          </div>
          <label className="flex min-h-11 items-center gap-2 rounded-2xl border border-slate-200 px-3 text-sm text-slate-500 focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-100">
            <Search size={16} />
            <input
              className="min-w-0 flex-1 bg-transparent text-slate-900 outline-none placeholder:text-slate-400"
              placeholder="ค้นหาชื่อ, username หรือ email"
              value={userSearch}
              onChange={(event) => setUserSearch(event.target.value)}
            />
          </label>
          <div className="grid max-h-64 gap-2 overflow-y-auto pr-1">
            {filteredUsers.length > 0 ? (
              filteredUsers.map((user) => {
                const checked = selectedUserIds.includes(user.id);
                return (
                  <label className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-3 transition ${checked ? "border-blue-200 bg-blue-50" : "border-slate-200 hover:bg-slate-50"}`} key={user.id}>
                    <input className="mt-1 size-4 accent-blue-600" type="checkbox" checked={checked} onChange={() => toggleUser(user.id)} />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-bold text-slate-950">{user.fullName}</span>
                      <span className="block truncate text-xs text-slate-500">
                        {user.username}{user.email ? ` ยท ${user.email}` : ""}
                      </span>
                    </span>
                  </label>
                );
              })
            ) : (
              <p className="rounded-2xl bg-slate-50 px-3 py-4 text-center text-sm text-slate-500">ไม่พบผู้ใช้ตามคำค้นหา</p>
            )}
          </div>
        </div>
      ) : null}
      <input className="min-h-11 rounded-2xl border border-slate-200 px-4 text-sm" placeholder="หัวข้อประกาศ" value={title} onChange={(event) => setTitle(event.target.value)} />
      <textarea className="min-h-32 rounded-2xl border border-slate-200 p-4 text-sm" placeholder="รายละเอียดประกาศ" value={message} onChange={(event) => setMessage(event.target.value)} />
      <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
        <input className="min-h-11 rounded-2xl border border-slate-200 px-4 text-sm" type="datetime-local" value={scheduledAt} onChange={(event) => setScheduledAt(event.target.value)} />
        <Button disabled={pending || !targetReady || !scheduledAt || title.trim().length < 3 || message.trim().length < 3} type="button" variant="secondary" onClick={schedule}>
          นัดส่ง
        </Button>
        <Button disabled={pending || !targetReady || title.trim().length < 3 || message.trim().length < 3} type="button" onClick={submit}>
          <Send className="mr-2" size={16} />
          ส่งทันที
        </Button>
      </div>
    </div>
  );
}

export function AnnouncementTemplateForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");

  function submit() {
    startTransition(async () => {
      const result = await createAnnouncementTemplateAction({ name, title, message });
      if (!result.success) {
        await showError(result.message);
        return;
      }
      await showSuccess(result.message ?? "บันทึก template แล้ว");
      setName("");
      setTitle("");
      setMessage("");
      router.refresh();
    });
  }

  return (
    <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4">
      <h2 className="font-black text-slate-950">เทมเพลตข้อความ</h2>
      <input className="min-h-11 rounded-2xl border border-slate-200 px-4 text-sm" placeholder="ชื่อ template" value={name} onChange={(event) => setName(event.target.value)} />
      <input className="min-h-11 rounded-2xl border border-slate-200 px-4 text-sm" placeholder="หัวข้อ" value={title} onChange={(event) => setTitle(event.target.value)} />
      <textarea className="min-h-28 rounded-2xl border border-slate-200 p-4 text-sm" placeholder="ข้อความ" value={message} onChange={(event) => setMessage(event.target.value)} />
      <Button disabled={pending || name.trim().length < 2 || title.trim().length < 3 || message.trim().length < 3} type="button" onClick={submit}>บันทึกเทมเพลต</Button>
    </div>
  );
}

export function RecipientGroupForm({ users }: { users: Array<{ id: string; fullName: string; username: string; email?: string | null }> }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const filteredUsers = users.filter((user) => [user.fullName, user.username, user.email ?? ""].join(" ").toLowerCase().includes(query.trim().toLowerCase()));

  function toggle(userId: string) {
    setSelectedUserIds((current) => (current.includes(userId) ? current.filter((id) => id !== userId) : [...current, userId]));
  }

  function submit() {
    startTransition(async () => {
      const result = await createRecipientGroupAction({ name, description, userIds: selectedUserIds });
      if (!result.success) {
        await showError(result.message);
        return;
      }
      await showSuccess(result.message ?? "บันทึกกลุ่มแล้ว");
      setName("");
      setDescription("");
      setSelectedUserIds([]);
      setQuery("");
      router.refresh();
    });
  }

  return (
    <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4">
      <h2 className="font-black text-slate-950">กลุ่มผู้รับ</h2>
      <input className="min-h-11 rounded-2xl border border-slate-200 px-4 text-sm" placeholder="ชื่อกลุ่ม" value={name} onChange={(event) => setName(event.target.value)} />
      <input className="min-h-11 rounded-2xl border border-slate-200 px-4 text-sm" placeholder="รายละเอียด" value={description} onChange={(event) => setDescription(event.target.value)} />
      <input className="min-h-11 rounded-2xl border border-slate-200 px-4 text-sm" placeholder="ค้นหาผู้ใช้" value={query} onChange={(event) => setQuery(event.target.value)} />
      <div className="grid max-h-52 gap-2 overflow-y-auto pr-1">
        {filteredUsers.map((user) => (
          <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-200 p-3 text-sm" key={user.id}>
            <input className="size-4 accent-blue-600" type="checkbox" checked={selectedUserIds.includes(user.id)} onChange={() => toggle(user.id)} />
            <span className="min-w-0 truncate">{user.fullName} ({user.username})</span>
          </label>
        ))}
      </div>
      <Button disabled={pending || name.trim().length < 2 || selectedUserIds.length === 0} type="button" onClick={submit}>บันทึกกลุ่ม {selectedUserIds.length.toLocaleString("th-TH")} คน</Button>
    </div>
  );
}

export function SupportSessionForm({ workspaces }: { workspaces: Array<{ id: string; name: string }> }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [workspaceId, setWorkspaceId] = useState(workspaces[0]?.id ?? "");
  const [mode, setMode] = useState<"READ_ONLY" | "FULL_SUPPORT">("READ_ONLY");
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [reason, setReason] = useState("");

  function submit() {
    startTransition(async () => {
      const result = await startSupportSessionAction({ workspaceId, mode, durationMinutes, reason });
      if (!result.success) {
        await showError(result.message);
        return;
      }
      await showSuccess(result.message ?? "เริ่ม support session แล้ว");
      setReason("");
      router.refresh();
    });
  }

  return (
    <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4">
      <select className="min-h-11 rounded-2xl border border-slate-200 px-3" value={workspaceId} onChange={(event) => setWorkspaceId(event.target.value)}>
        {workspaces.map((workspace) => <option key={workspace.id} value={workspace.id}>{workspace.name}</option>)}
      </select>
      <select className="min-h-11 rounded-2xl border border-slate-200 px-3" value={mode} onChange={(event) => setMode(event.target.value as "READ_ONLY" | "FULL_SUPPORT")}>
        <option value="READ_ONLY">ดูอย่างเดียว</option>
        <option value="FULL_SUPPORT">ช่วยเหลือเต็มรูปแบบ</option>
      </select>
      <input className="min-h-11 rounded-2xl border border-slate-200 px-4 text-sm" type="number" min={15} max={240} value={durationMinutes} onChange={(event) => setDurationMinutes(Number(event.target.value))} />
      <textarea className="min-h-28 rounded-2xl border border-slate-200 p-4 text-sm" placeholder="เหตุผลในการเข้า support" value={reason} onChange={(event) => setReason(event.target.value)} />
      <Button disabled={pending || reason.trim().length < 5} type="button" onClick={submit}>
        <ShieldCheck className="mr-2" size={16} />
        เริ่ม session ช่วยเหลือ
      </Button>
    </div>
  );
}

export function EnterSupportSessionButton({ sessionId, active }: { sessionId: string; active?: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function enter() {
    startTransition(async () => {
      const result = await enterSupportSessionAction({ sessionId });
      if (!result.success) {
        await showError(result.message);
        return;
      }
      await showSuccess(result.message ?? "เข้าโหมด support แล้ว");
      router.push("/dashboard");
      router.refresh();
    });
  }

  return (
    <Button className="min-h-9 rounded-xl px-3 py-1 text-xs" disabled={pending || active} type="button" variant={active ? "secondary" : "primary"} onClick={enter}>
      {active ? "กำลังใช้งาน" : "เข้า workspace"}
    </Button>
  );
}

export function ExitSupportSessionButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function exit() {
    startTransition(async () => {
      const result = await exitSupportSessionAction();
      if (!result.success) {
        await showError(result.message);
        return;
      }
      await showSuccess(result.message ?? "ออกจาก support mode แล้ว");
      router.push("/admin/support");
      router.refresh();
    });
  }

  return (
    <Button className="min-h-9 rounded-xl px-3 py-1 text-xs" disabled={pending} type="button" variant="danger" onClick={exit}>
      ออกจากโหมดช่วยเหลือ
    </Button>
  );
}

export function EndSupportSessionButton({ sessionId }: { sessionId: string }) {
  return (
    <AdminActionButton
      label="จบ session"
      confirmTitle="จบ session ช่วยเหลือ"
      confirmText="ต้องการจบ session ช่วยเหลือนี้หรือไม่"
      action={() => endSupportSessionAction({ sessionId })}
      variant="danger"
    />
  );
}

export function CancelScheduledAnnouncementButton({ id }: { id: string }) {
  return (
    <AdminActionButton
      label="ยกเลิก"
      confirmTitle="ยกเลิกนัดส่ง"
      confirmText="ต้องการยกเลิกรายการนัดส่งประกาศนี้หรือไม่"
      action={() => cancelScheduledAnnouncementAction({ id })}
      variant="danger"
    />
  );
}

export function SendDueScheduledAnnouncementsButton() {
  return (
    <AdminActionButton
      label="ส่งรายการที่ถึงเวลา"
      confirmTitle="ส่งรายการนัดส่งประกาศ"
      confirmText="ระบบจะส่งรายการ scheduled ที่ถึงเวลาแล้วทั้งหมด ต้องการดำเนินการต่อหรือไม่"
      action={() => sendDueScheduledAnnouncementsAction()}
    />
  );
}

export function PlatformSettingForm({ setting }: { setting: { key: string; value: string; label?: string | null } }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [value, setValue] = useState(setting.value);
  const config = getPlatformSettingControl(setting.key);
  const changed = value !== setting.value;

  function save() {
    startTransition(async () => {
      if (setting.key === "maintenance_mode" && value === "true" && setting.value !== "true") {
        const confirmed = await showConfirm("เปิด Maintenance mode?", "ผู้ใช้ทั่วไปจะไม่สามารถเข้าใช้งานระบบได้จนกว่าจะปิดกลับ");
        if (!confirmed) return;
      }
      if (setting.key === "default_workspace_status" && value === "INACTIVE" && setting.value !== "INACTIVE") {
        const confirmed = await showConfirm("ตั้ง workspace ใหม่เป็น INACTIVE?", "workspace ที่สร้างใหม่จะยังใช้งานไม่ได้จนกว่า SUPER ADMIN จะเปิดใช้งาน");
        if (!confirmed) return;
      }
      const result = await updatePlatformSettingAction({ key: setting.key, value });
      if (!result.success) {
        await showError(result.message);
        return;
      }
      await showSuccess(result.message ?? "บันทึกแล้ว");
      router.refresh();
    });
  }

  return (
    <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-[1fr_minmax(220px,280px)_auto] sm:items-center">
      <div>
        <p className="font-black text-slate-950">{setting.label ?? setting.key}</p>
        <p className="mt-1 text-xs text-slate-500">{setting.key}</p>
        {config.help ? <p className="mt-1 text-xs font-medium text-amber-600">{config.help}</p> : null}
      </div>
      <PlatformSettingInput config={config} value={value} onChange={setValue} />
      <Button disabled={pending || !changed || value.trim().length === 0} type="button" onClick={save}>บันทึก</Button>
    </div>
  );
}

type PlatformSettingControl =
  | { type: "boolean"; help?: string }
  | { type: "select"; options: Array<{ value: string; label: string }>; help?: string }
  | { type: "number"; min: number; max?: number; step?: number; help?: string }
  | { type: "text"; help?: string };

function getPlatformSettingControl(key: string): PlatformSettingControl {
  if (key === "maintenance_mode") return { type: "boolean", help: "ค่าเสี่ยง: เปิดแล้ว user ทั่วไปจะเข้าใช้งานไม่ได้" };
  if (key === "enable_beta_broadcasts" || key === "enable_workspace_health_alerts") return { type: "boolean" };
  if (key === "default_workspace_status") {
    return {
      type: "select",
      options: [
        { value: "ACTIVE", label: "ACTIVE - ใช้งานได้ทันที" },
        { value: "INACTIVE", label: "INACTIVE - ต้องให้ SUPER ADMIN เปิดก่อน" },
      ],
      help: "มีผลกับ workspace ที่สร้างใหม่",
    };
  }
  if (key === "billing_plan_default") {
    return {
      type: "select",
      options: [
        { value: "FREE", label: "FREE" },
        { value: "PRO", label: "PRO" },
        { value: "ENTERPRISE", label: "ENTERPRISE" },
      ],
    };
  }
  if (key === "max_members_per_workspace") return { type: "number", min: 1, max: 1_000_000 };
  if (key === "otp_rate_limit_seconds") return { type: "number", min: 0, max: 3600, help: "0 = ไม่จำกัดเวลาในการขอซ้ำ" };
  if (key === "activity_log_retention_days") return { type: "number", min: 0, max: 3650 };
  return { type: "text" };
}

function PlatformSettingInput({ config, value, onChange }: { config: PlatformSettingControl; value: string; onChange: (value: string) => void }) {
  if (config.type === "boolean") {
    const enabled = value.toLowerCase() === "true";
    return (
      <button
        aria-pressed={enabled}
        className={`flex min-h-11 items-center justify-between gap-3 rounded-2xl border px-4 text-sm font-bold transition ${
          enabled ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-50 text-slate-600"
        }`}
        type="button"
        onClick={() => onChange(enabled ? "false" : "true")}
      >
        <span>{enabled ? "เปิดใช้งาน" : "ปิดใช้งาน"}</span>
        <span className={`relative h-6 w-11 rounded-full transition ${enabled ? "bg-emerald-500" : "bg-slate-300"}`}>
          <span className={`absolute top-1 size-4 rounded-full bg-white transition ${enabled ? "left-6" : "left-1"}`} />
        </span>
      </button>
    );
  }

  if (config.type === "select") {
    return (
      <select className="min-h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm" value={value} onChange={(event) => onChange(event.target.value)}>
        {config.options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    );
  }

  if (config.type === "number") {
    return (
      <input
        className="min-h-11 rounded-2xl border border-slate-200 px-4 text-sm"
        max={config.max}
        min={config.min}
        step={config.step ?? 1}
        type="number"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    );
  }

  return <input className="min-h-11 rounded-2xl border border-slate-200 px-4 text-sm" value={value} onChange={(event) => onChange(event.target.value)} />;
}

export function ExportXlsxButton({ filename, rows }: { filename: string; rows: Array<Record<string, unknown>> }) {
  async function exportFile() {
    if (!rows.length) return;
    const XLSX = await import("xlsx");
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Export");
    XLSX.writeFile(workbook, filename);
  }

  return (
    <Button disabled={!rows.length} type="button" variant="secondary" onClick={exportFile}>
      <Download className="mr-2" size={16} />
      ส่งออก Excel
    </Button>
  );
}

export function AdminDataExportButton({ dataset }: { dataset: "users" | "workspaces" | "payments" | "activity_logs" }) {
  const [pending, startTransition] = useTransition();

  function exportFile() {
    startTransition(async () => {
      const result = await createAdminDataExportAction({ dataset });
      if (!result.success) {
        await showError(result.message);
        return;
      }
      const XLSX = await import("xlsx");
      const worksheet = XLSX.utils.json_to_sheet(result.data.rows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Export");
      XLSX.writeFile(workbook, result.data.filename);
      const cappedMessage = result.data.truncated
        ? `จำกัดข้อมูลล่าสุด ${result.data.exportedRows.toLocaleString("th-TH")} จากทั้งหมด ${result.data.totalRows.toLocaleString("th-TH")} แถว`
        : `ส่งออกครบ ${result.data.exportedRows.toLocaleString("th-TH")} แถว`;
      await showSuccess(`${result.message ?? "ส่งออกสำเร็จ"}\n${cappedMessage}`);
    });
  }

  return (
    <Button disabled={pending} type="button" variant="secondary" onClick={exportFile}>
      <Download className="mr-2" size={16} />
      {pending ? "กำลังส่งออก..." : "ส่งออก Excel"}
    </Button>
  );
}

export function WorkspaceFeatureFlagToggle({
  workspaceId,
  flagKey,
  enabled,
}: {
  workspaceId: string;
  flagKey: string;
  enabled: boolean;
}) {
  return (
    <AdminActionButton
      label={enabled ? "เปิด" : "ปิด"}
      confirmTitle="อัปเดตฟีเจอร์"
      confirmText={`ต้องการ${enabled ? "ปิด" : "เปิด"} ${flagKey} หรือไม่`}
      action={() => upsertWorkspaceFeatureFlagAction({ workspaceId, key: flagKey, enabled: !enabled })}
      variant={enabled ? "primary" : "secondary"}
    />
  );
}

export function WorkspaceLimitForm({ workspaceId, limitKey, value }: { workspaceId: string; limitKey: string; value: number }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [nextValue, setNextValue] = useState(value);

  function save() {
    startTransition(async () => {
      const result = await upsertWorkspaceLimitAction({ workspaceId, key: limitKey, value: nextValue });
      if (!result.success) {
        await showError(result.message);
        return;
      }
      await showSuccess(result.message ?? "บันทึก limit แล้ว");
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-2">
      <input className="h-9 w-24 rounded-xl border border-slate-200 px-3 text-sm" min={0} type="number" value={nextValue} onChange={(event) => setNextValue(Number(event.target.value))} />
      <Button className="min-h-9 rounded-xl px-3 py-1 text-xs" disabled={pending || nextValue === value} type="button" variant="secondary" onClick={save}>บันทึก</Button>
    </div>
  );
}

export function IconLabel({ type }: { type: "power" | "key" }) {
  return type === "power" ? <Power size={14} /> : <KeyRound size={14} />;
}
