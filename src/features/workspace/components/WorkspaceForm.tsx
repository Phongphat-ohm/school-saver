"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import { createWorkspaceAction } from "@/features/workspace/actions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { showError, showLoading, showSuccess, closeLoading } from "@/lib/swal";

export function WorkspaceForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  function resetForm() {
    setName("");
    setDescription("");
  }

  return (
    <>
      <Button type="button" className="w-full gap-2 sm:w-auto" onClick={() => setOpen(true)}>
        <Plus size={18} />
        สร้าง workspace ใหม่
      </Button>

      <Modal title="สร้าง workspace ใหม่" open={open} onClose={() => setOpen(false)}>
        <form
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            startTransition(async () => {
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
            });
          }}
        >
          <div className="grid gap-3">
            <Input label="ชื่อ workspace" value={name} onChange={(event) => setName(event.target.value)} placeholder="เช่น ห้อง 6/8" />
            <Input label="รายละเอียด" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="รายละเอียดเพิ่มเติม" />
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <Button type="button" variant="secondary" className="gap-2" onClick={() => setOpen(false)}>
              <X size={16} />
              ยกเลิก
            </Button>
            <Button disabled={pending} className="gap-2">
              <Plus size={16} />
              สร้าง workspace
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
