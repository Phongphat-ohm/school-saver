"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, MailCheck, Send } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { OtpInput } from "@/components/ui/OtpInput";
import { sendMyEmailVerificationOtpAction, verifyMyEmailOtpAction } from "@/features/users/actions";
import { closeLoading, showError, showLoading, showSuccess } from "@/lib/swal";

export function EmailVerificationForm({ user }: { user: { email?: string | null; emailVerifiedAt?: Date | string | null } }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [code, setCode] = useState("");
  const [retryAfterSeconds, setRetryAfterSeconds] = useState(0);
  const hasEmail = !!user.email;
  const verified = !!user.emailVerifiedAt;
  const canRequestOtp = !pending && retryAfterSeconds <= 0;

  useEffect(() => {
    if (retryAfterSeconds <= 0) return;
    const timer = window.setInterval(() => {
      setRetryAfterSeconds((seconds) => Math.max(0, seconds - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [retryAfterSeconds]);

  const retryLabel = retryAfterSeconds >= 60 ? `${Math.ceil(retryAfterSeconds / 60)} นาที` : `${retryAfterSeconds} วินาที`;

  function sendOtp() {
    startTransition(async () => {
      showLoading("กำลังส่งรหัส OTP");
      const result = await sendMyEmailVerificationOtpAction();
      closeLoading();
      if (result.success) {
        setRetryAfterSeconds(result.data.retryAfterSeconds);
        await showSuccess(result.message ?? "ส่งรหัส OTP แล้ว");
      } else {
        if (result.retryAfterSeconds) setRetryAfterSeconds(result.retryAfterSeconds);
        await showError(result.message);
      }
    });
  }

  function verifyOtp() {
    startTransition(async () => {
      showLoading("กำลังยืนยันอีเมล");
      const result = await verifyMyEmailOtpAction({ code });
      closeLoading();
      if (result.success) {
        await showSuccess(result.message ?? "ยืนยันอีเมลแล้ว");
        setCode("");
        router.refresh();
      } else await showError(result.message);
    });
  }

  if (!hasEmail) {
    return (
      <div className="grid gap-3">
        <div className="rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">
          เพิ่มอีเมลในโปรไฟล์ก่อน แล้วจึงส่งรหัส OTP เพื่อยืนยันอีเมลได้
        </div>
        <Button type="button" variant="secondary" disabled className="gap-2">
          <MailCheck size={18} />
          ยังไม่มีอีเมล
        </Button>
      </div>
    );
  }

  if (verified) {
    return (
      <div className="grid gap-3">
        <div className="flex items-center gap-3 rounded-2xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">
          <CheckCircle2 size={20} />
          อีเมล {user.email} ยืนยันแล้ว
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      <div className="rounded-2xl bg-amber-50 p-4 text-sm leading-6 text-amber-800">อีเมล {user.email} ยังไม่ได้ยืนยัน</div>
      <Button type="button" variant="secondary" disabled={!canRequestOtp} className="gap-2" onClick={sendOtp}>
        <Send size={18} />
        {retryAfterSeconds > 0 ? `ขอ OTP ใหม่ได้ใน ${retryLabel}` : "ส่งรหัส OTP"}
      </Button>
      <form
        className="grid gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          verifyOtp();
        }}
      >
        <OtpInput
          label="รหัส OTP 6 หลัก"
          value={code}
          disabled={pending}
          onChange={setCode}
        />
        <Button disabled={pending || code.length !== 6} className="gap-2">
          <MailCheck size={18} />
          ยืนยันอีเมล
        </Button>
      </form>
    </div>
  );
}
