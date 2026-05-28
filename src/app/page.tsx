"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BarChart3, CheckCircle2, CircleDollarSign, QrCode, ShieldCheck, UsersRound, WalletCards } from "lucide-react";
import { ReactQRCode } from "@lglab/react-qr-code";

const features = [
  {
    title: "จัดการสมาชิกและรอบเก็บเงิน",
    description: "สร้างรอบ เลือกสมาชิก ยกเว้นบางคน หรือแก้ไขรายชื่อในรอบได้ตามสถานการณ์จริง",
    icon: UsersRound,
  },
  {
    title: "รับชำระพร้อม QR",
    description: "ค้นหาสมาชิกหรือสแกน QR เพื่อรับชำระ ลดเวลาหน้างานและลดความผิดพลาด",
    icon: QrCode,
  },
  {
    title: "ยอดค้างและรายงานชัดเจน",
    description: "เห็นยอดชำระ ยอดค้าง ค่าปรับ ประวัติ และส่งออกข้อมูลสำหรับตรวจสอบย้อนหลัง",
    icon: BarChart3,
  },
  {
    title: "ปลอดภัย ตรวจสอบได้",
    description: "แยกสิทธิ์ผู้ใช้ บันทึก activity log และช่วยให้ผู้ดูแลตรวจสอบเหตุการณ์สำคัญได้",
    icon: ShieldCheck,
  },
];

const stats = [
  ["รับแล้ว", "฿18,400", "text-emerald-700"],
  ["ยอดค้าง", "฿3,250", "text-rose-700"],
  ["สมาชิก", "42 คน", "text-blue-700"],
  ["ค่าปรับ", "฿120", "text-amber-700"],
];

const workflow = [
  "เพิ่มสมาชิกหรือ import จากไฟล์",
  "สร้างรอบและเลือกคนที่ต้องเก็บ",
  "รับชำระด้วยค้นหา/สแกน QR",
  "ดูยอดค้าง รายงาน และประวัติย้อนหลัง",
];

