"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import { createWorkspaceAction } from "@/features/workspace/actions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { useActionLock } from "@/hooks/useActionLock";
import { showError, showLoading, showSuccess, closeLoading } from "@/lib/swal";

export function WorkspaceForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const actionLock = useActionLock();
  const isSubmitting = pending || actionLock.locked;
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  function resetForm() {
    setName("");
    setDescription("");
  }

  return (
    <>
      <Button type="button" className="w-full gap-2 sm:w-auto" disabled={isSubmitting} onClick={() => setOpen(true)}>
        <Plus size={18} />
        สร้าง workspace ใหม่
      </Button>

      <Modal title="สร้าง workspace ใหม่" open={open} onClose={() => (isSubmitting ? undefined : setOpen(false))}>
        <form
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (!actionLock.acquire()) return;
            startTransition(async () => {
              try {
                showLoading("กำลังสร้าง workspace");
                const result = await createWorkspaceAction({ name, description });
                closeLoading();
                if (result.success) {
                  await showSuccess(result.message ?? "สร้าง workspace สำเร็จ");
                  resetForm();
                  setOpen(false);
                  router.refresh();
                } else {
                  await showError(result.message);
                }
              } finally {
                closeLoading();
                actionLock.release();
              }
            });
          }}
        >
          <div className="grid gap-3">
            <Input label="ชื่อ workspace" value={name} disabled={isSubmitting} onChange={(event) => setName(event.target.value)} placeholder="เช่น ห้อง 6/8" />
            <Input label="รายละเอียด" value={description} disabled={isSubmitting} onChange={(event) => setDescription(event.target.value)} placeholder="รายละเอียดเพิ่มเติม" />
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <Button type="button" variant="secondary" className="gap-2" disabled={isSubmitting} onClick={() => setOpen(false)}>
              <X size={16} />
              ยกเลิก
            </Button>
            <Button disabled={isSubmitting} className="gap-2">
              <Plus size={16} />
              {isSubmitting ? "กำลังสร้าง..." : "สร้าง workspace"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
