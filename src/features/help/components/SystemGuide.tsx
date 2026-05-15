import {
  AlertTriangle,
  BookOpenText,
  BriefcaseBusiness,
  CalendarClock,
  ChartNoAxesCombined,
  CheckCircle2,
  CircleAlert,
  CreditCard,
  LayoutDashboard,
  ListChecks,
  Settings,
  ShieldCheck,
  UserCog,
  UsersRound,
  WalletCards,
} from "lucide-react";
import { Card } from "@/components/ui/Card";

const setupSteps = [
  {
    title: "เลือกหรือสร้าง Workspace",
    description:
      "Workspace คือพื้นที่เก็บข้อมูลของแต่ละห้องเรียน ชมรม หรือกลุ่มออมเงิน ข้อมูลสมาชิก รอบเก็บเงิน และรายงานจะแยกจากกันตาม Workspace ที่เลือกอยู่",
  },
  {
    title: "เพิ่มสมาชิก",
    description:
      "บันทึกรหัสสมาชิก เลขที่ ชื่อ ห้อง และเบอร์โทรให้ครบก่อนเริ่มสร้างรอบ เพื่อให้ระบบสร้างรายการชำระเงินให้สมาชิกได้ถูกต้อง",
  },
  {
    title: "ตั้งค่าวิธีชำระเงิน",
    description:
      "เพิ่มช่องทางรับเงิน เช่น เงินสด โอนธนาคาร พร้อมเพย์ หรือช่องทางอื่น เพื่อใช้แยกรายงานยอดรับตามช่องทาง",
  },
  {
    title: "สร้างรอบเก็บเงิน",
    description:
      "กำหนดชื่อรอบ ยอดที่ต้องเก็บต่อคน วันเริ่มต้น วันครบกำหนด และค่าปรับ ระบบจะสร้างรายการเก็บเงินให้สมาชิกที่ยังใช้งานอยู่ทุกคน",
  },
  {
    title: "รับชำระและติดตามยอดค้าง",
    description:
      "เมื่อสมาชิกจ่ายเงิน ให้บันทึกยอดรับตามจริง ระบบรองรับการจ่ายสะสมหลายครั้ง และแสดงยอดค้างพร้อมค่าปรับให้อัตโนมัติ",
  },
];

const dailyWorkflow = [
  "เปิด Dashboard เพื่อตรวจยอดรับวันนี้ รายการล่าสุด รอบที่ยังเปิดอยู่ และจำนวนคนค้างจ่าย",
  "ไปที่ รับชำระเงิน เพื่อค้นหาสมาชิกหรือรายการค้างชำระ แล้วบันทึกยอดที่ได้รับ",
  "ตรวจหน้า คนค้างจ่าย เมื่อใกล้ครบกำหนดหรือหลังครบกำหนด เพื่อดูยอดค้างรวมค่าปรับ",
  "ใช้ รายงานรายวัน หรือรายงานตามรอบ เพื่อตรวจสอบยอดรับก่อนปิดบัญชีประจำวัน",
];

