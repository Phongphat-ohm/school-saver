"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Building2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { deleteCurrentWorkspaceAction, updateCurrentWorkspaceAction } from "@/features/workspace/actions";
import { closeLoading, showConfirm, showError, showLoading, showSuccess } from "@/lib/swal";

export function WorkspaceSettingsForm({ workspace }: { workspace: { name: string; description: string | null; role?: string } }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({ name: workspace.name, description: workspace.description ?? "" });
  const [deleteForm, setDeleteForm] = useState({ confirmName: "", password: "" });
  const canDeleteWorkspace = workspace.role === "OWNER";
  const canSubmitDelete = deleteForm.confirmName === workspace.name && deleteForm.password.length > 0;

  return (
    <div className="grid gap-4">
      <form
        className="grid gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          startTransition(async () => {
            showLoading("กำลังแก้ไข workspace");
            const result = await updateCurrentWorkspaceAction(form);
            closeLoading();
            if (result.success) {
              await showSuccess(result.message ?? "แก้ไข workspace แล้ว");
              router.refresh();
            } else {
              await showError(result.message);
            }
          });
        }}
      >
        <Input label="ชื่อ workspace" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
        <Input label="รายละเอียด" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
        <Button disabled={pending} className="gap-2">
          <Building2 size={18} />
          บันทึก workspace
        </Button>
      </form>

      {canDeleteWorkspace ? (
        <div className="grid gap-4 rounded-2xl border border-rose-200 bg-rose-50 p-4">
          <div>
            <h4 className="font-bold text-rose-950">ลบ workspace นี้</h4>
            <p className="mt-1 text-sm leading-6 text-rose-700">
              ลบได้เฉพาะเจ้าของ workspace เท่านั้น ต้องพิมพ์ชื่อ workspace ให้ตรงและกรอกรหัสผ่านปัจจุบันก่อนยืนยัน การลบจะลบสมาชิก รอบเก็บเงิน รายการชำระ วิธีชำระ และคำเชิญทั้งหมดของ workspace นี้
            </p>
          </div>
          <div className="grid gap-3">
            <Input
              label={`พิมพ์ชื่อ workspace เพื่อยืนยัน (${workspace.name})`}
              value={deleteForm.confirmName}
              onChange={(event) => setDeleteForm({ ...deleteForm, confirmName: event.target.value })}
              autoComplete="off"
            />
            <Input
              label="รหัสผ่านปัจจุบัน"
              type="password"
              value={deleteForm.password}
              onChange={(event) => setDeleteForm({ ...deleteForm, password: event.target.value })}
              autoComplete="current-password"
            />
            <Button
              type="button"
              variant="danger"
              className="w-full gap-2"
              disabled={pending || !canSubmitDelete}
              onClick={() => {
                startTransition(async () => {
                  const confirmed = await showConfirm("ลบ workspace", `ยืนยันลบ workspace "${workspace.name}" แบบถาวรหรือไม่?`);
                  if (!confirmed) return;
                  showLoading("กำลังลบ workspace");
                  const result = await deleteCurrentWorkspaceAction(deleteForm);
                  closeLoading();
                  if (result.success) {
                    await showSuccess(result.message ?? "ลบ workspace แล้ว");
                    setDeleteForm({ confirmName: "", password: "" });
                    router.push("/workspaces");
                    router.refresh();
                  } else {
                    await showError(result.message);
                  }
                });
              }}
            >
              <Trash2 size={18} />
              ลบ workspace
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
