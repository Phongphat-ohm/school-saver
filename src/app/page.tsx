import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BarChart3, CheckCircle2, CircleDollarSign, QrCode, ShieldCheck, UsersRound, WalletCards } from "lucide-react";

const featureCards = [
  {
    title: "จัดการสมาชิกและรอบเก็บเงิน",
    description: "สร้างรอบ เลือกสมาชิก เก็บเงิน ยกเว้น หรือแก้ไขสมาชิกในรอบได้ตามสถานการณ์จริง",
    icon: UsersRound,
  },
  {
    title: "รับชำระพร้อม QR",
    description: "ค้นหาหรือสแกน QR สมาชิกเพื่อรับชำระ ลดเวลาหน้างาน และกันการรับเงินจากสมาชิกที่ถูกลบ",
    icon: QrCode,
  },
  {
    title: "ยอดค้างและรายงานชัดเจน",
    description: "เห็นยอดค้าง ยอดชำระ ค่าปรับ ประวัติ และ export ข้อมูลสำหรับตรวจสอบย้อนหลัง",
    icon: BarChart3,
  },
  {
    title: "ปลอดภัยและตรวจสอบได้",
    description: "มี role, activity log, support audit และระบบตรวจสอบข้อมูลผิดปกติสำหรับผู้ดูแล",
    icon: ShieldCheck,
  },
];

