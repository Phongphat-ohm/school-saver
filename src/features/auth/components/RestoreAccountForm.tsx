"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MailCheck, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { restoreCancelledAccountAction, verifyRestoreAccountOtpAction } from "@/features/users/actions";
import { closeLoading, showError, showLoading, showSuccess } from "@/lib/swal";

export function RestoreAccountForm({ username }: { username: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);

  function requestOtp() {
    startTransition(async () => {
      showLoading("กำลังส่งรหัส OTP");
      const result = await restoreCancelledAccountAction({ username, email });
      closeLoading();
      if (!result.success) {
        if (result.redirectTo) router.push(result.redirectTo);
        else await showError(result.message);
        return;
      }
      setOtpSent(true);
      await showSuccess(result.message ?? "ส่งรหัส OTP ไปที่อีเมลแล้ว");
    });
  }

  function verifyOtp() {
    startTransition(async () => {
      showLoading("กำลังกู้คืนบัญชี");
      const result = await verifyRestoreAccountOtpAction({ code });
      closeLoading();
      if (!result.success) {
        if (result.redirectTo) router.push(result.redirectTo);
        else await showError(result.message);
        return;
      }
      await showSuccess(result.message ?? "กู้คืนบัญชีสำเร็จ");
      router.push("/login");
      router.refresh();
    });
  }

  return (
    <form
      className="grid gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (otpSent) verifyOtp();
        else requestOtp();
      }}
    >
      <p className="rounded-2xl bg-blue-50 p-3 text-sm leading-6 text-blue-800">
        หน้านี้เปิดได้เฉพาะหลังเข้าสู่ระบบด้วยบัญชีที่ถูกยกเลิกแล้วเท่านั้น ระบบจะใช้ชื่อผู้ใช้จากการเข้าสู่ระบบและให้ยืนยันอีเมลเพื่อรับ OTP สำหรับกู้คืน
      </p>
      <Input label="ชื่อผู้ใช้" value={username} disabled autoComplete="username" autoCapitalize="none" autoCorrect="off" />
      <Input label="อีเมล" type="email" value={email} onChange={(event) => setEmail(event.target.value)} disabled={otpSent || pending} autoComplete="email" />
      {otpSent ? <Input label="รหัส OTP 6 หลัก" value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} disabled={pending} inputMode="numeric" /> : null}
      <Button disabled={pending || !email.trim() || (otpSent && code.length !== 6)} className="w-full gap-2">
        {otpSent ? <RotateCcw size={18} /> : <MailCheck size={18} />}
        {pending ? "กำลังดำเนินการ..." : otpSent ? "ยืนยัน OTP และกู้คืนบัญชี" : "ส่งรหัส OTP"}
      </Button>
      {otpSent ? (
        <Button
          type="button"
          variant="secondary"
          disabled={pending}
          onClick={() => {
            setOtpSent(false);
            setCode("");
          }}
        >
          แก้ไขอีเมล
        </Button>
      ) : null}
    </form>
  );
}
