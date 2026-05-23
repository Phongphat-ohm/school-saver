"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Edit3, Trash2, UserCheck, UserX } from "lucide-react";
import type { WorkspaceRole } from "@/generated/prisma/client";
import { roleLabels, roleOptions } from "@/constants/roles";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { deleteWorkspaceUserAction, disableWorkspaceUserAction, enableWorkspaceUserAction, updateWorkspaceUserRoleAction } from "@/features/users/actions";
import { closeLoading, showConfirm, showError, showLoading, showSuccess } from "@/lib/swal";

export function UserTable({ users, actorRole }: { users: any[]; actorRole?: WorkspaceRole | null }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState<any | null>(null);
  const [role, setRole] = useState("VIEWER");
  const visibleRoleOptions = actorRole === "ADMIN" ? roleOptions.filter((option) => option.value !== "OWNER") : roleOptions;

  function disableUser(item: any) {
    startTransition(async () => {
      const confirmed = await showConfirm("ปิดใช้งานผู้ใช้", `ต้องการปิดใช้งาน ${item.user.fullName} ใน workspace นี้หรือไม่?`);
      if (!confirmed) return;
      showLoading("กำลังปิดใช้งานผู้ใช้");
      const result = await disableWorkspaceUserAction(item.id);
      closeLoading();
      if (result.success) {
        await showSuccess(result.message ?? "ปิดใช้งานผู้ใช้แล้ว");
        router.refresh();
      } else await showError(result.message);
    });
  }

  function enableUser(item: any) {
    startTransition(async () => {
      const confirmed = await showConfirm("เปิดใช้งานผู้ใช้", `ต้องการเปิดใช้งาน ${item.user.fullName} ใน workspace นี้หรือไม่? ระบบจะตรวจ max user limit ก่อนเปิดใช้งาน`);
      if (!confirmed) return;
      showLoading("กำลังเปิดใช้งานผู้ใช้");
      const result = await enableWorkspaceUserAction(item.id);
      closeLoading();
      if (result.success) {
        await showSuccess(result.message ?? "เปิดใช้งานผู้ใช้แล้ว");
        router.refresh();
      } else await showError(result.message);
    });
  }

  function deleteUser(item: any) {
    startTransition(async () => {
      const confirmed = await showConfirm(
        "ลบผู้ใช้ออกจาก workspace",
        `ต้องการลบ ${item.user.fullName} ออกจาก workspace นี้หรือไม่? บัญชีผู้ใช้จะยังอยู่และไม่ได้ถูกยกเลิก`,
      );
      if (!confirmed) return;
      showLoading("กำลังลบผู้ใช้ออกจาก workspace");
      const result = await deleteWorkspaceUserAction(item.id);
      closeLoading();
      if (result.success) {
        await showSuccess(result.message ?? "ลบผู้ใช้ออกจาก workspace แล้ว");
        router.refresh();
      } else await showError(result.message);
    });
  }

  return (
    <>
      <div className="grid gap-3">
        {users.map((item) => {
          const adminCannotManageOwner = actorRole === "ADMIN" && item.role === "OWNER";
          const isActive = item.status === "ACTIVE";
          return (
            <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div>
                <p className="font-semibold text-slate-950">{item.user.fullName}</p>
                <p className="text-sm text-slate-500">{item.user.username} • {roleLabels[item.role as keyof typeof roleLabels]}</p>
                {item.user.email ? <p className="text-sm text-slate-500">{item.user.email}</p> : null}
                {item.user.status !== "ACTIVE" ? <p className="mt-1 text-xs font-medium text-red-600">บัญชีผู้ใช้ถูกปิดระดับบัญชี</p> : null}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={item.status} />
                <Button
                  type="button"
                  variant="secondary"
                  className="gap-2"
                  disabled={pending || !isActive || adminCannotManageOwner}
                  onClick={() => {
                    setEditing(item);
                    setRole(item.role);
                  }}
                >
                  <Edit3 size={16} />เปลี่ยน role
                </Button>
                {isActive ? (
                  <Button type="button" variant="secondary" className="gap-2" disabled={pending || adminCannotManageOwner} onClick={() => disableUser(item)}>
                    <UserX size={16} />ปิดใช้งาน
                  </Button>
                ) : (
                  <Button type="button" variant="secondary" className="gap-2" disabled={pending || adminCannotManageOwner || item.user.status !== "ACTIVE"} onClick={() => enableUser(item)}>
                    <UserCheck size={16} />เปิดใช้งาน
                  </Button>
                )}
                <Button type="button" variant="danger" className="gap-2" disabled={pending || adminCannotManageOwner} onClick={() => deleteUser(item)}>
                  <Trash2 size={16} />ลบออก
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      <Modal title="เปลี่ยนสิทธิ์ผู้ใช้" open={!!editing} onClose={() => setEditing(null)}>
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
              } else await showError(result.message);
            });
          }}
        >
          <p className="text-sm text-slate-500">{editing?.user.fullName} จะมีสิทธิ์ใน workspace ปัจจุบันตาม role ที่เลือก</p>
          <Select label="Role" value={role} onChange={(event) => setRole(event.target.value)} options={visibleRoleOptions} />
          <Button disabled={pending}>บันทึก role</Button>
        </form>
      </Modal>
    </>
  );
}
