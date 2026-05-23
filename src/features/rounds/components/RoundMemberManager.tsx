"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, CircleSlash, Save, Search, UserCheck, UserMinus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { updateRoundMemberSelectionAction } from "@/features/rounds/actions";
import { closeLoading, showConfirm, showError, showLoading, showSuccess } from "@/lib/swal";

type RoundMemberMode = "COLLECT" | "WAIVE" | "SKIP";
type ViewMode = "ALL" | RoundMemberMode;

type RoundMemberManagementRow = {
  memberId: string;
  memberCode: string;
  studentNo: string | null;
  fullName: string;
  classroom: string | null;
  memberStatus: string;
  mode: RoundMemberMode;
  inRound: boolean;
  transactionCount: number;
  locked: boolean;
};

const modeLabels: Record<RoundMemberMode, string> = {
  COLLECT: "เก็บเงิน",
  WAIVE: "ยกเว้น",
  SKIP: "ไม่อยู่ในรอบ",
};

const viewModeLabels: Record<ViewMode, string> = {
  ALL: "ทั้งหมด",
  ...modeLabels,
};

const pageSizeOptions = [10, 25, 50, 100] as const;

export function RoundMemberManager({
  roundId,
  roundStatus,
  members,
}: {
  roundId: string;
  roundStatus: string;
  members: RoundMemberManagementRow[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [keyword, setKeyword] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<(typeof pageSizeOptions)[number]>(25);
  const [modes, setModes] = useState<Record<string, RoundMemberMode>>(() =>
    Object.fromEntries(members.map((member) => [member.memberId, member.mode])),
  );
  const canEdit = roundStatus === "OPEN";

  const filteredMembers = useMemo(() => {
    const search = keyword.trim().toLowerCase();
    return members.filter((member) => {
      const mode = modes[member.memberId] ?? member.mode;
      if (viewMode !== "ALL" && mode !== viewMode) return false;
      if (!search) return true;
      return [member.memberCode, member.studentNo, member.fullName, member.classroom, member.memberStatus]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(search);
    });
  }, [keyword, members, modes, viewMode]);

  const collectCount = members.filter((member) => modes[member.memberId] === "COLLECT").length;
  const waiveCount = members.filter((member) => modes[member.memberId] === "WAIVE").length;
  const skipCount = members.length - collectCount - waiveCount;
  const totalPages = Math.max(1, Math.ceil(filteredMembers.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageStart = filteredMembers.length === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1;
  const pageEnd = Math.min(safeCurrentPage * pageSize, filteredMembers.length);
  const pageRows = filteredMembers.slice((safeCurrentPage - 1) * pageSize, safeCurrentPage * pageSize);

  useEffect(() => {
    setCurrentPage(1);
  }, [keyword, pageSize, viewMode]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  function setMemberMode(member: RoundMemberManagementRow, mode: RoundMemberMode) {
    if (member.locked && mode !== "COLLECT") return;
    setModes((prev) => ({ ...prev, [member.memberId]: mode }));
  }

  function applyModeToFiltered(mode: RoundMemberMode) {
    setModes((prev) => ({
      ...prev,
      ...Object.fromEntries(filteredMembers.filter((member) => !member.locked || mode === "COLLECT").map((member) => [member.memberId, mode])),
    }));
  }

  function save() {
    startTransition(async () => {
      const confirmed = await showConfirm(
        "ยืนยันแก้ไขสมาชิกในรอบ",
        `รอบนี้จะเก็บเงิน ${collectCount} คน ยกเว้น ${waiveCount} คน และไม่อยู่ในรอบ ${skipCount} คน ต้องการบันทึกหรือไม่?`,
      );
      if (!confirmed) return;
      showLoading("กำลังบันทึกสมาชิกในรอบ");
      const result = await updateRoundMemberSelectionAction(
        roundId,
        members.map((member) => ({ memberId: member.memberId, mode: modes[member.memberId] ?? member.mode })),
      );
      closeLoading();
      if (result.success) {
        await showSuccess(result.message ?? "บันทึกสำเร็จ");
        router.refresh();
      } else {
        await showError(result.message);
      }
    });
  }

  return (
    <section className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-slate-950">แก้ไขสมาชิกในรอบ</h3>
          <p className="text-sm text-slate-500">เก็บ {collectCount} คน · ยกเว้น {waiveCount} คน · ไม่อยู่ในรอบ {skipCount} คน</p>
        </div>
        <Button type="button" className="gap-2" disabled={!canEdit || pending} onClick={save}>
          <Save size={18} />
          บันทึกสมาชิกในรอบ
        </Button>
      </div>

      {!canEdit ? (
        <p className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800">แก้ไขสมาชิกในรอบได้เฉพาะรอบที่เปิดอยู่เท่านั้น</p>
      ) : null}

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px_150px]">
        <div className="relative">
          <Input label="ค้นหาสมาชิก" value={keyword} disabled={pending} onChange={(event) => setKeyword(event.target.value)} placeholder="ชื่อ, รหัส, เลขที่, ห้อง" className="pl-10" />
          <Search className="pointer-events-none absolute bottom-3 left-3 text-slate-400" size={18} />
        </div>
        <Select
          label="ดูสถานะในรอบ"
          value={viewMode}
          disabled={pending}
          onChange={(event) => setViewMode(event.target.value as ViewMode)}
          options={(["ALL", "COLLECT", "WAIVE", "SKIP"] as const).map((mode) => ({ value: mode, label: viewModeLabels[mode] }))}
        />
        <Select
          label="ต่อหน้า"
          value={String(pageSize)}
          disabled={pending}
          onChange={(event) => setPageSize(Number(event.target.value) as (typeof pageSizeOptions)[number])}
          options={pageSizeOptions.map((size) => ({ value: String(size), label: `${size} คน` }))}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" className="gap-2" disabled={!canEdit || pending || filteredMembers.length === 0} onClick={() => applyModeToFiltered("COLLECT")}>
          <UserCheck size={16} />
          เก็บที่กรอง
        </Button>
        <Button type="button" variant="secondary" className="gap-2" disabled={!canEdit || pending || filteredMembers.length === 0} onClick={() => applyModeToFiltered("WAIVE")}>
          <UserMinus size={16} />
          ยกเว้นที่กรอง
        </Button>
        <Button type="button" variant="secondary" className="gap-2" disabled={!canEdit || pending || filteredMembers.length === 0} onClick={() => applyModeToFiltered("SKIP")}>
          <CircleSlash size={16} />
          ไม่อยู่ในรอบที่กรอง
        </Button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-3">
          <p className="text-xs font-medium text-slate-600">แสดง {pageStart}-{pageEnd} จาก {filteredMembers.length} รายการ</p>
          <p className="text-xs font-medium text-slate-500">สมาชิกที่มีรายการชำระแล้วจะเปลี่ยนออกจากรอบไม่ได้</p>
        </div>
        <table className="w-full min-w-[780px] text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="p-3">สมาชิก</th>
              <th className="p-3">เลขที่</th>
              <th className="p-3">ห้อง</th>
              <th className="p-3">สถานะในรอบ</th>
              <th className="p-3">หมายเหตุ</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.length ? (
              pageRows.map((member) => {
                const mode = modes[member.memberId] ?? member.mode;
                return (
                  <tr key={member.memberId} className="border-t border-slate-100">
                    <td className="p-3">
                      <p className="font-semibold text-slate-950">{member.fullName}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <p className="text-xs text-slate-500">รหัส {member.memberCode}</p>
                        {member.memberStatus !== "ACTIVE" ? <StatusBadge status={member.memberStatus} /> : null}
                      </div>
                    </td>
                    <td className="p-3 text-slate-700">{member.studentNo ?? "-"}</td>
                    <td className="p-3 text-slate-700">{member.classroom ?? "-"}</td>
                    <td className="p-3">
                      <select
                        value={mode}
                        disabled={!canEdit || pending || member.locked}
                        onChange={(event) => setMemberMode(member, event.target.value as RoundMemberMode)}
                        className="min-h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {(["SKIP", "COLLECT", "WAIVE"] as const).map((option) => (
                          <option key={option} value={option}>
                            {modeLabels[option]}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="p-3 text-xs text-slate-500">{member.locked ? `ล็อกเพราะมีรายการชำระ ${member.transactionCount} รายการ` : member.inRound ? "อยู่ในรอบนี้แล้ว" : "ยังไม่อยู่ในรอบนี้"}</td>
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
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 p-3">
          <p className="text-xs font-medium text-slate-500">หน้า {safeCurrentPage} จาก {totalPages}</p>
          <div className="flex gap-2">
            <Button type="button" variant="secondary" disabled={pending || safeCurrentPage <= 1} onClick={() => setCurrentPage((page) => Math.max(1, page - 1))} className="gap-2">
              <ChevronLeft size={16} />
              ก่อนหน้า
            </Button>
            <Button type="button" variant="secondary" disabled={pending || safeCurrentPage >= totalPages} onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))} className="gap-2">
              ถัดไป
              <ChevronRight size={16} />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
