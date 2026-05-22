import { EmptyState } from "@/components/ui/EmptyState";
import { getAdminSupportAction } from "@/features/admin/actions";
import { EndSupportSessionButton, EnterSupportSessionButton, SupportSessionForm } from "@/features/admin/components/AdminClientControls";
import { formatThaiDateTime } from "@/lib/date";

export default async function AdminSupportPage() {
  const result = await getAdminSupportAction();
  if (!result.success) return <EmptyState title="ไม่สามารถดึงข้อมูลโหมดช่วยเหลือได้" description={result.message} />;

  return (
    <div className="grid gap-5">
      <Header title="โหมดช่วยเหลือและการเข้าแทน" description="ระบบ support access แบบมี session เหตุผล อายุ session mode และ audit log ทุกครั้ง" />
      {result.data.currentSupportSessionId ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
          <p className="font-black">กำลังอยู่ในโหมดช่วยเหลือ</p>
          <p className="mt-1 text-sm">ทุก action ในเวิร์กสเปซจะถูกติด `[SUPPORT:session:mode]` ใน activity log เพื่อ replay ภายหลังได้</p>
        </div>
      ) : null}

      <section className="grid min-w-0 gap-5 xl:grid-cols-[minmax(320px,420px)_minmax(0,1fr)]">
        <SupportSessionForm workspaces={result.data.workspaces} />

        <div className="max-w-full overflow-x-auto rounded-2xl bg-white shadow-sm">
          <table className="w-full min-w-[920px] text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="p-3">เวิร์กสเปซ</th>
                <th className="p-3">โหมด</th>
                <th className="p-3">สถานะ</th>
                <th className="p-3">ผู้ดำเนินการ</th>
                <th className="p-3">เหตุผล</th>
                <th className="p-3">หมดอายุ</th>
                <th className="p-3 text-right">จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {result.data.sessions.map((session) => (
                <tr className="border-t border-slate-100 align-top" key={session.id}>
                  <td className="p-3 font-black text-slate-950">{session.workspace.name}</td>
                  <td className="p-3">{session.mode}</td>
                  <td className="p-3"><StatusPill status={session.status} /></td>
                  <td className="p-3">{session.actor.fullName || session.actor.username}</td>
                  <td className="max-w-[280px] p-3 text-slate-600">{session.reason}</td>
                  <td className="p-3 text-xs text-slate-500">
                    <p>{formatThaiDateTime(session.expiresAt)}</p>
                    {session.endedAt ? <p>จบ {formatThaiDateTime(session.endedAt)}</p> : null}
                  </td>
                  <td className="p-3">
                    {session.status === "ACTIVE" ? (
                      <div className="flex justify-end gap-2">
                        <EnterSupportSessionButton active={result.data.currentSupportSessionId === session.id} sessionId={session.id} />
                        <EndSupportSessionButton sessionId={session.id} />
                      </div>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!result.data.sessions.length ? <div className="p-6 text-center text-sm font-semibold text-slate-400">ยังไม่มี session ช่วยเหลือ</div> : null}
        </div>
      </section>
      <section className="rounded-2xl bg-white p-4 shadow-sm">
        <h2 className="font-black text-slate-950">บันทึก replay ของโหมดช่วยเหลือ</h2>
        <p className="mt-1 text-sm text-slate-500">รายการล่าสุดที่เกิดระหว่าง session ช่วยเหลือ สำหรับตรวจสอบย้อนหลัง</p>
        <div className="mt-4 grid max-h-[28rem] gap-2 overflow-y-auto pr-1">
          {result.data.supportLogs.map((log) => (
            <div className="rounded-2xl border border-slate-200 p-3" key={log.id}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-black text-slate-950">{log.action}</p>
                  <p className="mt-1 text-sm text-slate-500">{log.detail}</p>
                </div>
                <p className="text-xs text-slate-400">{formatThaiDateTime(log.createdAt)}</p>
              </div>
              <p className="mt-2 text-xs text-slate-400">{log.workspace?.name ?? "ทั้งแพลตฟอร์ม"} · {log.user?.fullName ?? log.user?.username ?? "ระบบ"}</p>
            </div>
          ))}
          {!result.data.supportLogs.length ? <p className="rounded-2xl bg-slate-50 p-4 text-center text-sm text-slate-500">ยังไม่มีบันทึก replay</p> : null}
        </div>
      </section>
    </div>
  );
}

function Header({ title, description }: { title: string; description: string }) {
  return <div><h1 className="text-2xl font-black text-slate-950">{title}</h1><p className="mt-1 text-sm text-slate-500">{description}</p></div>;
}

function StatusPill({ status }: { status: string }) {
  const cls = status === "ACTIVE" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-700";
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-black ${cls}`}>{status}</span>;
}
