"use client";

import { useState, useTransition } from "react";
import { KeyRound } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PasswordStrengthMeter } from "@/components/shared/PasswordStrengthMeter";
import { changeMyPasswordAction } from "@/features/users/actions";
import { closeLoading, showError, showLoading, showSuccess } from "@/lib/swal";

export function ChangePasswordForm() {
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });

  return (
    <form
      className="grid gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        startTransition(async () => {
          showLoading("กำลังเปลี่ยนรหัสผ่าน");
          const result = await changeMyPasswordAction(form);
          closeLoading();
          if (result.success) {
            await showSuccess(result.message ?? "เปลี่ยนรหัสผ่านแล้ว");
            setForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
          } else await showError(result.message);
        });
      }}
    >
      <Input label="รหัสผ่านเดิม" type="password" value={form.currentPassword} onChange={(event) => setForm({ ...form, currentPassword: event.target.value })} />
      <Input label="รหัสผ่านใหม่" type="password" value={form.newPassword} onChange={(event) => setForm({ ...form, newPassword: event.target.value })} />
      <PasswordStrengthMeter password={form.newPassword} />
      <Input label="ยืนยันรหัสผ่านใหม่" type="password" value={form.confirmPassword} onChange={(event) => setForm({ ...form, confirmPassword: event.target.value })} />
      <Button disabled={pending} className="gap-2">
        <KeyRound size={18} />เปลี่ยนรหัสผ่าน
      </Button>
    </form>
  );
}
