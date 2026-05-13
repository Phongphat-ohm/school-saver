import {
  BookOpenText,
  BriefcaseBusiness,
  CalendarClock,
  ChartNoAxesCombined,
  CircleAlert,
  CreditCard,
  LayoutDashboard,
  ShieldCheck,
  UsersRound,
  WalletCards,
} from "lucide-react";
import { Card } from "@/components/ui/Card";

const guides = [
  {
    title: "Dashboard",
    icon: LayoutDashboard,
    color: "bg-blue-50 text-blue-700",
    steps: ["ดูยอดรวมของ workspace ปัจจุบัน", "เช็กยอดรับวันนี้และรายการล่าสุด", "ดูรอบที่เปิดอยู่และคนค้างจ่ายสำคัญ"],
  },
  {
    title: "Workspace",
    icon: BriefcaseBusiness,
    color: "bg-indigo-50 text-indigo-700",
    steps: ["สร้างห้องหรือกลุ่มเก็บเงินใหม่", "กดสลับมาใช้เพื่อเปลี่ยนพื้นที่ทำงาน", "เพิ่มผู้ช่วยด้วย username และกำหนด role"],
  },
  {
    title: "สมาชิก",
    icon: UsersRound,
    color: "bg-sky-50 text-sky-700",
    steps: ["เพิ่มรหัสสมาชิก เลขที่ ชื่อ ห้อง และเบอร์โทร", "ข้อมูลสมาชิกจะแยกตาม workspace", "ปิดใช้งานสมาชิกแทนการลบจริง"],
  },
  {
    title: "รอบเก็บเงิน",
    icon: CalendarClock,
    color: "bg-amber-50 text-amber-700",
    steps: ["สร้างรอบพร้อมยอดเป้าหมายต่อคน", "กำหนดวันเริ่ม วันครบกำหนด และค่าปรับ", "ระบบสร้างรายการเก็บเงินให้สมาชิก ACTIVE ทุกคน"],
  },
  {
    title: "รับชำระเงิน",
    icon: WalletCards,
    color: "bg-green-50 text-green-700",
    steps: ["เลือกสมาชิกหรือรายการที่ยังจ่ายไม่ครบ", "รับเงินได้หลายครั้งแบบจ่ายสะสม", "ระบบกันไม่ให้รับเงินเกินยอดค้าง"],
  },
  {
    title: "คนค้างจ่าย",
    icon: CircleAlert,
    color: "bg-red-50 text-red-700",
    steps: ["ดูคนที่ยังไม่จ่ายหรือจ่ายบางส่วน", "ยอดค้างรวมค่าปรับปัจจุบัน", "ใช้ติดตามก่อนปิดรอบหรือทวงเงิน"],
  },
  {
    title: "วิธีชำระเงิน",
    icon: CreditCard,
    color: "bg-violet-50 text-violet-700",
    steps: ["เพิ่มเงินสด โอนธนาคาร พร้อมเพย์ หรือวิธีอื่น", "ชื่อวิธีชำระเงินซ้ำได้คนละ workspace", "ใช้แยกรายงานตามช่องทางรับเงิน"],
  },
  {
    title: "รายงาน",
    icon: ChartNoAxesCombined,
    color: "bg-orange-50 text-orange-700",
    steps: ["ดูรายงานรายวัน", "ดูรายงานตามรอบ", "ดูประวัติรายสมาชิกและยอดค้าง"],
  },
  {
    title: "สิทธิ์ผู้ใช้",
    icon: ShieldCheck,
    color: "bg-slate-100 text-slate-700",
    steps: ["OWNER จัดการทุกอย่าง", "ADMIN จัดการข้อมูลและรับเงิน", "COLLECTOR รับเงินและดูข้อมูล", "VIEWER ดู Dashboard และรายงาน"],
  },
];

export function SystemGuide() {
  return (
    <div className="grid gap-5">
      <section className="rounded-[2rem] bg-white p-5 shadow-sm">
        <div className="rounded-[1.5rem] bg-[#eef3ff] p-6">
          <div className="mb-4 grid size-12 place-items-center rounded-2xl bg-blue-600 text-white">
            <BookOpenText size={24} />
          </div>
          <h2 className="text-3xl font-black text-slate-950">วิธีใช้งาน SchoolSaver</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            เริ่มจากเลือก workspace เพิ่มสมาชิก สร้างรอบเก็บเงิน แล้วรับชำระแบบจ่ายสะสม ระบบจะคำนวณยอดค้างและค่าปรับให้ตาม workspace ปัจจุบัน
          </p>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {guides.map((guide) => {
          const Icon = guide.icon;
          return (
            <Card key={guide.title} className="border-0">
              <div className="mb-4 flex items-center gap-3">
                <div className={`grid size-11 place-items-center rounded-2xl ${guide.color}`}>
                  <Icon size={21} />
                </div>
                <h3 className="text-lg font-black text-slate-950">{guide.title}</h3>
              </div>
              <ol className="grid gap-2 text-sm leading-6 text-slate-600">
                {guide.steps.map((step, index) => (
                  <li key={step} className="flex gap-2">
                    <span className="grid size-6 shrink-0 place-items-center rounded-full bg-slate-100 text-xs font-bold text-slate-500">{index + 1}</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </Card>
          );
        })}
      </section>
    </div>
  );
}
