"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { UserPlus } from "lucide-react";
import { registerAction } from "@/features/auth/actions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { closeLoading, showError, showLoading, showSuccess } from "@/lib/swal";

export function RegisterForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({
    username: "",
    password: "",
    confirmPassword: "",
    fullName: "",
    workspaceName: "",
    workspaceDescription: "",
  });

  const set = (key: keyof typeof form, value: string) => setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <form
      className="grid gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        startTransition(async () => {
          showLoading("กำลังสมัครสมาชิก");
          const result = await registerAction(form);
          closeLoading();
          if (result.success) {
            await showSuccess(result.message ?? "สมัครสมาชิกสำเร็จ");
            router.push("/dashboard");
            router.refresh();
          } else await showError(result.message);
        });
      }}
    >
      <Input label="Username" value={form.username} onChange={(event) => set("username", event.target.value)} autoComplete="username" />
      <Input label="ชื่อผู้ใช้" value={form.fullName} onChange={(event) => set("fullName", event.target.value)} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Input label="Password" type="password" value={form.password} onChange={(event) => set("password", event.target.value)} autoComplete="new-password" />
        <Input label="ยืนยัน Password" type="password" value={form.confirmPassword} onChange={(event) => set("confirmPassword", event.target.value)} autoComplete="new-password" />
      </div>
      <Input label="ชื่อ Workspace แรก" value={form.workspaceName} onChange={(event) => set("workspaceName", event.target.value)} placeholder="เช่น ห้อง ม.6/1" />
      <Input label="รายละเอียด Workspace" value={form.workspaceDescription} onChange={(event) => set("workspaceDescription", event.target.value)} />
      <p className="rounded-2xl bg-blue-50 p-3 text-xs leading-5 text-blue-800">
        ระบบจะกำหนดให้คุณเป็น OWNER ของ workspace แรกอัตโนมัติ เพื่อให้เริ่มจัดการห้องได้ครบและปลอดภัย
      </p>
      <Button disabled={pending} className="w-full gap-2">
        <UserPlus size={18} />สมัครสมาชิก
      </Button>
      <p className="text-center text-sm text-slate-500">
        มีบัญชีแล้ว? <Link href="/login" className="font-bold text-blue-700">เข้าสู่ระบบ</Link>
      </p>
    </form>
  );
}
