import { EmptyState } from "@/components/ui/EmptyState";
import { getAdminAnnouncementsAction } from "@/features/admin/actions";
import {
  AnnouncementForm,
  AnnouncementTemplateForm,
  CancelScheduledAnnouncementButton,
  RecipientGroupForm,
  SendDueScheduledAnnouncementsButton,
} from "@/features/admin/components/AdminClientControls";
import { formatThaiDateTime } from "@/lib/date";

export default async function AdminAnnouncementsPage() {
  const result = await getAdminAnnouncementsAction();
  if (!result.success) return <EmptyState title="ไม่สามารถดึงข้อมูลประกาศได้" description={result.message} />;
  const unreadCount = result.data.recentNotifications.filter((item) => !item.readAt).length;

  return (
    <div className="grid gap-5">
      <Header title="ศูนย์ประกาศและข้อความ" description="ส่งประกาศถึงทุกเวิร์กสเปซ เฉพาะเวิร์กสเปซ หรือเลือกผู้ใช้ได้หลายคน พร้อมดูสถานะอ่าน/ยังไม่อ่าน" />
      <section className="grid min-w-0 gap-5 xl:grid-cols-[minmax(320px,420px)_minmax(0,1fr)]">
        <div className="grid gap-4">
          <AnnouncementForm workspaces={result.data.workspaces} users={result.data.users} templates={result.data.templates} recipientGroups={result.data.recipientGroups} />
          <AnnouncementTemplateForm />
          <RecipientGroupForm users={result.data.users} />
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="font-black text-slate-950">ประกาศล่าสุด</h2>
            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">ยังไม่อ่าน {unreadCount}</span>
          </div>
          <div className="grid max-h-[36rem] gap-2 overflow-y-auto pr-1">
            {result.data.recentNotifications.map((item) => (
              <div className="rounded-2xl border border-slate-200 p-3" key={item.id}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold text-slate-950">{item.title}</p>
                    <p className="mt-1 text-sm text-slate-500">{item.message}</p>
                    <p className="mt-2 text-xs text-slate-400">{item.workspace?.name ?? "ทั้งแพลตฟอร์ม"} · {item.user.fullName} · {formatThaiDateTime(item.createdAt)}</p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-black ${item.readAt ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{item.readAt ? "อ่านแล้ว" : "ยังไม่อ่าน"}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="grid gap-4 rounded-2xl bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-black text-slate-950">รายการนัดส่งประกาศ</h2>
            <p className="mt-1 text-sm text-slate-500">รายการที่ตั้งเวลาไว้ สถานะ และผู้สร้างรายการ</p>
          </div>
          <SendDueScheduledAnnouncementsButton />
        </div>
        <div className="max-w-full overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="p-3">เวลา</th>
                <th className="p-3">หัวข้อ</th>
                <th className="p-3">ผู้รับ</th>
                <th className="p-3">สถานะ</th>
                <th className="p-3">สร้างโดย</th>
                <th className="p-3 text-right">จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {result.data.scheduledAnnouncements.map((item) => (
                <tr className="border-t border-slate-100 align-top" key={item.id}>
                  <td className="p-3 whitespace-nowrap">{formatThaiDateTime(item.scheduledAt)}</td>
                  <td className="max-w-[320px] p-3"><p className="font-bold text-slate-950">{item.title}</p><p className="mt-1 line-clamp-2 text-xs text-slate-500">{item.message}</p></td>
                  <td className="p-3">{item.workspace?.name ?? item.target}</td>
                  <td className="p-3"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-700">{item.status}</span></td>
                  <td className="p-3">{item.createdBy.fullName || item.createdBy.username}</td>
                  <td className="p-3 text-right">{item.status === "SCHEDULED" ? <CancelScheduledAnnouncementButton id={item.id} /> : null}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!result.data.scheduledAnnouncements.length ? <div className="p-5 text-center text-sm font-semibold text-slate-400">ยังไม่มีรายการนัดส่งประกาศ</div> : null}
        </div>
      </section>
    </div>
  );
}
function Header({ title, description }: { title: string; description: string }) {
  return <div><h1 className="text-2xl font-black text-slate-950">{title}</h1><p className="mt-1 text-sm text-slate-500">{description}</p></div>;
}
