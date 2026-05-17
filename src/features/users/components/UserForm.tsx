"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UserPlus } from "lucide-react";
import type { WorkspaceRole } from "@/generated/prisma/client";
import { roleOptions } from "@/constants/roles";
import { createUserAndAddToWorkspaceAction } from "@/features/users/actions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { showError, showLoading, showSuccess, closeLoading } from "@/lib/swal";

export function UserForm({ actorRole }: { actorRole?: WorkspaceRole | null }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({ username: "", password: "", fullName: "", email: "", role: "VIEWER" });
  const visibleRoleOptions = actorRole === "ADMIN" ? roleOptions.filter((option) => option.value !== "OWNER") : roleOptions;
  const set = (key: keyof typeof form, value: string) => setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <form
      className="grid gap-3 md:grid-cols-2"
      onSubmit={(event) => {
        event.preventDefault();
        startTransition(async () => {
          showLoading();
          const result = await createUserAndAddToWorkspaceAction(form);
          closeLoading();
          if (result.success) {
            await showSuccess(result.message ?? "สำเร็จ");
            router.refresh();
          } else await showError(result.message);
        });
      }}
    >
      <Input label="Username" value={form.username} onChange={(event) => set("username", event.target.value)} />
      <Input label="Password" type="password" value={form.password} onChange={(event) => set("password", event.target.value)} />
      <Input label="ชื่อผู้ใช้" value={form.fullName} onChange={(event) => set("fullName", event.target.value)} />
      <Input label="อีเมล (ไม่บังคับ)" type="email" value={form.email} onChange={(event) => set("email", event.target.value)} />
      <Select label="Role" value={form.role} onChange={(event) => set("role", event.target.value)} options={visibleRoleOptions} />
      <Button disabled={pending} className="gap-2">
        <UserPlus size={18} />เพิ่มผู้ใช้
      </Button>
    </form>
  );
}
