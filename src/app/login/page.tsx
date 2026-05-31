import Image from "next/image";
import Link from "next/link";
import { LoginForm } from "@/features/auth/components/LoginForm";
import { getSafeRedirectPath } from "@/lib/redirect";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ redirect?: string | string[] }> }) {
  const { redirect } = await searchParams;
  const redirectTo = getSafeRedirectPath(redirect);
  const registerRedirectTo = getSafeRedirectPath(redirect, "");
  const registerHref = registerRedirectTo ? `/register?redirect=${encodeURIComponent(registerRedirectTo)}` : "/register";

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
          <h1 className="text-3xl font-black text-blue-700">SchoolSaver</h1>
          <p className="mt-2 text-lg font-semibold text-slate-800">ระบบเก็บเงินห้องอัจฉริยะ</p>
          <p className="mt-1 text-sm text-slate-500">เก็บเงินห้องง่ายขึ้น ตรวจสอบได้ทุกยอด</p>
        </div>
        <LoginForm redirectTo={redirectTo} />
        <div className="mt-5 grid gap-2 text-center text-sm">
          <Link href={registerHref} className="font-bold text-blue-700">สมัครสมาชิกใหม่</Link>
        </div>
      </section>
    </main>
  );
}
