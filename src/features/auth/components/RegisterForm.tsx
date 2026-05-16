"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PasswordStrengthMeter } from "@/components/shared/PasswordStrengthMeter";
import { registerAction } from "@/features/auth/actions";
import { closeLoading, showError, showLoading, showSuccess } from "@/lib/swal";

export function RegisterForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({
    fullName: "",
    username: "",
    password: "",
    confirmPassword: "",
    acceptTerms: false,
    acceptPrivacy: false,
  });

  const set = (key: keyof typeof form, value: string | boolean) => setForm((prev) => ({ ...prev, [key]: value }));

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
            router.push("/workspaces");
            router.refresh();
          } else await showError(result.message);
        });
      }}
    >
      <Input label="ชื่อ" value={form.fullName} onChange={(event) => set("fullName", event.target.value)} autoComplete="name" />
      <Input label="ชื่อผู้ใช้" value={form.username} onChange={(event) => set("username", event.target.value)} autoComplete="username" />
      <Input label="รหัสผ่าน" type="password" value={form.password} onChange={(event) => set("password", event.target.value)} autoComplete="new-password" />
      <PasswordStrengthMeter password={form.password} />
      <Input label="ยืนยันรหัสผ่าน" type="password" value={form.confirmPassword} onChange={(event) => set("confirmPassword", event.target.value)} autoComplete="new-password" />
      <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-3 text-sm leading-6 text-slate-600">
        <input
          type="checkbox"
          checked={form.acceptTerms}
          onChange={(event) => set("acceptTerms", event.target.checked)}
          className="mt-1 size-4 accent-blue-600"
        />
        <span>
          ฉันได้อ่านและยอมรับ{" "}
          <Link href="/terms" target="_blank" className="font-bold text-blue-700 hover:underline">
            เงื่อนไขการให้บริการ
          </Link>{" "}
          ของ SchoolSaver
        </span>
      </label>
      <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-3 text-sm leading-6 text-slate-600">
        <input
          type="checkbox"
          checked={form.acceptPrivacy}
          onChange={(event) => set("acceptPrivacy", event.target.checked)}
          className="mt-1 size-4 accent-blue-600"
        />
        <span>
          ฉันรับทราบและยินยอมให้ SchoolSaver เก็บรวบรวม ใช้ และเปิดเผยข้อมูลส่วนบุคคลตาม{" "}
          <Link href="/privacy" target="_blank" className="font-bold text-blue-700 hover:underline">
            นโยบายคุ้มครองข้อมูลส่วนบุคคล
          </Link>
        </span>
      </label>
      <p className="rounded-2xl bg-blue-50 p-3 text-xs leading-5 text-blue-800">
        สมัครสมาชิกแล้วยังไม่มี workspace โดยอัตโนมัติ คุณสามารถสร้าง workspace เอง หรือขอเข้าร่วม workspace จากลิงก์/QR ที่ผู้ดูแลส่งให้
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
