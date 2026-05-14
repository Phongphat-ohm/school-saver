"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Crown, Edit3, Eye, Shield, UserRoundCheck, UserX } from "lucide-react";
import type { WorkspaceRole } from "@/generated/prisma/client";
import { roleLabels, roleOptions } from "@/constants/roles";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { removeWorkspaceMemberAction } from "@/features/workspace/actions";
import { updateWorkspaceUserRoleAction } from "@/features/users/actions";
import { closeLoading, showConfirm, showError, showLoading, showSuccess } from "@/lib/swal";

const roleIcons = {
  OWNER: Crown,
  ADMIN: Shield,
  COLLECTOR: UserRoundCheck,
  VIEWER: Eye,
};

export function WorkspaceMemberList({
  members,
  actorRole,
}: {
  members: Array<{ id: string; role: WorkspaceRole; status: string; user: { id: string; username: string; fullName: string } }>;
  actorRole?: WorkspaceRole | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState<(typeof members)[number] | null>(null);
  const [role, setRole] = useState<WorkspaceRole>("VIEWER");
  const visibleRoleOptions = actorRole === "ADMIN" ? roleOptions.filter((option) => option.value !== "OWNER") : roleOptions;
  const canManage = actorRole === "OWNER" || actorRole === "ADMIN";

  return (
    <>
      <div className="grid gap-3">
        {members.map((member) => {
          const Icon = roleIcons[member.role] ?? Eye;
          const lockedForAdmin = actorRole === "ADMIN" && member.role === "OWNER";

          return (
            <div key={member.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex items-center gap-3">
                <div className="grid size-10 place-items-center rounded-2xl bg-slate-100 text-slate-600">
                  <Icon size={18} />
                </div>
                <div>
                  <p className="font-semibold text-slate-950">{member.user.fullName}</p>
                  <p className="text-sm text-slate-500">
                    {member.user.username} • {roleLabels[member.role]}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={member.status} />
                {canManage ? (
                  <>
                    <Button
                      type="button"
                      variant="secondary"
                      className="gap-2"
                      disabled={lockedForAdmin}
                      onClick={() => {
                        setEditing(member);
                        setRole(member.role);
                      }}
                    >
                      <Edit3 size={16} />
                      เปลี่ยน role
                    </Button>
                    <Button
                      type="button"
                      variant="danger"
                      className="gap-2"
                      disabled={pending || lockedForAdmin}
                      onClick={() => {
                        startTransition(async () => {
                          if (!(await showConfirm("ลบผู้ใช้ออกจาก workspace", `ต้องการลบ ${member.user.fullName} ออกจาก workspace นี้หรือไม่?`))) return;
                          showLoading("กำลังลบผู้ใช้ออกจาก workspace");
                          const result = await removeWorkspaceMemberAction({ userId: member.user.id });
                          closeLoading();
                          if (result.success) {
                            await showSuccess(result.message ?? "ลบผู้ใช้ออกจาก workspace แล้ว");
                            router.refresh();
                          } else {
                            await showError(result.message);
                          }
                        });
                      }}
                    >
                      <UserX size={16} />
                      ลบออก
                    </Button>
                  </>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      <Modal title="เปลี่ยนสิทธิ์ใน Workspace" open={!!editing} onClose={() => setEditing(null)}>
        <form
          className="grid gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            if (!editing) return;
            startTransition(async () => {
              showLoading("กำลังเปลี่ยน role");
              const result = await updateWorkspaceUserRoleAction({ userId: editing.user.id, role });
              closeLoading();
              if (result.success) {
                await showSuccess(result.message ?? "เปลี่ยน role สำเร็จ");
                setEditing(null);
                router.refresh();
              } else {
                await showError(result.message);
              }
            });
          }}
        >
          <p className="text-sm text-slate-500">{editing?.user.fullName} จะมีสิทธิ์ใน workspace ปัจจุบันตาม role ที่เลือก</p>
          <Select label="Role" value={role} onChange={(event) => setRole(event.target.value as WorkspaceRole)} options={visibleRoleOptions} />
          <Button disabled={pending}>บันทึก role</Button>
        </form>
      </Modal>
    </>
  );
}
