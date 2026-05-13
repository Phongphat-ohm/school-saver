"use client";

import { useState, useTransition } from "react";
import { Search, Send, UserPlus } from "lucide-react";
import type { WorkspaceRole } from "@/generated/prisma/client";
import { roleOptions } from "@/constants/roles";
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

export function WorkspaceInviteForm({ actorRole }: { actorRole?: WorkspaceRole | null }) {
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [role, setRole] = useState("VIEWER");
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
        search();
      } else await showError(result.message);
    });
  }

  return (
    <>
      <Button type="button" className="w-full gap-2" onClick={() => setOpen(true)}>
        <UserPlus size={18} />ค้นหาและส่งคำเชิญ
      </Button>

      <Modal title="ค้นหาผู้ใช้เพื่อเชิญเข้า Workspace" open={open} onClose={() => setOpen(false)}>
        <div className="grid gap-4">
          <div className="grid gap-3">
            <Input label="ค้นหาผู้ใช้ด้วย username หรือชื่อ" value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="เช่น somchai หรือ สมชาย" />
            <div className="grid gap-3 sm:grid-cols-2">
              <Select label="Role ที่จะมอบให้" value={role} onChange={(event) => setRole(event.target.value)} options={visibleRoleOptions} />
              <Input label="ข้อความเชิญ" value={message} onChange={(event) => setMessage(event.target.value)} placeholder="เช่น ช่วยเก็บเงินห้องนี้" />
            </div>
            <Button type="button" disabled={pending} className="gap-2" onClick={search}>
              <Search size={18} />ค้นหาผู้ใช้
            </Button>
          </div>

          <div className="max-h-[360px] overflow-y-auto pr-1">
            <div className="grid gap-2">
              {results.length === 0 ? (
                <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">ค้นหาด้วย username หรือชื่อ แล้วเลือกผู้ใช้ที่ต้องการส่งคำเชิญ</p>
              ) : null}
              {results.map((user) => (
                <div key={user.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-slate-50 p-3">
                  <div>
                    <p className="font-semibold text-slate-950">{user.fullName}</p>
                    <p className="text-sm text-slate-500">{user.username}</p>
                  </div>
                  {user.alreadyMember ? (
                    <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700">อยู่ใน workspace แล้ว</span>
                  ) : user.pendingInvitation ? (
                    <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700">รอตอบรับคำเชิญ</span>
                  ) : (
                    <Button type="button" disabled={pending} className="gap-2" onClick={() => send(user)}>
                      <Send size={16} />ส่งคำเชิญ
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
}
