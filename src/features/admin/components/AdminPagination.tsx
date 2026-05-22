import Link from "next/link";

type Pagination = {
  page: number;
  pageSize: number;
  total: number;
};

type AdminPaginationProps = {
  basePath: string;
  params: Record<string, string | undefined>;
  pagination: Pagination;
};

export function AdminPagination({ basePath, params, pagination }: AdminPaginationProps) {
  const totalPages = Math.max(1, Math.ceil(pagination.total / pagination.pageSize));
  const from = pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.pageSize + 1;
  const to = Math.min(pagination.total, pagination.page * pagination.pageSize);

  const hrefFor = (page: number) => {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (!value || key === "page") continue;
      query.set(key, value);
    }
    query.set("page", String(page));
    query.set("pageSize", String(pagination.pageSize));
    const search = query.toString();
    return search ? `${basePath}?${search}` : basePath;
  };

  const linkClass = "rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50";
  const disabledClass = "rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-300";

  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-white p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm font-semibold text-slate-500">
        แสดง {from.toLocaleString("th-TH")}-{to.toLocaleString("th-TH")} จาก {pagination.total.toLocaleString("th-TH")} รายการ
      </p>
      <div className="flex items-center gap-2">
        {pagination.page > 1 ? <Link className={linkClass} href={hrefFor(1)}>หน้าแรก</Link> : <span className={disabledClass}>หน้าแรก</span>}
        {pagination.page > 1 ? <Link className={linkClass} href={hrefFor(pagination.page - 1)}>ก่อนหน้า</Link> : <span className={disabledClass}>ก่อนหน้า</span>}
        <span className="rounded-xl bg-slate-100 px-3 py-2 text-sm font-black text-slate-700">
          {pagination.page.toLocaleString("th-TH")} / {totalPages.toLocaleString("th-TH")}
        </span>
        {pagination.page < totalPages ? <Link className={linkClass} href={hrefFor(pagination.page + 1)}>ถัดไป</Link> : <span className={disabledClass}>ถัดไป</span>}
        {pagination.page < totalPages ? <Link className={linkClass} href={hrefFor(totalPages)}>หน้าสุดท้าย</Link> : <span className={disabledClass}>หน้าสุดท้าย</span>}
      </div>
    </div>
  );
}