const featureGuides = [
  {
    title: "Dashboard",
    icon: LayoutDashboard,
    color: "bg-blue-50 text-blue-700",
    details: [
      "ใช้ดูภาพรวมของ Workspace ปัจจุบัน เช่น ยอดรับวันนี้ ยอดค้าง และรายการล่าสุด",
      "ตรวจรอบที่ยังเปิดอยู่เพื่อรู้ว่ามีรายการใดต้องติดตามต่อ",
      "เหมาะสำหรับเปิดดูทุกวันก่อนเริ่มรับเงินหรือสรุปงาน",
    ],
  },
  {
    title: "Workspace",
    icon: BriefcaseBusiness,
    color: "bg-indigo-50 text-indigo-700",
    details: [
      "ใช้สร้างห้องหรือกลุ่มเก็บเงินแยกกัน เช่น ม.1/1, ชมรมดนตรี หรือกองทุนห้อง",
      "กดสลับ Workspace เพื่อเปลี่ยนพื้นที่ทำงาน ข้อมูลบนหน้าอื่นจะเปลี่ยนตาม Workspace นั้น",
      "เชิญผู้ช่วยเข้าร่วมได้ และกำหนดบทบาทให้เหมาะกับงานที่รับผิดชอบ",
    ],
  },
  {
    title: "สมาชิก",
    icon: UsersRound,
    color: "bg-sky-50 text-sky-700",
    details: [
      "เพิ่มและแก้ไขข้อมูลสมาชิกที่ต้องเก็บเงิน เช่น รหัสสมาชิก เลขที่ ชื่อ ห้อง และเบอร์โทร",
      "สมาชิกแต่ละ Workspace แยกกัน จึงไม่ปะปนกับห้องหรือกลุ่มอื่น",
      "หากสมาชิกออกจากกลุ่ม แนะนำให้ปิดใช้งานแทนการลบ เพื่อเก็บประวัติรายงานเดิมไว้",
    ],
  },
  {
    title: "รอบเก็บเงิน",
    icon: CalendarClock,
    color: "bg-amber-50 text-amber-700",
    details: [
      "ใช้สร้างรายการเก็บเงินเป็นรอบ เช่น เงินออมรายสัปดาห์ ค่ากิจกรรม หรือเงินกองกลาง",
      "กำหนดยอดเป้าหมายต่อคน วันเริ่ม วันครบกำหนด และค่าปรับเมื่อจ่ายช้า",
      "เมื่อสร้างรอบแล้ว ระบบจะสร้างรายการให้สมาชิก ACTIVE ทุกคนใน Workspace นั้น",
    ],
  },
  {
    title: "รับชำระเงิน",
    icon: WalletCards,
    color: "bg-green-50 text-green-700",
    details: [
      "ค้นหาสมาชิกหรือรายการที่ยังจ่ายไม่ครบ แล้วบันทึกยอดที่รับจริง",
      "รองรับการจ่ายบางส่วนและจ่ายหลายครั้ง ระบบจะรวมยอดสะสมและคงเหลือให้อัตโนมัติ",
      "ระบบช่วยกันไม่ให้บันทึกยอดเกินยอดค้าง เพื่อให้บัญชีไม่คลาดเคลื่อน",
    ],
  },
  {
    title: "คนค้างจ่าย",
    icon: CircleAlert,
    color: "bg-red-50 text-red-700",
    details: [
      "ใช้ดูรายชื่อสมาชิกที่ยังไม่จ่ายหรือจ่ายไม่ครบในรอบที่เกี่ยวข้อง",
      "ยอดค้างจะแสดงรวมค่าปรับปัจจุบันเมื่อเข้าเงื่อนไขครบกำหนด",
      "เหมาะสำหรับติดตามก่อนปิดรอบ แจ้งเตือนสมาชิก หรือเตรียมสรุปรายงาน",
    ],
  },
  {
    title: "วิธีชำระเงิน",
    icon: CreditCard,
    color: "bg-violet-50 text-violet-700",
    details: [
      "เพิ่มช่องทางรับเงิน เช่น เงินสด โอนธนาคาร พร้อมเพย์ หรือช่องทางเฉพาะของกลุ่ม",
      "ชื่อวิธีชำระเงินสามารถซ้ำกับ Workspace อื่นได้ เพราะข้อมูลแยกตาม Workspace",
      "ข้อมูลนี้ช่วยให้รายงานแยกยอดรับตามช่องทางได้ชัดเจน",
    ],
  },
  {
    title: "ผู้ใช้งาน",
    icon: UserCog,
    color: "bg-cyan-50 text-cyan-700",
    details: [
      "ใช้จัดการผู้ช่วยที่เข้ามาทำงานใน Workspace เช่น ครูประจำชั้น เหรัญญิก หรือผู้ตรวจสอบ",
      "กำหนดบทบาทตามความรับผิดชอบ เพื่อจำกัดสิทธิ์ในการเพิ่ม แก้ไข หรือดูข้อมูล",
      "ควรตรวจรายชื่อผู้ใช้งานเป็นระยะ และถอนสิทธิ์คนที่ไม่เกี่ยวข้องแล้ว",
    ],
  },
  {
    title: "รายงาน",
    icon: ChartNoAxesCombined,
    color: "bg-orange-50 text-orange-700",
    details: [
      "รายงานรายวันช่วยสรุปยอดรับของแต่ละวันและตรวจรายการที่บันทึกเข้ามา",
      "รายงานตามรอบช่วยดูยอดเป้าหมาย ยอดรับ ยอดค้าง และสถานะของรอบเก็บเงิน",
      "รายงานรายสมาชิกช่วยตรวจประวัติการจ่ายและยอดค้างของสมาชิกแต่ละคน",
    ],
  },
  {
    title: "ตั้งค่า",
    icon: Settings,
    color: "bg-slate-100 text-slate-700",
    details: [
      "แก้ไขข้อมูลส่วนตัว เปลี่ยนรหัสผ่าน และตั้งค่าที่เกี่ยวข้องกับบัญชี",
      "เจ้าของหรือผู้ดูแลสามารถปรับข้อมูล Workspace ได้ตามสิทธิ์ที่ได้รับ",
      "ควรใช้รหัสผ่านที่เดายาก และเปลี่ยนทันทีหากสงสัยว่ามีผู้อื่นทราบรหัส",
    ],
  },
];

