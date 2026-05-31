import Image from "next/image";
import { RegisterForm } from "@/features/auth/components/RegisterForm";
import { getSafeRedirectPath } from "@/lib/redirect";

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ redirect?: string | string[] }> }) {
  const { redirect } = await searchParams;
  const redirectTo = getSafeRedirectPath(redirect, "/workspaces");

  return (
    <main className="app-grid-bg grid min-h-dvh place-items-center px-4 py-8">
      <section className="w-full max-w-xl rounded-[2rem] bg-white p-6 shadow-xl shadow-blue-950/10">
        <div className="mb-8 text-center">
          <Image
            src="/images/school-saver-logo.webp"
            alt="SchoolSaver"
            width={72}
            height={72}
            className="mx-auto mb-4 size-18 rounded-3xl object-contain"
            priority
          />
          <h1 className="text-3xl font-black text-blue-700">สมัครสมาชิก</h1>
          <p className="mt-2 text-lg font-semibold text-slate-800">สร้างบัญชี SchoolSaver</p>
          <p className="mt-1 text-sm text-slate-500">หลังสมัครแล้วให้สร้าง workspace หรือขอเข้า workspace จากผู้ดูแล</p>
        </div>
        <RegisterForm redirectTo={redirectTo} />
      </section>
    </main>
  );
}
