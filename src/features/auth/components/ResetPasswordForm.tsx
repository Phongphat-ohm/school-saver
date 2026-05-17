"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { KeyRound } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PasswordStrengthMeter } from "@/components/shared/PasswordStrengthMeter";
import { resetPasswordWithTokenAction } from "@/features/auth/actions";
import type { PasswordResetTokenStatus } from "@/lib/password-reset";
import { closeLoading, showError, showLoading, showSuccess } from "@/lib/swal";

const tokenStatusContent: Record<Exclude<PasswordResetTokenStatus, "valid">, { title: string; message: string }> = {
  used: {
    title: "ลิงก์นี้ถูกใช้งานแล้ว",
    message: "ลิงก์เปลี่ยนรหัสผ่านนี้ถูกใช้งานไปแล้ว หากต้องการเปลี่ยนรหัสผ่านอีกครั้ง กรุณาขอลิงก์ใหม่",
  },
  expired: {
    title: "ลิงก์นี้หมดอายุแล้ว",
    message: "ลิงก์เปลี่ยนรหัสผ่านมีเวลาจำกัด กรุณาขอลิงก์ใหม่เพื่อดำเนินการต่อ",
  },
  invalid: {
    title: "ลิงก์ไม่ถูกต้อง",
    message: "ไม่พบลิงก์เปลี่ยนรหัสผ่านนี้ในระบบ กรุณาตรวจสอบลิงก์หรือขอลิงก์ใหม่",
  },
};

export function ResetPasswordForm({ token, tokenStatus }: { token: string; tokenStatus: PasswordResetTokenStatus }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  if (tokenStatus !== "valid") {
    const content = tokenStatusContent[tokenStatus];
    return (
      <div className="grid gap-4">
        <div className="rounded-2xl bg-red-50 p-4 text-sm leading-6 text-red-800">
          <p className="font-bold">{content.title}</p>
          <p className="mt-1">{content.message}</p>
        </div>
        <Link
          href="/forgot-password"
          className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
        >
          ขอลิงก์เปลี่ยนรหัสผ่านใหม่
        </Link>
        <p className="text-center text-sm text-slate-500">
          กลับไปหน้า{" "}
          <Link href="/login" className="font-bold text-blue-700">
            เข้าสู่ระบบ
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      <form
        className="grid gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          startTransition(async () => {
            showLoading("กำลังเปลี่ยนรหัสผ่าน");
            const result = await resetPasswordWithTokenAction({ token, password, confirmPassword });
            closeLoading();
            if (result.success) {
              await showSuccess(result.message ?? "เปลี่ยนรหัสผ่านแล้ว");
              router.push("/login");
              router.refresh();
            } else await showError(result.message);
          });
        }}
      >
        <Input label="รหัสผ่านใหม่" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" />
        <PasswordStrengthMeter password={password} />
        <Input label="ยืนยันรหัสผ่านใหม่" type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" />
        <Button disabled={pending || password.length < 6 || confirmPassword.length === 0} className="w-full gap-2">
          <KeyRound size={18} />
          เปลี่ยนรหัสผ่าน
        </Button>
      </form>
      <p className="text-center text-sm text-slate-500">
        กลับไปหน้า{" "}
        <Link href="/login" className="font-bold text-blue-700">
          เข้าสู่ระบบ
        </Link>
      </p>
    </div>
  );
}