const roleGuides = [
  { role: "OWNER", detail: "จัดการทุกอย่างใน Workspace รวมถึงผู้ใช้งาน การตั้งค่า และข้อมูลการเงินทั้งหมด" },
  { role: "ADMIN", detail: "จัดการข้อมูลหลัก สร้างรอบ รับชำระ ดูรายงาน และช่วยดูแล Workspace" },
  { role: "COLLECTOR", detail: "เน้นรับชำระเงิน ดูข้อมูลที่จำเป็น และติดตามคนค้างจ่าย" },
  { role: "VIEWER", detail: "ดู Dashboard และรายงานได้ เหมาะกับผู้ตรวจสอบหรือผู้ที่ต้องการดูภาพรวม" },
];

const tips = [
  "ตรวจว่าเลือก Workspace ถูกต้องก่อนเพิ่มสมาชิก สร้างรอบ หรือรับชำระเงิน",
  "เพิ่มสมาชิกให้ครบก่อนสร้างรอบ เพราะรอบใหม่จะสร้างรายการตามสมาชิกที่ใช้งานอยู่ในเวลานั้น",
  "หากบันทึกเงินผิด ให้แก้ไขให้เร็วที่สุดก่อนนำรายงานไปสรุปยอดจริง",
  "ใช้ชื่อรอบให้ชัด เช่น เงินออม ม.2/1 เดือนพฤษภาคม เพื่อค้นหาและตรวจรายงานภายหลังได้ง่าย",
];