const workflow = [
  "เพิ่มสมาชิกหรือ import จากไฟล์",
  "สร้างรอบและเลือกคนที่ต้องเก็บ",
  "รับชำระด้วยค้นหา/สแกน QR",
  "ดูยอดค้าง รายงาน และประวัติ",
];

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <header className="fixed inset-x-0 top-0 z-30 border-b border-white/50 bg-white/75 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4">
          <Link href="/" className="flex items-center gap-3">
          <Image src="/images/school-saver-logo.webp" alt="SchoolSaver" width={44} height={44} className="rounded-2xl" priority />
          <span className="text-lg font-black">SchoolSaver</span>
        </Link>
        <nav className="flex items-center gap-2">
          <Link href="/login" className="rounded-2xl px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-white">
            เข้าสู่ระบบ
          </Link>
          <Link href="/register" className="rounded-2xl bg-blue-600 px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700">
            สมัครใช้งาน
          </Link>
          </nav>
        </div>
      </header>
      <section className="relative isolate overflow-hidden bg-[#eef4fb] pt-20 md:pt-24">
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-x-0 top-0 h-24 bg-white/70" />
          <div className="absolute left-1/2 top-28 h-80 w-80 -translate-x-1/2 rounded-full bg-blue-200/50 blur-3xl md:h-[28rem] md:w-[28rem]" />
          <div className="absolute right-0 top-32 h-72 w-72 rounded-full bg-cyan-100/70 blur-3xl" />
        </div>

        <div className="mx-auto grid max-w-7xl gap-10 px-5 pb-12 pt-10 md:gap-12 md:pb-16 md:pt-14 lg:min-h-[calc(100vh-6rem)] lg:grid-cols-[minmax(0,1fr)_minmax(24rem,34rem)] lg:items-center">
          <div className="max-w-3xl">
            <p className="mb-4 inline-flex rounded-full bg-white px-4 py-2 text-sm font-black text-blue-700 shadow-sm">ระบบจัดการเงินเก็บสำหรับห้องเรียนและโรงเรียน</p>
            <h1 className="text-4xl font-black leading-tight text-slate-950 md:text-6xl">
              เก็บเงินห้อง จัดการยอดค้าง และตรวจสอบย้อนหลังได้ในที่เดียว
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-slate-700 md:text-lg">
              SchoolSaver ช่วยให้ผู้ดูแล workspace สร้างรอบเก็บเงิน เลือกสมาชิก รับชำระผ่าน QR ดูประวัติ และควบคุมสิทธิ์ผู้ใช้ได้เป็นระบบ
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/register" className="inline-flex min-h-12 items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-blue-700">
                เริ่มใช้งาน
                <ArrowRight size={18} />
              </Link>
              <Link href="/login" className="inline-flex min-h-12 items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-black text-slate-900 shadow-sm transition hover:bg-slate-100">
                เข้าสู่ระบบ
              </Link>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-xl lg:max-w-none">
            <div className="absolute inset-0 scale-[0.98] rounded-[2rem] bg-white/60 shadow-2xl shadow-slate-300/40 blur-[2px]" />
            <div className="relative grid gap-4 rounded-[2rem] border border-slate-200 bg-white p-4 shadow-xl shadow-slate-300/40">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-3">
                  <div className="grid size-10 place-items-center rounded-2xl bg-blue-600 text-white">
                    <WalletCards size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-black">ห้อง ม.3/2 กองทุนห้องเรียน</p>
                    <p className="text-xs text-slate-500">รอบเก็บเงินเดือนนี้</p>
                  </div>
                </div>
                <div className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">OPEN</div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {[
                  ["รับแล้ว", "฿18,400", "text-emerald-700"],
                  ["ยอดค้าง", "฿3,250", "text-rose-700"],
                  ["สมาชิก", "42 คน", "text-blue-700"],
                  ["ค่าปรับ", "฿120", "text-amber-700"],
                ].map(([label, value, color]) => (
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4" key={label}>
                    <p className="text-xs font-semibold text-slate-500">{label}</p>
                    <p className={`mt-2 text-xl font-black ${color}`}>{value}</p>
                  </div>
                ))}
              </div>
              <div className="grid gap-3 md:grid-cols-[1.1fr_0.9fr]">
                <div className="grid gap-2">
                  {[
                    ["ด.ช. ภูวดล", "รหัส 032", "จ่ายครบ", "success"],
                    ["ด.ญ. ณิชา", "รหัส 044", "ค้างบางส่วน", "warning"],
                    ["ด.ช. กฤต", "รหัส 051", "ถูกลบ", "danger"],
                  ].map(([name, code, status, tone]) => (
                    <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-white p-3" key={code}>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold">{name}</p>
                        <p className="text-xs text-slate-500">{code}</p>
                      </div>
                      <span
                        className={
                          tone === "success"
                            ? "shrink-0 rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700"
                            : tone === "warning"
                              ? "shrink-0 rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-700"
                              : "shrink-0 rounded-full bg-rose-50 px-3 py-1 text-xs font-black text-rose-700"
                        }
                      >
                        {status}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="rounded-2xl border border-slate-100 bg-slate-900 p-4 text-white">
                  <div className="mb-4 flex items-center justify-between">
                    <p className="font-black">สแกนรับชำระ</p>
                    <QrCode size={20} />
                  </div>
                  <div className="grid aspect-square place-items-center rounded-2xl bg-white text-slate-950">
                    <div className="grid size-28 grid-cols-4 gap-1">
                      {Array.from({ length: 16 }).map((_, index) => (
                        <span key={index} className={index % 3 === 0 || index === 5 || index === 10 ? "rounded-sm bg-slate-950" : "rounded-sm bg-slate-200"} />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white px-5 py-14">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.85fr_1.15fr]">
          <div>
            <p className="text-sm font-black text-blue-700">ทำงานได้ครบตั้งแต่วันแรก</p>
            <h2 className="mt-2 text-3xl font-black text-slate-950">ออกแบบมาเพื่อการเก็บเงินที่เกิดขึ้นจริง</h2>
            <p className="mt-4 leading-7 text-slate-600">
              รองรับทั้งงานประจำของครู ผู้เก็บเงิน และผู้ดูแลระบบ ตั้งแต่สมาชิกย้ายเข้า ย้ายออก ลบแล้วสร้างใหม่ ไปจนถึงการตรวจสอบ audit ภายหลัง
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {featureCards.map((feature) => {
              const Icon = feature.icon;
              return (
                <article className="rounded-2xl border border-slate-200 bg-slate-50 p-5" key={feature.title}>
                  <div className="mb-4 grid size-11 place-items-center rounded-2xl bg-white text-blue-700 shadow-sm">
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

      <section className="px-5 py-14">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[1fr_0.9fr]">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="grid size-11 place-items-center rounded-2xl bg-emerald-50 text-emerald-700">
                <CircleDollarSign size={22} />
              </div>
              <div>
                <h2 className="font-black text-slate-950">Workflow ที่ทีมใช้งานซ้ำได้ทุกเดือน</h2>
                <p className="text-sm text-slate-500">ลดขั้นตอนซ้ำ ๆ และลดความผิดพลาดจากการจดมือ</p>
              </div>
            </div>
            <div className="mt-5 grid gap-3">
              {workflow.map((item, index) => (
                <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3" key={item}>
                  <span className="grid size-9 place-items-center rounded-full bg-blue-600 text-sm font-black text-white">{index + 1}</span>
                  <p className="font-semibold text-slate-800">{item}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="grid content-center gap-4">
            <h2 className="text-3xl font-black text-slate-950">พร้อมสำหรับห้องเรียนเล็กและหลาย workspace</h2>
            <div className="grid gap-3">
              {["แยก workspace และกำหนด role ได้", "สมาชิกดูยอดผ่าน public member card ได้", "Super Admin ตรวจ audit และ health ของ workspace ได้"].map((item) => (
                <div className="flex items-start gap-3" key={item}>
                  <CheckCircle2 className="mt-0.5 text-emerald-600" size={20} />
                  <p className="leading-7 text-slate-700">{item}</p>
                </div>
              ))}
            </div>
            <div className="mt-3">
              <Link href="/register" className="inline-flex min-h-12 items-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:bg-slate-800">
                สร้างบัญชีเพื่อเริ่มจัดการ
                <ArrowRight size={18} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-slate-950 px-5 py-10 text-slate-200">
        <div className="mx-auto grid max-w-7xl gap-8 md:grid-cols-[1.2fr_0.8fr] md:items-end">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Image src="/images/school-saver-logo.webp" alt="SchoolSaver" width={40} height={40} className="rounded-2xl" />
              <span className="text-lg font-black text-white">SchoolSaver</span>
            </div>
            <p className="max-w-2xl text-sm leading-7 text-slate-300">
              ระบบจัดการเงินเก็บสำหรับห้องเรียนและโรงเรียน ช่วยดูแลงานสมาชิก รอบเก็บเงิน การรับชำระ และการตรวจสอบย้อนหลังให้อยู่ในที่เดียว
            </p>
          </div>
          <div className="grid gap-3 text-sm md:justify-items-end">
            <div className="flex flex-wrap gap-3 md:justify-end">
              <Link href="/login" className="text-slate-300 transition hover:text-white">
                เข้าสู่ระบบ
              </Link>
              <Link href="/register" className="text-slate-300 transition hover:text-white">
                สมัครใช้งาน
              </Link>
              <Link href="/help" className="text-slate-300 transition hover:text-white">
                ช่วยเหลือ
              </Link>
              <Link href="/contact" className="text-slate-300 transition hover:text-white">
                ติดต่อเรา
              </Link>
            </div>
            <p className="text-slate-400">SchoolSaver ช่วยให้การเก็บเงินในห้องเรียนเป็นระบบมากขึ้น</p>
          </div>
        </div>
      </footer>
    </main>
  );
}
