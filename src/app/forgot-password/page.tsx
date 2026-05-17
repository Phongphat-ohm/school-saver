import Image from "next/image";
import { ForgotPasswordForm } from "@/features/auth/components/ForgotPasswordForm";

export default function ForgotPasswordPage() {
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
          <h1 className="text-3xl font-black text-blue-700">ลืมรหัสผ่าน</h1>
          <p className="mt-2 text-lg font-semibold text-slate-800">รับลิงก์ตั้งรหัสผ่านใหม่</p>
          <p className="mt-1 text-sm text-slate-500">กรอกอีเมลที่ผูกกับบัญชี SchoolSaver ของคุณ</p>
        </div>
        <ForgotPasswordForm />
      </section>
    </main>
  );
}