export function SystemGuide() {
  return (
    <div className="grid gap-5">
      <section className="overflow-hidden rounded-[2rem] bg-white shadow-sm">
        <div className="bg-[#eef3ff] p-6 md:p-8">
          <div className="mb-5 grid size-12 place-items-center rounded-2xl bg-blue-600 text-white">
            <BookOpenText size={24} />
          </div>
          <div className="grid gap-3 lg:max-w-4xl">
            <p className="text-sm font-bold text-blue-700">คู่มือการใช้งาน</p>
            <h2 className="text-3xl font-black leading-tight text-slate-950 md:text-4xl">
              วิธีใช้งาน SchoolSaver แบบละเอียด
            </h2>
            <p className="max-w-3xl text-sm leading-7 text-slate-600 md:text-base">
              หน้านี้สรุปลำดับการทำงานตั้งแต่เริ่มตั้งค่าระบบ เพิ่มสมาชิก สร้างรอบเก็บเงิน รับชำระ
              ติดตามคนค้างจ่าย ไปจนถึงดูรายงาน เหมาะสำหรับทั้งผู้เริ่มใช้และผู้ช่วยที่ต้องเข้ามาทำงานต่อกัน
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <Card className="border-0 p-5">
          <div className="mb-4 flex items-center gap-3">
            <div className="grid size-11 place-items-center rounded-2xl bg-emerald-50 text-emerald-700">
              <ListChecks size={21} />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-950">เริ่มใช้งานครั้งแรก</h3>
              <p className="text-sm text-slate-500">ทำตามลำดับนี้เพื่อให้ข้อมูลพร้อมก่อนรับชำระเงินจริง</p>
            </div>
          </div>
          <ol className="grid gap-3">
            {setupSteps.map((step, index) => (
              <li key={step.title} className="flex gap-3 rounded-2xl bg-slate-50 p-3">
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-white text-sm font-black text-blue-700 shadow-sm">
                  {index + 1}
                </span>
                <div>
                  <p className="font-bold text-slate-900">{step.title}</p>
                  <p className="mt-1 text-sm leading-6 text-slate-600">{step.description}</p>
                </div>
              </li>
            ))}
          </ol>
        </Card>

        <Card className="border-0 p-5">
          <div className="mb-4 flex items-center gap-3">
            <div className="grid size-11 place-items-center rounded-2xl bg-blue-50 text-blue-700">
              <CheckCircle2 size={21} />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-950">งานประจำวัน</h3>
              <p className="text-sm text-slate-500">แนวทางสั้น ๆ สำหรับผู้รับเงินหรือผู้ดูแล</p>
            </div>
          </div>
          <ul className="grid gap-3 text-sm leading-6 text-slate-600">
            {dailyWorkflow.map((item) => (
              <li key={item} className="flex gap-2">
                <CheckCircle2 size={18} className="mt-1 shrink-0 text-emerald-600" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </Card>
      </section>

      <section>
        <div className="mb-4">
          <h3 className="text-xl font-black text-slate-950">คำอธิบายแต่ละเมนู</h3>
          <p className="mt-1 text-sm text-slate-500">เลือกเมนูจากแถบด้านข้าง แล้วทำงานตามหน้าที่ของเมนูนั้น</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {featureGuides.map((guide) => {
            const Icon = guide.icon;
            return (
              <Card key={guide.title} className="border-0 p-5">
                <div className="mb-4 flex items-center gap-3">
                  <div className={`grid size-11 place-items-center rounded-2xl ${guide.color}`}>
                    <Icon size={21} />
                  </div>
                  <h4 className="text-lg font-black text-slate-950">{guide.title}</h4>
                </div>
                <ul className="grid gap-2 text-sm leading-6 text-slate-600">
                  {guide.details.map((detail) => (
                    <li key={detail} className="flex gap-2">
                      <span className="mt-2 size-1.5 shrink-0 rounded-full bg-slate-300" />
                      <span>{detail}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card className="border-0 p-5">
          <div className="mb-4 flex items-center gap-3">
            <div className="grid size-11 place-items-center rounded-2xl bg-slate-100 text-slate-700">
              <ShieldCheck size={21} />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-950">สิทธิ์ผู้ใช้งาน</h3>
              <p className="text-sm text-slate-500">กำหนดสิทธิ์ให้ตรงกับงานที่ต้องทำจริง</p>
            </div>
          </div>
          <div className="grid gap-3">
            {roleGuides.map((item) => (
              <div key={item.role} className="rounded-2xl bg-slate-50 p-3">
                <p className="text-sm font-black text-slate-900">{item.role}</p>
                <p className="mt-1 text-sm leading-6 text-slate-600">{item.detail}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card className="border-0 p-5">
          <div className="mb-4 flex items-center gap-3">
            <div className="grid size-11 place-items-center rounded-2xl bg-amber-50 text-amber-700">
              <AlertTriangle size={21} />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-950">ข้อควรระวัง</h3>
              <p className="text-sm text-slate-500">ช่วยลดข้อมูลผิดพลาดและทำให้รายงานตรวจง่าย</p>
            </div>
          </div>
          <ul className="grid gap-3 text-sm leading-6 text-slate-600">
            {tips.map((tip) => (
              <li key={tip} className="flex gap-2">
                <AlertTriangle size={18} className="mt-1 shrink-0 text-amber-600" />
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </Card>
      </section>
    </div>
  );
}
