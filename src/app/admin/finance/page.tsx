import { EmptyState } from "@/components/ui/EmptyState";
import { getAdminFinanceAction } from "@/features/admin/actions";
import { ExportCsvButton } from "@/features/admin/components/AdminClientControls";
import {
  AdminFilterDropdown,
  adminFilterButtonClass,
  adminFilterFieldClass,
  adminFilterFormClass,
  adminFilterSearchClass,
  adminFilterSmallFieldClass,
  countActiveFilters,
} from "@/features/admin/components/AdminFilterDropdown";
import { AdminPagination } from "@/features/admin/components/AdminPagination";
import { formatThaiDateTime } from "@/lib/date";
import { formatMoney } from "@/lib/money";

export default async function AdminFinancePage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  const result = await getAdminFinanceAction(params);
  if (!result.success) return <EmptyState title="ไม่สามารถดึงข้อมูลการเงินได้" description={result.message} />;
  const activeFilters = countActiveFilters(params);

  const exportRows = result.data.transactions.map((item) => ({
    workspace: item.workspace.name,
    member: item.member.fullName,
    memberCode: item.member.memberCode,
    round: item.round.title,
    method: item.paymentMethod.name,
    collector: item.collectedBy.fullName || item.collectedBy.username,
    amount: item.amount,
    paidAt: formatThaiDateTime(item.paidAt),
    note: item.note ?? "",
  }));

  return (
    <div className="grid gap-5">
      <Header title="ตรวจสอบการเงิน" description="ตรวจสอบธุรกรรมที่ชำระแล้วและรายการค้างชำระแบบแบ่งหน้า ไม่ดึงข้อมูลทั้งหมดมาทีเดียว" />

      <AdminFilterDropdown activeCount={activeFilters} description="ค้นหาตามเวิร์กสเปซ วันที่ชำระ วิธีชำระ ผู้เก็บเงิน สมาชิก รอบ และช่วงยอดเงิน" resetHref="/admin/finance">
        <form className={adminFilterFormClass}>
          <input name="page" type="hidden" value="1" />
          <input name="q" defaultValue={params.q ?? ""} className={adminFilterSearchClass} placeholder="ค้นหาสมาชิก รอบ หมายเหตุ หรือผู้เก็บเงิน" />
          <select name="workspaceId" defaultValue={params.workspaceId ?? ""} className={adminFilterFieldClass}>
            <option value="">ทุกเวิร์กสเปซ</option>
            {result.data.workspaces.map((workspace) => <option key={workspace.id} value={workspace.id}>{workspace.name}</option>)}
          </select>
          <input name="from" type="date" defaultValue={params.from ?? ""} className={adminFilterSmallFieldClass} />
          <input name="to" type="date" defaultValue={params.to ?? ""} className={adminFilterSmallFieldClass} />
          <select name="methodId" defaultValue={params.methodId ?? ""} className={adminFilterFieldClass}>
            <option value="">ทุกวิธีชำระ</option>
            {result.data.methods.map((method) => <option key={method.id} value={method.id}>{method.name} · {method.workspace.name}</option>)}
          </select>
          <select name="collectorId" defaultValue={params.collectorId ?? ""} className={adminFilterFieldClass}>
            <option value="">ทุกผู้เก็บเงิน</option>
            {result.data.collectors.map((collector) => <option key={collector.id} value={collector.id}>{collector.fullName || collector.username}</option>)}
          </select>
          <input name="minAmount" type="number" min="0" step="0.01" defaultValue={params.minAmount ?? ""} className={adminFilterSmallFieldClass} placeholder="ยอดต่ำสุด" />
          <input name="maxAmount" type="number" min="0" step="0.01" defaultValue={params.maxAmount ?? ""} className={adminFilterSmallFieldClass} placeholder="ยอดสูงสุด" />
          <select name="pageSize" defaultValue={params.pageSize ?? "20"} className={adminFilterSmallFieldClass}>
            <option value="20">20/หน้า</option>
            <option value="50">50/หน้า</option>
            <option value="100">100/หน้า</option>
          </select>
          <button className={adminFilterButtonClass}>กรอง</button>
        </form>
      </AdminFilterDropdown>

      <section className="grid gap-3 md:grid-cols-4">
        <Metric label="ยอดชำระตาม filter" value={formatMoney(result.data.totals.amount)} />
        <Metric label="จำนวนธุรกรรม" value={result.data.totals.count.toLocaleString("th-TH")} />
        <Metric label="ค้างชำระที่พบ" value={result.data.outstandingPagination.total.toLocaleString("th-TH")} />
        <div className="rounded-2xl bg-white p-4 shadow-sm"><ExportCsvButton filename="super-admin-transactions.csv" rows={exportRows} /></div>
      </section>

      <section className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(280px,360px)]">
        <div className="grid min-w-0 gap-5">
          <div className="max-w-full overflow-x-auto rounded-2xl bg-white shadow-sm">
            <SectionTitle title="รายการชำระเงิน" description="แสดงจาก PaymentTransaction เท่านั้น" />
            <table className="w-full min-w-[1080px] text-sm">
              <thead className="bg-slate-50 text-left text-slate-500">
                <tr>
                  <th className="p-3">วันที่</th>
                  <th className="p-3">เวิร์กสเปซ</th>
                  <th className="p-3">สมาชิก</th>
                  <th className="p-3">รอบ</th>
                  <th className="p-3">วิธีชำระ</th>
                  <th className="p-3">ผู้เก็บเงิน</th>
                  <th className="p-3">หมายเหตุ</th>
                  <th className="p-3 text-right">ยอดเงิน</th>
                </tr>
              </thead>
              <tbody>
                {result.data.transactions.map((item) => (
                  <tr className="border-t border-slate-100 align-top" key={item.id}>
                    <td className="p-3">{formatThaiDateTime(item.paidAt)}</td>
                    <td className="p-3 font-semibold text-slate-800">{item.workspace.name}</td>
                    <td className="p-3">{item.member.fullName}<span className="block text-xs text-slate-400">{item.member.memberCode}</span></td>
                    <td className="p-3">{item.round.title}</td>
                    <td className="p-3">{item.paymentMethod.name}</td>
                    <td className="p-3">{item.collectedBy.fullName || item.collectedBy.username}</td>
                    <td className="max-w-[220px] p-3 text-slate-500">{item.note ?? "-"}</td>
                    <td className="p-3 text-right font-bold">{formatMoney(item.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!result.data.transactions.length ? <div className="p-6 text-center text-sm font-semibold text-slate-400">ยังไม่มีรายการชำระเงินตามเงื่อนไขนี้</div> : null}
          </div>

          <div className="max-w-full overflow-x-auto rounded-2xl bg-white shadow-sm">
            <SectionTitle title="รายการค้างชำระ" description="แสดงจาก MemberRound ที่ remainingAmount มากกว่า 0" />
            <table className="w-full min-w-[900px] text-sm">
              <thead className="bg-slate-50 text-left text-slate-500">
                <tr>
                  <th className="p-3">เวิร์กสเปซ</th>
                  <th className="p-3">สมาชิก</th>
                  <th className="p-3">รอบ</th>
                  <th className="p-3">สถานะ</th>
                  <th className="p-3 text-right">ต้องชำระ</th>
                  <th className="p-3 text-right">ชำระแล้ว</th>
                  <th className="p-3 text-right">คงเหลือ</th>
                </tr>
              </thead>
              <tbody>
                {result.data.outstandingRows.map((item) => (
                  <tr className="border-t border-slate-100 align-top" key={item.id}>
                    <td className="p-3 font-semibold text-slate-800">{item.workspace.name}</td>
                    <td className="p-3">{item.member.fullName}<span className="block text-xs text-slate-400">{item.member.memberCode}</span></td>
                    <td className="p-3">{item.round.title}<span className="block text-xs text-slate-400">ครบกำหนด {formatThaiDateTime(item.round.dueDate)}</span></td>
                    <td className="p-3"><span className="rounded-full bg-rose-50 px-2.5 py-1 text-xs font-black text-rose-700">{item.status}</span></td>
                    <td className="p-3 text-right">{formatMoney(item.totalRequiredAmount)}</td>
                    <td className="p-3 text-right">{formatMoney(item.paidAmount)}</td>
                    <td className="p-3 text-right font-black text-rose-700">{formatMoney(item.remainingAmount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!result.data.outstandingRows.length ? <div className="p-6 text-center text-sm font-semibold text-slate-400">ไม่พบรายการค้างชำระ</div> : null}
          </div>
        </div>

        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <h2 className="mb-3 font-black text-slate-950">ยอดค้างสูงสุด</h2>
          <div className="grid gap-2">
            {result.data.topOutstanding.map((row) => (
              <div className="rounded-2xl bg-rose-50 p-3" key={row.workspaceId}>
                <p className="font-bold text-slate-950">{row.workspaceName}</p>
                <p className="text-sm text-rose-700">{formatMoney(row.amount)} · {row.count} รายการ</p>
              </div>
            ))}
            {!result.data.topOutstanding.length ? <p className="text-sm text-slate-500">ไม่มียอดค้าง</p> : null}
          </div>
        </div>
      </section>

      <AdminPagination basePath="/admin/finance" params={params} pagination={result.data.pagination} />
    </div>
  );
}

function Header({ title, description }: { title: string; description: string }) {
  return <div><h1 className="text-2xl font-black text-slate-950">{title}</h1><p className="mt-1 text-sm text-slate-500">{description}</p></div>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl bg-white p-4 shadow-sm"><p className="text-sm font-semibold text-slate-500">{label}</p><p className="mt-2 text-xl font-black text-slate-950">{value}</p></div>;
}

function SectionTitle({ title, description }: { title: string; description: string }) {
  return <div className="border-b border-slate-100 p-4"><h2 className="font-black text-slate-950">{title}</h2><p className="mt-1 text-xs font-semibold text-slate-400">{description}</p></div>;
}
