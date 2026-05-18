"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Building2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { deleteCurrentWorkspaceAction, updateCurrentWorkspaceAction } from "@/features/workspace/actions";
import { closeLoading, showConfirm, showError, showLoading, showSuccess, showTextInputConfirm } from "@/lib/swal";

export function WorkspaceSettingsForm({ workspace }: { workspace: { name: string; description: string | null; role?: string } }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({ name: workspace.name, description: workspace.description ?? "" });
  const canDeleteWorkspace = workspace.role === "OWNER";

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
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h4 className="font-bold text-rose-950">ลบ workspace นี้</h4>
              <p className="mt-1 text-sm leading-6 text-rose-700">การลบจะลบสมาชิก รอบเก็บเงิน รายการชำระ วิธีชำระ และคำเชิญทั้งหมดของ workspace นี้</p>
            </div>
            <Button
              type="button"
              variant="danger"
              className="gap-2"
              disabled={pending}
              onClick={() => {
                startTransition(async () => {
                  const typedName = await showTextInputConfirm({
                    title: "ยืนยันการลบ workspace",
                    text: `พิมพ์ชื่อ workspace "${workspace.name}" เพื่อยืนยันการลบ`,
                    placeholder: workspace.name,
                    confirmButtonText: "ยืนยันการลบ",
                  });
                  if (typedName === null) return;
                  if (typedName !== workspace.name) {
                    await showError("ชื่อ workspace ไม่ตรงกัน");
                    return;
                  }
                  if (!(await showConfirm("ลบ workspace", "ยืนยันลบ workspace นี้แบบถาวรหรือไม่?"))) return;
                  showLoading("กำลังลบ workspace");
                  const result = await deleteCurrentWorkspaceAction();
                  closeLoading();
                  if (result.success) {
                    await showSuccess(result.message ?? "ลบ workspace แล้ว");
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
