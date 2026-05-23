"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarPlus, ChevronLeft, ChevronRight, CircleSlash, Search, UserCheck, UserMinus } from "lucide-react";
import { createCollectionRoundAction } from "@/features/rounds/actions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useActionLock } from "@/hooks/useActionLock";
import { showConfirm, showError, showLoading, showSuccess, closeLoading } from "@/lib/swal";

type RoundMemberSelection = {
  id: string;
  memberCode: string;
  studentNo: string | null;
  fullName: string;
  classroom: string | null;
};

type MemberMode = "COLLECT" | "WAIVE" | "SKIP";
type MemberViewMode = "ALL" | MemberMode;

const modeLabels: Record<MemberMode, string> = {
  COLLECT: "เก็บเงิน",
  WAIVE: "ยกเว้น",
  SKIP: "ไม่รวม",
};

const modeDescriptions: Record<MemberMode, string> = {
  COLLECT: "สร้างยอดที่ต้องจ่ายให้สมาชิก",
  WAIVE: "อยู่ในรอบแต่ไม่คิดยอด",
  SKIP: "ไม่อยู่ในรอบนี้",
};

const viewModeLabels: Record<MemberViewMode, string> = {
  ALL: "ทั้งหมด",
  ...modeLabels,
};

const pageSizeOptions = [10, 25, 50, 100] as const;

