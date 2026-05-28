import { EmptyState } from "@/components/ui/EmptyState";
import { getAdminPlatformSettingsAction } from "@/features/admin/actions";
import { AppVersionList, AppVersionReleaseForm } from "@/features/admin/components/AdminClientControls";
import { formatThaiDateTime } from "@/lib/date";

export default async function AdminVersionControlPage() {
  const result = await getAdminPlatformSettingsAction();
  if (!result.success) return <EmptyState title="ไม่สามารถดึงข้อมูลเวอร์ชันได้" description={result.message} />;

  const currentVersion = result.data.currentVersion;
  const plannedVersions = result.data.versions.filter((version) => version.status === "PLANNED");
  const latestPlannedVersion = plannedVersions[0];
  const versions = result.data.versions.map((version) => ({
    id: version.id,
    version: version.version,
    title: version.title,
    features: version.features,
    status: version.status,
    createdAt: formatThaiDateTime(version.createdAt),
    plannedAt: version.plannedAt ? formatThaiDateTime(version.plannedAt) : null,
    activatedAt: version.activatedAt ? formatThaiDateTime(version.activatedAt) : null,
    createdByName: version.createdBy.fullName || version.createdBy.username,
  }));

  return (
    <div className="grid gap-5">
      <Header
        title="Version Control"
        description="ประกาศเวอร์ชันใหม่ล่วงหน้าเป็นสถานะยังไม่ใช้งานก่อน แล้วค่อยกดใช้งานเมื่อแอดมิน deploy/update เสร็จ ระบบจะกันไม่ให้ downgrade"
      />

      <section className="grid gap-4 md:grid-cols-3">
        <SummaryCard label="เวอร์ชันที่ใช้งานอยู่" value={`v${currentVersion.version}`} detail={currentVersion.title} tone="blue" />
        <SummaryCard
          label="รอเปิดใช้งาน"
          value={plannedVersions.length.toLocaleString("th-TH")}
          detail={latestPlannedVersion ? `ล่าสุด v${latestPlannedVersion.version} ${latestPlannedVersion.plannedAt ? `(${formatThaiDateTime(latestPlannedVersion.plannedAt)})` : ""}` : "ไม่มีเวอร์ชันที่รอเปิดใช้งาน"}
          tone="amber"
        />
        <SummaryCard label="จำนวน release" value={result.data.versions.length.toLocaleString("th-TH")} detail="แสดงรายการล่าสุด 20 รายการ" tone="slate" />
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(340px,440px)_minmax(0,1fr)]">
        <AppVersionReleaseForm currentVersion={currentVersion} />

        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-black text-slate-950">รายการเวอร์ชัน</h2>
              <p className="mt-1 text-sm text-slate-500">แสดงเลขเวอร์ชัน ชื่อ release และสถานะ กดรายละเอียดเพื่ออ่านฟีเจอร์ทั้งหมด</p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">{versions.length.toLocaleString("th-TH")} releases</span>
          </div>
          <AppVersionList versions={versions} currentVersion={currentVersion.version} />
        </div>
      </section>
    </div>
  );
}

function Header({ title, description }: { title: string; description: string }) {
  return (
    <div>
      <h1 className="text-2xl font-black text-slate-950">{title}</h1>
      <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">{description}</p>
    </div>
  );
}

function SummaryCard({ label, value, detail, tone }: { label: string; value: string; detail?: string; tone: "blue" | "amber" | "slate" }) {
  const toneClass =
    tone === "blue"
      ? "bg-blue-50 text-blue-700"
      : tone === "amber"
        ? "bg-amber-50 text-amber-700"
        : "bg-slate-100 text-slate-700";

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-sm font-bold text-slate-500">{label}</p>
      <p className={`mt-3 inline-flex rounded-full px-3 py-1 text-xl font-black ${toneClass}`}>{value}</p>
      {detail ? <p className="mt-3 text-sm leading-6 text-slate-500">{detail}</p> : null}
    </div>
  );
}