const checks = [
  "แยก workspace และกำหนด role ได้",
  "สมาชิกดูยอดผ่าน public member card ได้",
  "ผู้ดูแลตรวจ activity log และข้อมูลสำคัญได้",
];

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <header className="fixed inset-x-0 top-0 z-30 border-b border-slate-200/70 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <Link href="/" className="flex min-w-0 items-center gap-3">
            <Image src="/images/school-saver-logo.webp" alt="SchoolSaver" width={42} height={42} className="rounded-2xl" priority />
            <span className="truncate text-lg font-black">SchoolSaver</span>
          </Link>
          <nav className="flex shrink-0 items-center gap-2">
            <Link href="/login" className="rounded-xl px-3 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-100 sm:px-4">
              เข้าสู่ระบบ
            </Link>
            <Link href="/register" className="rounded-xl bg-blue-600 px-3 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 sm:px-4">
              สมัครใช้งาน
            </Link>
          </nav>
        </div>
      </header>

      <section className="relative overflow-hidden bg-slate-100 pt-24">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 pb-16 sm:px-6 sm:pb-20 lg:grid-cols-[minmax(0,1fr)_minmax(26rem,34rem)] lg:items-center lg:px-8 lg:pb-24 lg:pt-6">
          <div className="max-w-3xl">
            <p className="mb-5 inline-flex rounded-full border border-blue-100 bg-white px-4 py-2 text-sm font-black text-blue-700 shadow-sm">
              ระบบจัดการเงินเก็บสำหรับห้องเรียนและโรงเรียน
            </p>
            <h1 className="max-w-4xl text-4xl font-black leading-tight text-slate-950 sm:text-5xl lg:text-6xl">
              เก็บเงินห้อง จัดการยอดค้าง และตรวจสอบย้อนหลังได้ในที่เดียว
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-slate-600 sm:text-lg">
              SchoolSaver ช่วยให้ครูและผู้เก็บเงินสร้างรอบเก็บเงิน เลือกสมาชิก รับชำระผ่าน QR ดูประวัติ และควบคุมสิทธิ์ผู้ใช้ได้อย่างเป็นระบบ
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/register" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-blue-700">
                เริ่มใช้งาน
                <ArrowRight size={18} />
              </Link>
              <Link href="/login" className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-white px-5 py-3 text-sm font-black text-slate-900 shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-100">
                เข้าสู่ระบบ
              </Link>
            </div>
          </div>

          <div className="w-full">
            <div className="rounded-[2rem] border border-slate-200 bg-white p-4 shadow-xl shadow-slate-200/80 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-blue-600 text-white">
                    <WalletCards size={21} />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black">ห้อง ม.3/2 กองทุนห้องเรียน</p>
                    <p className="text-xs text-slate-500">รอบเก็บเงินเดือนนี้</p>
                  </div>
                </div>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">OPEN</span>
              </div>

              <div className="grid gap-3 py-4 sm:grid-cols-2">
                {stats.map(([label, value, color]) => (
                  <div className="rounded-2xl bg-slate-50 p-4" key={label}>
                    <p className="text-xs font-semibold text-slate-500">{label}</p>
                    <p className={`mt-2 text-2xl font-black ${color}`}>{value}</p>
                  </div>
                ))}
              </div>

              <div className="grid gap-4 lg:grid-cols-[1fr_0.82fr]">
                <div className="grid gap-2">
                  {[
                    ["ด.ช. ภูวดล", "รหัส 032", "จ่ายครบ", "bg-emerald-50 text-emerald-700"],
                    ["ด.ญ. ณิชา", "รหัส 044", "ค้างบางส่วน", "bg-amber-50 text-amber-700"],
                    ["ด.ช. กฤต", "รหัส 051", "ยังไม่ชำระ", "bg-rose-50 text-rose-700"],
                  ].map(([name, code, status, tone]) => (
                    <div className="flex items-center justify-between gap-3 rounded-2xl bg-white p-3 ring-1 ring-slate-100" key={code}>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold">{name}</p>
                        <p className="text-xs text-slate-500">{code}</p>
                      </div>
                      <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-black ${tone}`}>{status}</span>
                    </div>
                  ))}
                </div>
                <div className="rounded-2xl bg-slate-950 p-4 text-white">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <p className="font-black">สแกนรับชำระ</p>
                    <QrCode size={20} />
                  </div>
                  <div className="grid aspect-square place-items-center rounded-2xl bg-white p-4 text-slate-950">
                    <ReactQRCode value="https://schf.ppkxb.space" size={180} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.82fr_1.18fr] lg:items-start">
          <div className="max-w-2xl">
            <p className="text-sm font-black text-blue-700">ทำงานได้ครบตั้งแต่วันแรก</p>
            <h2 className="mt-3 text-3xl font-black leading-tight text-slate-950 sm:text-4xl">ออกแบบมาเพื่อการเก็บเงินที่เกิดขึ้นจริง</h2>
            <p className="mt-5 leading-8 text-slate-600">
              รองรับงานประจำของครู ผู้เก็บเงิน และผู้ดูแลระบบ ตั้งแต่การจัดสมาชิก สร้างรอบ รับชำระ ไปจนถึงรายงานและ audit ย้อนหลัง
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" key={feature.title}>
                  <div className="mb-4 grid size-11 place-items-center rounded-2xl bg-blue-50 text-blue-700">
                    <Icon size={22} />
                  </div>
                  <h3 className="font-black text-slate-950">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{feature.description}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1fr_0.9fr] lg:items-center">
          <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-start gap-4 border-b border-slate-100 pb-5">
              <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-emerald-50 text-emerald-700">
                <CircleDollarSign size={24} />
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-950">Workflow ที่ทีมใช้งานซ้ำได้ทุกเดือน</h2>
                <p className="mt-1 text-sm leading-6 text-slate-500">ลดขั้นตอนซ้ำ ๆ และลดความผิดพลาดจากการจดมือ</p>
              </div>
            </div>
            <div className="mt-5 grid gap-3">
              {workflow.map((item, index) => (
                <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3" key={item}>
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-blue-600 text-sm font-black text-white">{index + 1}</span>
                  <p className="font-semibold text-slate-800">{item}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="max-w-2xl">
            <h2 className="text-3xl font-black leading-tight text-slate-950 sm:text-4xl">พร้อมสำหรับห้องเรียนเล็กและหลาย workspace</h2>
            <div className="mt-6 grid gap-4">
              {checks.map((item) => (
                <div className="flex items-start gap-3" key={item}>
                  <CheckCircle2 className="mt-0.5 shrink-0 text-emerald-600" size={20} />
                  <p className="leading-7 text-slate-700">{item}</p>
                </div>
              ))}
            </div>
            <div className="mt-8">
              <Link href="/register" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:bg-slate-800">
                สร้างบัญชีเพื่อเริ่มจัดการ
                <ArrowRight size={18} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-slate-950 px-4 py-10 text-slate-200 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-8 md:grid-cols-[1.2fr_0.8fr] md:items-end">
          <div>
            <div className="flex items-center gap-3">
              <Image src="/images/school-saver-logo.webp" alt="SchoolSaver" width={40} height={40} className="rounded-2xl" />
              <span className="text-lg font-black text-white">SchoolSaver</span>
            </div>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300">
              ระบบจัดการเงินเก็บสำหรับห้องเรียนและโรงเรียน ช่วยดูแลงานสมาชิก รอบเก็บเงิน การรับชำระ และการตรวจสอบย้อนหลังให้อยู่ในที่เดียว
            </p>
          </div>
          <div className="grid gap-3 text-sm md:justify-items-end">
            <div className="flex flex-wrap gap-4 md:justify-end">
              <Link href="/login" className="text-slate-300 transition hover:text-white">เข้าสู่ระบบ</Link>
              <Link href="/register" className="text-slate-300 transition hover:text-white">สมัครใช้งาน</Link>
              <Link href="/help" className="text-slate-300 transition hover:text-white">ช่วยเหลือ</Link>
              <Link href="/contact" className="text-slate-300 transition hover:text-white">ติดต่อเรา</Link>
            </div>
            <p className="text-slate-400">เก็บเงินในห้องเรียนให้เป็นระบบมากขึ้น</p>
          </div>
        </div>
      </footer>
    </main>
  );
}
