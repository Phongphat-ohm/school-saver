import Image from "next/image";
import { ResetPasswordForm } from "@/features/auth/components/ResetPasswordForm";
import { getPasswordResetTokenStatus } from "@/lib/password-reset";

export default async function ResetPasswordPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const tokenStatus = await getPasswordResetTokenStatus(token);

  return (
    <main className="app-grid-bg grid min-h-dvh place-items-center px-4 py-8">
      <section className="w-full max-w-md rounded-4xl bg-white p-6 shadow-xl shadow-blue-950/10">
        <div className="mb-8 text-center">
          <Image
            src="/images/school-saver-logo.webp"
            alt="SchoolSaver"
            width={72}
            height={72}
            className="mx-auto mb-4 size-18 rounded-3xl object-contain"
            priority
          />
          <h1 className="text-3xl font-black text-blue-700">เปลี่ยนรหัสผ่าน</h1>
          <p className="mt-2 text-lg font-semibold text-slate-800">ตั้งรหัสผ่านใหม่</p>
          <p className="mt-1 text-sm text-slate-500">ลิงก์นี้ใช้ได้ครั้งเดียวและมีเวลาจำกัด</p>
        </div>
        <ResetPasswordForm token={token} tokenStatus={tokenStatus} />
      </section>
    </main>
  );
}