export function RoundForm({ members }: { members: RoundMemberSelection[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const actionLock = useActionLock();
  const isSubmitting = pending || actionLock.locked;
  const [memberSearch, setMemberSearch] = useState("");
  const [classroomFilter, setClassroomFilter] = useState("ALL");
  const [viewMode, setViewMode] = useState<MemberViewMode>("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<(typeof pageSizeOptions)[number]>(25);
  const [memberModes, setMemberModes] = useState<Record<string, MemberMode>>(() =>
    Object.fromEntries(members.map((member) => [member.id, "SKIP" as MemberMode])),
  );
  const [form, setForm] = useState({
    title: "",
    description: "",
    targetAmount: 100,
    startDate: "",
    dueDate: "",
    fineEnabled: true,
    fineType: "DAILY",
    fineAmount: 5,
    fineMaxAmount: "",
  });
  const set = (key: keyof typeof form, value: string | number | boolean) => setForm((prev) => ({ ...prev, [key]: value }));
  const setMemberMode = (id: string, mode: MemberMode) => setMemberModes((prev) => ({ ...prev, [id]: mode }));
  const applyModeToMembers = (targetMembers: RoundMemberSelection[], mode: MemberMode) =>
    setMemberModes((prev) => ({
      ...prev,
      ...Object.fromEntries(targetMembers.map((member) => [member.id, mode])),
    }));

  const classrooms = useMemo(() => {
    return Array.from(new Set(members.map((member) => member.classroom?.trim()).filter(Boolean) as string[])).sort((a, b) =>
      a.localeCompare(b, "th"),
    );
  }, [members]);

  const filteredMembers = useMemo(() => {
    const search = memberSearch.trim().toLowerCase();
    return members.filter((member) => {
      const classroom = member.classroom?.trim() ?? "";
      if (classroomFilter !== "ALL" && classroom !== classroomFilter) return false;
      if (viewMode !== "ALL" && (memberModes[member.id] ?? "SKIP") !== viewMode) return false;
      if (!search) return true;
      return [member.memberCode, member.studentNo, member.fullName, classroom]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(search);
    });
  }, [classroomFilter, memberModes, memberSearch, members, viewMode]);

  const includedMemberIds = members.filter((member) => memberModes[member.id] === "COLLECT").map((member) => member.id);
  const waivedMemberIds = members.filter((member) => memberModes[member.id] === "WAIVE").map((member) => member.id);
  const skippedCount = members.length - includedMemberIds.length - waivedMemberIds.length;
  const filteredIncludedCount = filteredMembers.filter((member) => memberModes[member.id] === "COLLECT").length;
  const filteredWaivedCount = filteredMembers.filter((member) => memberModes[member.id] === "WAIVE").length;
  const filteredSkippedCount = filteredMembers.length - filteredIncludedCount - filteredWaivedCount;
  const totalPages = Math.max(1, Math.ceil(filteredMembers.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageStart = filteredMembers.length === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1;
  const pageEnd = Math.min(safeCurrentPage * pageSize, filteredMembers.length);
  const paginatedMembers = filteredMembers.slice((safeCurrentPage - 1) * pageSize, safeCurrentPage * pageSize);

  useEffect(() => {
    setCurrentPage(1);
  }, [classroomFilter, memberSearch, pageSize, viewMode]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  return (
    <form
      className="grid gap-4 md:grid-cols-2"
      onSubmit={(event) => {
        event.preventDefault();
        if (!actionLock.acquire()) return;
        startTransition(async () => {
          try {
            if (includedMemberIds.length + waivedMemberIds.length === 0) {
              await showError("กรุณาเลือกสมาชิกอย่างน้อย 1 คนสำหรับรอบนี้");
              return;
            }
            const confirmed = await showConfirm(
              "ยืนยันสร้างรอบ",
              `รอบนี้จะเก็บเงิน ${includedMemberIds.length} คน ยกเว้น ${waivedMemberIds.length} คน และไม่รวม ${skippedCount} คน ต้องการดำเนินการต่อหรือไม่?`,
            );
            if (!confirmed) return;
            showLoading("กำลังสร้างรอบ");
            const result = await createCollectionRoundAction({
              ...form,
              fineMaxAmount: form.fineMaxAmount === "" ? undefined : Number(form.fineMaxAmount),
              includedMemberIds,
              waivedMemberIds,
            });
            closeLoading();
            if (result.success) {
              await showSuccess(result.message ?? "สำเร็จ");
              router.push("/rounds");
              router.refresh();
            } else await showError(result.message);
          } finally {
            closeLoading();
            actionLock.release();
          }
        });
      }}
    >
      <Input label="ชื่อรอบ" value={form.title} disabled={isSubmitting} onChange={(event) => set("title", event.target.value)} />
      <Input label="รายละเอียด" value={form.description} disabled={isSubmitting} onChange={(event) => set("description", event.target.value)} />
      <Input label="ยอดเป้าหมายต่อคน" type="number" value={form.targetAmount} disabled={isSubmitting} onChange={(event) => set("targetAmount", Number(event.target.value))} />
      <Input label="วันที่เริ่มเก็บ" type="date" value={form.startDate} disabled={isSubmitting} onChange={(event) => set("startDate", event.target.value)} />
      <Input label="วันที่ครบกำหนด" type="date" value={form.dueDate} disabled={isSubmitting} onChange={(event) => set("dueDate", event.target.value)} />
      <Select
        label="ประเภทค่าปรับ"
        value={form.fineType}
        disabled={isSubmitting}
        onChange={(event) => set("fineType", event.target.value)}
        options={[
          { value: "NONE", label: "ไม่มี" },
          { value: "DAILY", label: "รายวัน" },
          { value: "WEEKLY", label: "รายสัปดาห์" },
          { value: "FIXED", label: "คงที่" },
        ]}
      />
      <Input label="ค่าปรับ" type="number" value={form.fineAmount} disabled={isSubmitting} onChange={(event) => set("fineAmount", Number(event.target.value))} />
      <Input label="ค่าปรับสูงสุด" type="number" value={form.fineMaxAmount} disabled={isSubmitting} onChange={(event) => set("fineMaxAmount", event.target.value)} />
      <label className="flex min-h-11 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700">
        <input type="checkbox" checked={form.fineEnabled} disabled={isSubmitting} onChange={(event) => set("fineEnabled", event.target.checked)} />
        เปิดใช้ค่าปรับ
      </label>

      <section className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 md:col-span-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-950">เลือกสมาชิกสำหรับรอบนี้</h3>
            <p className="text-xs text-slate-500">เก็บ {includedMemberIds.length} คน · ยกเว้น {waivedMemberIds.length} คน · ไม่รวม {skippedCount} คน</p>
          </div>
          <div className="grid w-full gap-2 sm:w-auto sm:grid-cols-3">
            <Button type="button" variant="secondary" disabled={isSubmitting || filteredMembers.length === 0} onClick={() => applyModeToMembers(filteredMembers, "COLLECT")} className="gap-2">
              <UserCheck size={16} />
              เก็บที่กรอง
            </Button>
            <Button type="button" variant="secondary" disabled={isSubmitting || filteredMembers.length === 0} onClick={() => applyModeToMembers(filteredMembers, "WAIVE")} className="gap-2">
              <UserMinus size={16} />
              ยกเว้นที่กรอง
            </Button>
            <Button type="button" variant="secondary" disabled={isSubmitting || filteredMembers.length === 0} onClick={() => applyModeToMembers(filteredMembers, "SKIP")} className="gap-2">
              <CircleSlash size={16} />
              ไม่รวมที่กรอง
            </Button>
          </div>
        </div>

        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_180px_150px]">
          <div className="relative">
            <Input label="ค้นหาสมาชิก" value={memberSearch} disabled={isSubmitting} onChange={(event) => setMemberSearch(event.target.value)} placeholder="ชื่อ, รหัส, เลขที่, ห้อง" className="pl-10" />
            <Search className="pointer-events-none absolute bottom-3 left-3 text-slate-400" size={18} />
          </div>
          <Select
            label="กรองตามห้อง"
            value={classroomFilter}
            disabled={isSubmitting}
            onChange={(event) => setClassroomFilter(event.target.value)}
            options={[
              { value: "ALL", label: "ทุกห้อง" },
              ...classrooms.map((classroom) => ({ value: classroom, label: classroom })),
            ]}
          />
          <Select
            label="ดูสถานะ"
            value={viewMode}
            disabled={isSubmitting}
            onChange={(event) => setViewMode(event.target.value as MemberViewMode)}
            options={(["ALL", "COLLECT", "WAIVE", "SKIP"] as const).map((mode) => ({ value: mode, label: viewModeLabels[mode] }))}
          />
          <Select
            label="ต่อหน้า"
            value={String(pageSize)}
            disabled={isSubmitting}
            onChange={(event) => setPageSize(Number(event.target.value) as (typeof pageSizeOptions)[number])}
            options={pageSizeOptions.map((size) => ({ value: String(size), label: `${size} คน` }))}
          />
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-3">
            <p className="text-xs font-medium text-slate-600">
              รายการที่เห็น {filteredMembers.length} คน: เก็บ {filteredIncludedCount} · ยกเว้น {filteredWaivedCount} · ไม่รวม {filteredSkippedCount}
            </p>
            <p className="text-xs font-medium text-slate-500">
              แสดง {pageStart}-{pageEnd} จาก {filteredMembers.length}
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-slate-50 text-left text-slate-500">
                <tr>
                  <th className="p-3">สมาชิก</th>
                  <th className="p-3">เลขที่</th>
                  <th className="p-3">ห้อง</th>
                  <th className="p-3">สถานะในรอบ</th>
                  <th className="p-3">ผลลัพธ์</th>
                </tr>
              </thead>
              <tbody>
                {paginatedMembers.length ? (
                  paginatedMembers.map((member) => {
                    const mode = memberModes[member.id] ?? "SKIP";
                    return (
                      <tr key={member.id} className="border-t border-slate-100">
                        <td className="p-3">
                          <p className="font-medium text-slate-950">{member.fullName}</p>
                          <p className="text-xs text-slate-500">รหัส {member.memberCode}</p>
                        </td>
                        <td className="p-3 text-slate-700">{member.studentNo ?? "-"}</td>
                        <td className="p-3 text-slate-700">{member.classroom ?? "-"}</td>
                        <td className="p-3">
                          <select
                            value={mode}
                            disabled={isSubmitting}
                            onChange={(event) => setMemberMode(member.id, event.target.value as MemberMode)}
                            className="min-h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {(["SKIP", "COLLECT", "WAIVE"] as const).map((option) => (
                              <option key={option} value={option}>
                                {modeLabels[option]}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="p-3 text-xs text-slate-500">{modeDescriptions[mode]}</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} className="p-4 text-center text-sm text-slate-500">
                      ไม่พบสมาชิกที่ตรงกับเงื่อนไข
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 p-3">
            <p className="text-xs font-medium text-slate-500">
              หน้า {safeCurrentPage} จาก {totalPages}
            </p>
            <div className="flex gap-2">
              <Button type="button" variant="secondary" disabled={isSubmitting || safeCurrentPage <= 1} onClick={() => setCurrentPage((page) => Math.max(1, page - 1))} className="gap-2">
                <ChevronLeft size={16} />
                ก่อนหน้า
              </Button>
              <Button type="button" variant="secondary" disabled={isSubmitting || safeCurrentPage >= totalPages} onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))} className="gap-2">
                ถัดไป
                <ChevronRight size={16} />
              </Button>
            </div>
          </div>
        </div>
      </section>

      <div className="flex items-end md:col-span-2">
        <Button disabled={isSubmitting || members.length === 0} className="w-full gap-2">
          <CalendarPlus size={18} />
          {isSubmitting ? "กำลังสร้างรอบ..." : "สร้างรอบ"}
        </Button>
      </div>
    </form>
  );
}
