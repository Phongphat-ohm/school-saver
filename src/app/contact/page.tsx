import { Mail, MessageCircle, ShieldCheck } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";

const contactItems = [
  {
    title: "Support",
    value: "support@ppkxb.space",
    detail: "แจ้งปัญหาการใช้งาน workspace, ผู้ใช้, การชำระเงิน และรายงาน",
    icon: MessageCircle,
  },
  {
    title: "Security",
    value: "security@ppkxb.space",
    detail: "แจ้งเหตุผิดปกติด้านบัญชี สิทธิ์การเข้าถึง หรือ activity log",
    icon: ShieldCheck,
  },
  {
    title: "Email",
    value: "hello@ppkxb.space",
    detail: "ติดต่อทีม SchoolSaver สำหรับคำถามทั่วไป",
    icon: Mail,
  },
] as const;

export default function ContactPage() {
  return (
    <AppLayout>
      <section className="grid gap-5">
        <div>
          <h1 className="text-3xl font-black text-slate-950">Contact</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            ช่องทางติดต่อสำหรับขอความช่วยเหลือ แจ้งปัญหา และสอบถามข้อมูลเกี่ยวกับระบบ SchoolSaver
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          {contactItems.map((item) => {
            const Icon = item.icon;
            return (
              <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm" key={item.title}>
                <div className="grid size-11 place-items-center rounded-lg bg-blue-50 text-blue-700">
                  <Icon size={20} />
                </div>
                <h2 className="mt-4 text-lg font-black text-slate-950">{item.title}</h2>
                <p className="mt-1 break-words text-sm font-bold text-blue-700">{item.value}</p>
                <p className="mt-3 text-sm leading-6 text-slate-500">{item.detail}</p>
              </article>
            );
          })}
        </div>
      </section>
    </AppLayout>
  );
}
