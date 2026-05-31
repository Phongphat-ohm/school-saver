"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MailCheck, Send, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { OtpInput } from "@/components/ui/OtpInput";
import { PasswordStrengthMeter } from "@/components/shared/PasswordStrengthMeter";
import { registerAction, sendRegisteredEmailVerificationOtpAction, verifyRegisteredEmailOtpAction } from "@/features/auth/actions";
import { closeLoading, showError, showLoading, showSuccess } from "@/lib/swal";

export function RegisterForm({ redirectTo = "/workspaces" }: { redirectTo?: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [verificationEmail, setVerificationEmail] = useState<string | null>(null);
  const [otpSent, setOtpSent] = useState(false);
  const [retryAfterSeconds, setRetryAfterSeconds] = useState(0);
  const [code, setCode] = useState("");
  const [form, setForm] = useState({
    fullName: "",
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    acceptTerms: false,
    acceptPrivacy: false,
  });

  const set = (key: keyof typeof form, value: string | boolean) => setForm((prev) => ({ ...prev, [key]: value }));
  const canRequestOtp = !pending && retryAfterSeconds <= 0;

  useEffect(() => {
    if (retryAfterSeconds <= 0) return;
    const timer = window.setInterval(() => {
      setRetryAfterSeconds((seconds) => Math.max(0, seconds - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [retryAfterSeconds]);

  const retryLabel = retryAfterSeconds >= 60 ? `${Math.ceil(retryAfterSeconds / 60)} นาที` : `${retryAfterSeconds} วินาที`;

  if (verificationEmail) {
    return (
      <div className="grid gap-4">
        <div className="rounded-2xl bg-blue-50 p-4 text-sm leading-6 text-blue-800">
          {otpSent
            ? `ส่งรหัส OTP ไปที่ ${verificationEmail} แล้ว กรุณากรอกรหัสเพื่อยืนยันอีเมลและเริ่มใช้งานต่อ`
            : `สมัครสมาชิกด้วย ${verificationEmail} สำเร็จแล้ว กรุณากดส่งรหัส OTP เพื่อยืนยันอีเมล`}
        </div>
        <form
          className="grid gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            startTransition(async () => {
              showLoading("กำลังยืนยันอีเมล");
              const result = await verifyRegisteredEmailOtpAction({ code });
              closeLoading();
              if (result.success) {
                await showSuccess(result.message ?? "ยืนยันอีเมลแล้ว");
                router.push(redirectTo);
                router.refresh();
              } else await showError(result.message);
            });
          }}
        >
          <OtpInput label="รหัส OTP 6 หลัก" value={code} disabled={pending} onChange={setCode} />
          <Button disabled={pending || code.length !== 6} className="w-full gap-2">
            <MailCheck size={18} />
            ยืนยันอีเมล
          </Button>
        </form>
        <Button
          type="button"
          variant="secondary"
          disabled={!canRequestOtp}
          className="w-full gap-2"
          onClick={() => {
            startTransition(async () => {
              showLoading("กำลังส่งรหัส OTP");
              const result = await sendRegisteredEmailVerificationOtpAction();
              closeLoading();
              if (result.success) {
                setOtpSent(true);
                setRetryAfterSeconds(result.data.retryAfterSeconds);
                await showSuccess(result.message ?? "ส่งรหัส OTP แล้ว");
              } else {
                if (result.retryAfterSeconds) setRetryAfterSeconds(result.retryAfterSeconds);
                await showError(result.message);
              }
            });
          }}
        >
          <Send size={18} />
          {retryAfterSeconds > 0 ? `ขอ OTP ใหม่ได้ใน ${retryLabel}` : "ขอ OTP ใหม่"}
        </Button>
      </div>
    );
  }

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
            if (result.data.user.email && !result.data.user.emailVerifiedAt) {
              setVerificationEmail(result.data.user.email);
              setOtpSent(result.data.emailVerificationOtpSent);
              setRetryAfterSeconds(result.data.emailVerificationRetryAfterSeconds);
              setCode("");
            } else {
              router.push(redirectTo);
              router.refresh();
            }
          } else await showError(result.message);
        });
      }}
    >
      <Input label="ชื่อ" value={form.fullName} onChange={(event) => set("fullName", event.target.value)} autoComplete="name" />
      <Input label="ชื่อผู้ใช้" value={form.username} onChange={(event) => set("username", event.target.value)} autoComplete="username" />
      <Input label="อีเมล (ไม่บังคับ)" type="email" value={form.email} onChange={(event) => set("email", event.target.value)} autoComplete="email" />
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
        มีบัญชีแล้ว? <Link href={`/login?redirect=${encodeURIComponent(redirectTo)}`} className="font-bold text-blue-700">เข้าสู่ระบบ</Link>
      </p>
    </form>
  );
}
