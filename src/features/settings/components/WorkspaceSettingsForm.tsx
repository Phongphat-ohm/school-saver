"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Building2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { updateCurrentWorkspaceAction } from "@/features/workspace/actions";
import { closeLoading, showError, showLoading, showSuccess } from "@/lib/swal";

export function WorkspaceSettingsForm({ workspace }: { workspace: { name: string; description: string | null } }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({ name: workspace.name, description: workspace.description ?? "" });

  return (
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
          } else await showError(result.message);
        });
      }}
    >
      <Input label="ชื่อ workspace" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
      <Input label="รายละเอียด" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
      <Button disabled={pending} className="gap-2">
        <Building2 size={18} />บันทึก workspace
      </Button>
    </form>
  );
}
