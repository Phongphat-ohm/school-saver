"use client";

import { useState, useTransition } from "react";
import { AtSign, CheckCircle2, Clock3, MailPlus, Search, Send, UserPlus, UsersRound } from "lucide-react";
import type { WorkspaceRole } from "@/generated/prisma/client";
import { roleLabels, roleOptions } from "@/constants/roles";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { searchUsersForWorkspaceInviteAction, sendWorkspaceInvitationAction } from "@/features/workspace/actions";
import { closeLoading, showError, showLoading, showSuccess } from "@/lib/swal";

type SearchResult = {
  id: string;
  username: string;
  fullName: string;
  alreadyMember: boolean;
  pendingInvitation: { id: string; role: string } | null;
};

function UserInitial({ name }: { name: string }) {
  return (
    <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-blue-100 text-sm font-black text-blue-700">
      {name.trim().charAt(0).toUpperCase() || "U"}
    </div>
  );
}

export function WorkspaceInviteForm({ actorRole }: { actorRole?: WorkspaceRole | null }) {
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [role, setRole] = useState<WorkspaceRole>("VIEWER");
  const [message, setMessage] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const visibleRoleOptions = actorRole === "ADMIN" ? roleOptions.filter((option) => option.value !== "OWNER") : roleOptions;

  function search() {
    startTransition(async () => {
      showLoading("กำลังค้นหาผู้ใช้");
      const result = await searchUsersForWorkspaceInviteAction(keyword);
      closeLoading();
      if (result.success) setResults(result.data);
      else await showError(result.message);
    });
  }

  function send(user: SearchResult) {
    startTransition(async () => {
      showLoading("กำลังส่งคำเชิญ");
      const result = await sendWorkspaceInvitationAction({ userId: user.id, role, message });
      closeLoading();
      if (result.success) {
        await showSuccess(result.message ?? "ส่งคำเชิญแล้ว");
        setResults((items) => items.map((item) => (item.id === user.id ? { ...item, pendingInvitation: { id: "pending", role } } : item)));
      } else await showError(result.message);
    });
  }

  return (
    <>
      <div className="grid gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-4">
        <div className="flex items-start gap-3">
          <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-blue-600 text-white">
            <MailPlus size={20} />
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-slate-950">ส่งคำเชิญเข้า workspace</h3>
            <p className="mt-1 text-sm leading-6 text-slate-600">ค้นหาผู้ใช้ที่มีบัญชีแล้ว เลือก role แล้วส่งคำเชิญให้ตอบรับ</p>
          </div>
        </div>
        <Button type="button" className="w-full gap-2" onClick={() => setOpen(true)}>
          <UserPlus size={18} />
          ค้นหาและส่งคำเชิญ
        </Button>
      </div>

      <Modal title="ส่งคำเชิญเข้า Workspace" open={open} onClose={() => setOpen(false)} size="lg">
        <div className="grid gap-5">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:p-4">
            <div className="grid gap-3">
              <Input
                label="ค้นหาด้วย username หรือชื่อ"
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    search();
                  }
                }}
                placeholder="เช่น somchai หรือ สมชาย"
              />
              <div className="grid gap-3 md:grid-cols-[220px_1fr_auto] md:items-end">
                <Select label="Role ที่จะมอบให้" value={role} onChange={(event) => setRole(event.target.value as WorkspaceRole)} options={visibleRoleOptions} />
                <Input label="ข้อความเชิญ" value={message} onChange={(event) => setMessage(event.target.value)} placeholder="เช่น ช่วยเก็บเงินห้องนี้" />
                <Button type="button" disabled={pending} className="gap-2 md:min-w-32" onClick={search}>
                  <Search size={18} />
                  ค้นหา
                </Button>
              </div>
            </div>
          </div>

          <div className="grid gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-bold text-slate-950">ผลการค้นหา</p>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">{results.length} รายการ</span>
            </div>

            <div className="max-h-[55vh] overflow-y-auto pr-1">
              <div className="grid gap-2">
                {results.length === 0 ? (
                  <div className="grid place-items-center rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-center">
                    <UsersRound className="text-slate-300" size={28} />
                    <p className="mt-3 text-sm font-semibold text-slate-700">ยังไม่มีผลการค้นหา</p>
                    <p className="mt-1 max-w-sm text-xs leading-5 text-slate-500">กรอก username หรือชื่อผู้ใช้ แล้วกดค้นหาเพื่อเลือกคนที่ต้องการเชิญ</p>
                  </div>
                ) : null}

                {results.map((user) => (
                  <div key={user.id} className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-3 sm:grid-cols-[1fr_auto] sm:items-center">
                    <div className="flex min-w-0 items-center gap-3">
                      <UserInitial name={user.fullName} />
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-slate-950">{user.fullName}</p>
                        <p className="mt-0.5 flex items-center gap-1 truncate text-sm text-slate-500">
                          <AtSign size={14} />
                          {user.username}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                      {user.alreadyMember ? (
                        <span className="inline-flex min-h-9 items-center gap-2 rounded-full bg-emerald-100 px-3 text-xs font-bold text-emerald-700">
                          <CheckCircle2 size={15} />
                          อยู่ใน workspace แล้ว
                        </span>
                      ) : user.pendingInvitation ? (
                        <span className="inline-flex min-h-9 items-center gap-2 rounded-full bg-amber-100 px-3 text-xs font-bold text-amber-700">
                          <Clock3 size={15} />
                          รอตอบรับ {roleLabels[user.pendingInvitation.role as keyof typeof roleLabels] ?? ""}
                        </span>
                      ) : (
                        <Button type="button" disabled={pending} className="w-full gap-2 sm:w-auto" onClick={() => send(user)}>
                          <Send size={16} />
                          ส่งคำเชิญ
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
}
