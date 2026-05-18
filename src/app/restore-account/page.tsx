import Image from "next/image";
import { redirect } from "next/navigation";
import { RestoreAccountForm } from "@/features/auth/components/RestoreAccountForm";
import { getRestoreSession } from "@/lib/session";

export default async function RestoreAccountPage({ searchParams }: { searchParams: Promise<{ username?: string }> }) {
  const restoreSession = await getRestoreSession();
  if (!restoreSession) redirect("/login");
  const { username } = await searchParams;
  const restoreUsername = username?.trim();
  if (!restoreUsername) redirect("/login");

  return (
    <main className="app-grid-bg grid min-h-dvh place-items-center px-4 py-8">
      <section className="w-full max-w-md rounded-4xl bg-white p-6 shadow-xl shadow-blue-950/10">
        <div className="mb-8 text-center">
          <Image src="/images/school-saver-logo.webp" alt="SchoolSaver" width={72} height={72} className="mx-auto mb-4 size-18 rounded-3xl object-contain" priority />
          <h1 className="text-3xl font-black text-blue-700">กู้คืนบัญชี</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">สำหรับบัญชีที่ยกเลิกไปไม่เกิน 30 วัน</p>
        </div>
        <RestoreAccountForm username={restoreUsername} />
      </section>
    </main>
  );
}
