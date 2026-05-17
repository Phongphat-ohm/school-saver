"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Mail } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { requestPasswordResetAction } from "@/features/auth/actions";
import { closeLoading, showError, showLoading, showSuccess } from "@/lib/swal";

export function ForgotPasswordForm() {
  const [pending, startTransition] = useTransition();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  return (
    <div className="grid gap-4">
      {sent ? (
        <div className="rounded-2xl bg-blue-50 p-4 text-sm leading-6 text-blue-800">
          หากอีเมลนี้อยู่ในระบบ เราส่งลิงก์เปลี่ยนรหัสผ่านไปให้แล้ว กรุณาตรวจสอบกล่องจดหมายของคุณ
        </div>
      ) : null}
      <form
        className="grid gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          startTransition(async () => {
            showLoading("กำลังส่งลิงก์เปลี่ยนรหัสผ่าน");
            const result = await requestPasswordResetAction({ email });
            closeLoading();
            if (result.success) {
              setSent(true);
              await showSuccess(result.message ?? "ส่งลิงก์เปลี่ยนรหัสผ่านแล้ว");
            } else await showError(result.message);
          });
        }}
      >
        <Input label="อีเมล" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" />
        <Button disabled={pending || sent || !email.trim()} className="w-full gap-2">
          <Mail size={18} />
          {sent ? "ส่งคำขอแล้ว" : "ส่งลิงก์เปลี่ยนรหัสผ่าน"}
        </Button>
      </form>
      <p className="text-center text-sm text-slate-500">
        จำรหัสผ่านได้แล้ว?{" "}
        <Link href="/login" className="font-bold text-blue-700">
          เข้าสู่ระบบ
        </Link>
      </p>
    </div>
  );
}
