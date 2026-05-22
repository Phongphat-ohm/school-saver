import { EmptyState } from "@/components/ui/EmptyState";
import { getAdminDataExportsAction } from "@/features/admin/actions";
import { AdminDataExportButton } from "@/features/admin/components/AdminClientControls";

export default async function AdminExportsPage() {
  const result = await getAdminDataExportsAction();
  if (!result.success) return <EmptyState title="ไม่สามารถเตรียมส่งออกข้อมูลได้" description={result.message} />;

  return (
    <div className="grid gap-5">
      <Header
        title="ศูนย์ส่งออกและสำรองข้อมูล"
        description={`ส่งออกผ่าน server action พร้อมตรวจสิทธิ์ SUPER ADMIN, บันทึก audit และจำกัดข้อมูลล่าสุดไม่เกิน ${result.data.limit.toLocaleString("th-TH")} แถวต่อไฟล์`}
      />
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {result.data.exports.map((item) => (
          <ExportCard key={item.dataset} item={item} limit={result.data.limit} />
        ))}
      </section>
    </div>
  );
}

function Header({ title, description }: { title: string; description: string }) {
  return (
    <div>
      <h1 className="text-2xl font-black text-slate-950">{title}</h1>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
    </div>
  );
}

function ExportCard({
  item,
  limit,
}: {
  item: {
    dataset: "users" | "workspaces" | "payments" | "activity_logs";
    label: string;
    description: string;
    filename: string;
    totalRows: number;
  };
  limit: number;
}) {
  const exportedRows = Math.min(item.totalRows, limit);
  const capped = item.totalRows > limit;

  return (
    <div className="grid gap-3 rounded-2xl bg-white p-4 shadow-sm">
      <div>
        <h2 className="font-black text-slate-950">{item.label}</h2>
        <p className="mt-1 text-sm text-slate-500">{item.description}</p>
      </div>
      <div>
        <p className="text-2xl font-black text-slate-950">{item.totalRows.toLocaleString("th-TH")}</p>
        <p className="mt-1 text-xs text-slate-500">
          {capped
            ? `ไฟล์จะมีข้อมูลล่าสุด ${exportedRows.toLocaleString("th-TH")} จากทั้งหมด ${item.totalRows.toLocaleString("th-TH")} แถว`
            : `ไฟล์จะมี ${exportedRows.toLocaleString("th-TH")} แถว`}
        </p>
      </div>
      <AdminDataExportButton dataset={item.dataset} />
    </div>
  );
}
