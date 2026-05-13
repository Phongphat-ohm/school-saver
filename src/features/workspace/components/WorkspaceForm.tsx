"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createWorkspaceAction } from "@/features/workspace/actions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { showError, showLoading, showSuccess, closeLoading } from "@/lib/swal";

export function WorkspaceForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  return (
    <form
      className="grid gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        startTransition(async () => {
          showLoading();
          const result = await createWorkspaceAction({ name, description });
          closeLoading();
          if (result.success) {
            await showSuccess(result.message ?? "สำเร็จ");
            setName("");
            setDescription("");
            router.refresh();
          } else {
            await showError(result.message);
          }
        });
      }}
    >
      <Input label="ชื่อ workspace" value={name} onChange={(event) => setName(event.target.value)} />
      <Input label="รายละเอียด" value={description} onChange={(event) => setDescription(event.target.value)} />
      <Button disabled={pending}>สร้าง workspace</Button>
    </form>
  );
}
