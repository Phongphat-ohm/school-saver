import { Gauge, PackageCheck } from "lucide-react";

type WorkspaceLimitItem = {
  key: string;
  label: string;
  used: number;
  reserved: number;
  limit: number;
  description: string;
};

export function WorkspacePlanLimitCard({ data }: { data: { plan: string; limits: WorkspaceLimitItem[] } }) {
  return (
    <div className="grid gap-4">
      <div className="rounded-2xl bg-blue-50 p-4">
        <div className="flex items-center gap-3">
          <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-blue-600 text-white">
            <PackageCheck size={20} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-blue-700">Plan ปัจจุบัน</p>
            <p className="truncate text-2xl font-black text-slate-950">{data.plan}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-3">
        {data.limits.map((item) => (
          <LimitRow item={item} key={item.key} />
        ))}
      </div>
    </div>
  );
}

function LimitRow({ item }: { item: WorkspaceLimitItem }) {
  const totalUsed = item.used + item.reserved;
  const percentage = item.limit > 0 ? Math.min(100, Math.round((totalUsed / item.limit) * 100)) : 100;
  const remaining = Math.max(0, item.limit - totalUsed);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 font-black text-slate-950">
            <Gauge size={17} className="text-blue-600" />
            {item.label}
          </p>
          <p className="mt-1 text-xs leading-5 text-slate-500">{item.description}</p>
        </div>
        <p className="shrink-0 text-right text-sm font-black text-slate-900">
          {totalUsed.toLocaleString("th-TH")} / {item.limit.toLocaleString("th-TH")}
        </p>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-blue-600" style={{ width: `${percentage}%` }} />
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium text-slate-500">
        <span>ใช้จริง {item.used.toLocaleString("th-TH")}</span>
        {item.reserved > 0 ? <span>รอตอบรับ {item.reserved.toLocaleString("th-TH")}</span> : null}
        <span>คงเหลือ {remaining.toLocaleString("th-TH")}</span>
      </div>
    </div>
  );
}
