import Image from "next/image";
import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { legalUpdatedDate, hasAcceptedCurrentLegal } from "@/constants/legal";
import { LegalConsentForm } from "@/features/auth/components/LegalConsentForm";
import { requireUser } from "@/lib/auth";

export default async function LegalConsentPage() {
  const user = await requireUser({ requireLegal: false });
  if (hasAcceptedCurrentLegal(user)) redirect("/dashboard");

  return (
    <main className="app-grid-bg grid min-h-dvh place-items-center px-4 py-8">
      <section className="w-full max-w-2xl rounded-[2rem] bg-white p-6 shadow-xl shadow-blue-950/10">
        <div className="mb-6 flex items-center gap-3">
          <Image
            src="/images/school-saver-logo.webp"
            alt="SchoolSaver"
            width={56}
            height={56}
            className="size-14 rounded-2xl object-contain"
            priority
          />
          <div>
            <p className="text-sm font-bold text-blue-700">SchoolSaver</p>
            <h1 className="text-2xl font-black text-slate-950">ยืนยันเงื่อนไขและ PDPA</h1>
          </div>
        </div>

        <div className="mb-5 rounded-[1.5rem] bg-blue-50 p-5">
          <div className="mb-3 inline-flex size-11 items-center justify-center rounded-2xl bg-blue-600 text-white">
            <ShieldCheck size={22} />
          </div>
          <h2 className="text-lg font-black text-slate-950">ต้องยอมรับเอกสารล่าสุดก่อนใช้งาน</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            เพื่อให้การใช้งานสอดคล้องกับพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคลของไทย ระบบจะบันทึกวันเวลาและเวอร์ชันเอกสารที่คุณยอมรับไว้เป็นหลักฐาน
          </p>
          <p className="mt-2 text-xs font-semibold text-blue-700">ปรับปรุงล่าสุด: {legalUpdatedDate}</p>
        </div>

        <LegalConsentForm />
      </section>
    </main>
  );
}

