"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpDown, ChevronLeft, ChevronRight, Edit3, EyeOff, Search, Trash2, UserCheck, UserX } from "lucide-react";
import type { Member } from "@/generated/prisma/client";
import { Button } from "@/components/ui/Button";
import { DataTable } from "@/components/ui/DataTable";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { disableMemberAction, disableMembersAction, enableMemberAction, enableMembersAction, hideMemberAction, hideMembersAction, updateMemberAction } from "@/features/members/actions";
import { MemberQrButton } from "@/features/members/components/MemberQrButton";
import { closeLoading, showConfirm, showError, showLoading, showSuccess } from "@/lib/swal";

type SortKey = "memberCode" | "studentNo" | "fullName" | "classroom" | "status";

const sortOptions = [
  { label: "รหัสสมาชิก", value: "memberCode" },
  { label: "เลขที่", value: "studentNo" },
  { label: "ชื่อ-สกุล", value: "fullName" },
  { label: "ห้อง", value: "classroom" },
  { label: "สถานะ", value: "status" },
];

const pageSizeOptions = [10, 25, 50, 100] as const;

function memberText(member: Member, key: SortKey) {
  return String(member[key] ?? "").toLowerCase();
}

export function MemberTable({ members }: { members: Member[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState<Member | null>(null);
  const [keyword, setKeyword] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("studentNo");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<(typeof pageSizeOptions)[number]>(25);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [form, setForm] = useState({ memberCode: "", studentNo: "", fullName: "", classroom: "", phone: "" });

  const rows = useMemo(() => {
    const search = keyword.trim().toLowerCase();
    return [...members]
      .filter((member) => {
        if (!search) return true;
        return [member.memberCode, member.studentNo, member.fullName, member.classroom, member.phone, member.status]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(search);
      })
      .sort((a, b) => {
        const result = memberText(a, sortKey).localeCompare(memberText(b, sortKey), "th", { numeric: true });
        return sortDirection === "asc" ? result : -result;
      });
  }, [keyword, members, sortDirection, sortKey]);

  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageStart = rows.length === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1;
  const pageEnd = Math.min(safeCurrentPage * pageSize, rows.length);
  const pageRows = rows.slice((safeCurrentPage - 1) * pageSize, safeCurrentPage * pageSize);
  const activeSelectedIds = selectedIds.filter((id) => members.some((member) => member.id === id && member.status === "ACTIVE"));
  const inactiveSelectedIds = selectedIds.filter((id) => members.some((member) => member.id === id && member.status === "INACTIVE"));
  const hideSelectedIds = selectedIds.filter((id) => members.some((member) => member.id === id));
  const allVisibleIds = pageRows.map((member) => member.id);
  const allVisibleSelected = allVisibleIds.length > 0 && allVisibleIds.every((id) => selectedIds.includes(id));

  useEffect(() => {
    setCurrentPage(1);
  }, [keyword, pageSize, sortDirection, sortKey]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  function toggleSelected(id: string) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  }

  function toggleAllVisible() {
    setSelectedIds((prev) => {
      if (allVisibleSelected) return prev.filter((id) => !allVisibleIds.includes(id));
      return Array.from(new Set([...prev, ...allVisibleIds]));
    });
  }

  function openEdit(member: Member) {
    setEditing(member);
    setForm({
      memberCode: member.memberCode,
      studentNo: member.studentNo ?? "",
      fullName: member.fullName,
      classroom: member.classroom ?? "",
      phone: member.phone ?? "",
    });
  }

  function disableOne(member: Member) {
    startTransition(async () => {
      if (!(await showConfirm("ปิดใช้งานสมาชิก", `ต้องการปิดใช้งาน ${member.fullName} หรือไม่?`))) return;
      showLoading();
      const result = await disableMemberAction(member.id);
      closeLoading();
      if (result.success) {
        await showSuccess(result.message ?? "ปิดใช้งานสมาชิกแล้ว");
        setSelectedIds((prev) => prev.filter((id) => id !== member.id));
        router.refresh();
      } else await showError(result.message);
    });
  }

  function hideOne(member: Member) {
    startTransition(async () => {
      if (!(await showConfirm("ลบแบบไม่เห็น", `ต้องการซ่อน ${member.fullName} ออกจากรายการสมาชิกหรือไม่? ประวัติเดิมจะยังอยู่`))) return;
      showLoading();
      const result = await hideMemberAction(member.id);
      closeLoading();
      if (result.success) {
        await showSuccess(result.message ?? "ลบแบบไม่เห็นแล้ว");
        setSelectedIds((prev) => prev.filter((id) => id !== member.id));
        router.refresh();
      } else await showError(result.message);
    });
  }

  function enableOne(member: Member) {
    startTransition(async () => {
      if (!(await showConfirm("เปิดใช้งานสมาชิก", `ต้องการเปิดใช้งาน ${member.fullName} หรือไม่? ระบบจะตรวจ limit สมาชิกก่อนเปิดใช้งาน`))) return;
      showLoading();
      const result = await enableMemberAction(member.id);
      closeLoading();
      if (result.success) {
        await showSuccess(result.message ?? "เปิดใช้งานสมาชิกแล้ว");
        setSelectedIds((prev) => prev.filter((id) => id !== member.id));
        router.refresh();
      } else await showError(result.message);
    });
  }

  function disableSelected() {
    startTransition(async () => {
      if (!(await showConfirm("ปิดใช้งานสมาชิกที่เลือก", `ต้องการปิดใช้งานสมาชิก ${activeSelectedIds.length} รายการหรือไม่?`))) return;
      showLoading();
      const result = await disableMembersAction(activeSelectedIds);
      closeLoading();
      if (result.success) {
        await showSuccess(result.message ?? "ปิดใช้งานสมาชิกที่เลือกแล้ว");
        setSelectedIds([]);
        router.refresh();
      } else await showError(result.message);
    });
  }

  function enableSelected() {
    startTransition(async () => {
      if (!(await showConfirm("เปิดใช้งานสมาชิกที่เลือก", `ต้องการเปิดใช้งานสมาชิก ${inactiveSelectedIds.length} รายการหรือไม่? ระบบจะตรวจ limit สมาชิกก่อนเปิดใช้งาน`))) return;
      showLoading();
      const result = await enableMembersAction(inactiveSelectedIds);
      closeLoading();
      if (result.success) {
        await showSuccess(result.message ?? "เปิดใช้งานสมาชิกที่เลือกแล้ว");
        setSelectedIds([]);
        router.refresh();
      } else await showError(result.message);
    });
  }

  function hideSelected() {
    startTransition(async () => {
      if (!(await showConfirm("ลบแบบไม่เห็นสมาชิกที่เลือก", `ต้องการซ่อนสมาชิก ${hideSelectedIds.length} รายการออกจากรายการหรือไม่? ประวัติเดิมจะยังอยู่`))) return;
      showLoading();
      const result = await hideMembersAction(hideSelectedIds);
      closeLoading();
      if (result.success) {
        await showSuccess(result.message ?? "ลบแบบไม่เห็นสมาชิกที่เลือกแล้ว");
        setSelectedIds([]);
        router.refresh();
      } else await showError(result.message);
    });
  }

  return (
    <>
      <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm md:grid-cols-[1fr_180px_140px_130px_auto_auto_auto] md:items-end">
        <div className="relative">
          <Input
            label="ค้นหาสมาชิก"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="ชื่อ, รหัส, เลขที่, ห้อง, เบอร์โทร"
            className="pl-10"
          />
          <Search className="pointer-events-none absolute bottom-3 left-3 text-slate-400" size={18} />
        </div>
        <Select label="เรียงตาม" value={sortKey} onChange={(event) => setSortKey(event.target.value as SortKey)} options={sortOptions} />
        <Select
          label="ต่อหน้า"
          value={String(pageSize)}
          onChange={(event) => setPageSize(Number(event.target.value) as (typeof pageSizeOptions)[number])}
          options={pageSizeOptions.map((size) => ({ value: String(size), label: `${size} คน` }))}
        />
        <Button type="button" variant="secondary" className="gap-2" onClick={() => setSortDirection((value) => (value === "asc" ? "desc" : "asc"))}>
          <ArrowUpDown size={16} />
          {sortDirection === "asc" ? "น้อยไปมาก" : "มากไปน้อย"}
        </Button>
        <Button type="button" variant="danger" className="gap-2" disabled={pending || activeSelectedIds.length === 0} onClick={disableSelected}>
          <UserX size={16} />
          ปิดใช้งาน ({activeSelectedIds.length})
        </Button>
        <Button type="button" variant="secondary" className="gap-2" disabled={pending || inactiveSelectedIds.length === 0} onClick={enableSelected}>
          <UserCheck size={16} />
          เปิดใช้งาน ({inactiveSelectedIds.length})
        </Button>
        <Button type="button" variant="danger" className="gap-2" disabled={pending || hideSelectedIds.length === 0} onClick={hideSelected}>
          <Trash2 size={16} />
          ลบ ({hideSelectedIds.length})
        </Button>
      </div>

      <DataTable>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-3">
          <p className="text-xs font-medium text-slate-600">แสดง {pageStart}-{pageEnd} จาก {rows.length} รายการ</p>
          <p className="text-xs font-medium text-slate-500">เลือกอยู่ {selectedIds.length} รายการ</p>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="w-10 p-3">
                <input type="checkbox" checked={allVisibleSelected} onChange={toggleAllVisible} aria-label="เลือกสมาชิกทั้งหมดในหน้านี้" />
              </th>
              <th className="p-3">รหัส</th>
              <th className="p-3">เลขที่</th>
              <th className="p-3">ชื่อ</th>
              <th className="p-3">ห้อง</th>
              <th className="p-3">เบอร์โทร</th>
              <th className="p-3">สถานะ</th>
              <th className="p-3 text-right">จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.length ? (
              pageRows.map((member) => (
                <tr key={member.id} className="border-t border-slate-100">
                  <td className="p-3">
                    <input type="checkbox" checked={selectedIds.includes(member.id)} onChange={() => toggleSelected(member.id)} aria-label={`เลือก ${member.fullName}`} />
                  </td>
                  <td className="p-3">{member.memberCode}</td>
                  <td className="p-3">{member.studentNo ?? "-"}</td>
                  <td className="p-3 font-medium text-slate-950">{member.fullName}</td>
                  <td className="p-3">{member.classroom ?? "-"}</td>
                  <td className="p-3">{member.phone ?? "-"}</td>
                  <td className="p-3"><StatusBadge status={member.status} /></td>
                  <td className="p-3">
                    <div className="flex justify-end gap-2">
                      <MemberQrButton memberCode={member.memberCode} fullName={member.fullName} />
                      <Button type="button" variant="secondary" className="gap-2" onClick={() => openEdit(member)}>
                        <Edit3 size={16} />
                        แก้ไข
                      </Button>
                      {member.status === "INACTIVE" ? (
                        <Button type="button" variant="secondary" className="gap-2" disabled={pending} onClick={() => enableOne(member)}>
                          <UserCheck size={16} />
                          เปิดใช้งาน
                        </Button>
                      ) : (
                        <Button type="button" variant="danger" className="gap-2" disabled={pending} onClick={() => disableOne(member)}>
                          <UserX size={16} />
                          ปิดใช้งาน
                        </Button>
                      )}
                      <Button type="button" variant="danger" className="gap-2" disabled={pending} onClick={() => hideOne(member)}>
                        <Trash2 size={16} />
                        ลบ
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8} className="p-4 text-center text-sm text-slate-500">ไม่พบสมาชิกที่ตรงกับคำค้นหา</td>
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
      </DataTable>

      <div className="grid gap-3 md:hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <p className="text-xs font-medium text-slate-600">แสดง {pageStart}-{pageEnd} จาก {rows.length} รายการ</p>
          <Select
            label="ต่อหน้า"
            value={String(pageSize)}
            onChange={(event) => setPageSize(Number(event.target.value) as (typeof pageSizeOptions)[number])}
            options={pageSizeOptions.map((size) => ({ value: String(size), label: `${size} คน` }))}
          />
        </div>
        {pageRows.map((member) => (
          <div key={member.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <label className="flex items-start gap-3">
                <input className="mt-1" type="checkbox" checked={selectedIds.includes(member.id)} onChange={() => toggleSelected(member.id)} aria-label={`เลือก ${member.fullName}`} />
                <span>
                  <span className="block font-semibold text-slate-950">{member.fullName}</span>
                  <span className="block text-sm text-slate-500">รหัส {member.memberCode} • เลขที่ {member.studentNo ?? "-"}</span>
                </span>
              </label>
              <StatusBadge status={member.status} />
            </div>
            <p className="mt-2 text-sm text-slate-500">{member.classroom ?? "-"} {member.phone ? `• ${member.phone}` : ""}</p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <MemberQrButton memberCode={member.memberCode} fullName={member.fullName} />
              <Button type="button" variant="secondary" className="gap-2" onClick={() => openEdit(member)}>
                <Edit3 size={16} />
                แก้ไข
              </Button>
              {member.status === "INACTIVE" ? (
                <Button type="button" variant="secondary" className="gap-2" disabled={pending} onClick={() => enableOne(member)}>
                  <UserCheck size={16} />
                  เปิดใช้งาน
                </Button>
              ) : (
                <Button type="button" variant="danger" className="gap-2" disabled={pending} onClick={() => disableOne(member)}>
                  <UserX size={16} />
                  ปิดใช้งาน
                </Button>
              )}
              <Button type="button" variant="danger" className="gap-2" disabled={pending} onClick={() => hideOne(member)}>
                <EyeOff size={16} />
                ลบไม่ให้เห็น
              </Button>
            </div>
          </div>
        ))}
        {pageRows.length === 0 ? <p className="rounded-2xl border border-slate-200 bg-white p-4 text-center text-sm text-slate-500 shadow-sm">ไม่พบสมาชิกที่ตรงกับคำค้นหา</p> : null}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
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

      <Modal title="แก้ไขสมาชิก" open={!!editing} onClose={() => setEditing(null)}>
        <form
          className="grid gap-3 md:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault();
            if (!editing) return;
            startTransition(async () => {
              showLoading("กำลังแก้ไขสมาชิก");
              const result = await updateMemberAction(editing.id, form);
              closeLoading();
              if (result.success) {
                await showSuccess(result.message ?? "แก้ไขสำเร็จ");
                setEditing(null);
                router.refresh();
              } else await showError(result.message);
            });
          }}
        >
          <Input label="รหัสสมาชิก" value={form.memberCode} onChange={(event) => setForm({ ...form, memberCode: event.target.value })} />
          <Input label="เลขที่" value={form.studentNo} onChange={(event) => setForm({ ...form, studentNo: event.target.value })} />
          <Input label="ชื่อ-สกุล" value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} />
          <Input label="ห้อง" value={form.classroom} onChange={(event) => setForm({ ...form, classroom: event.target.value })} />
          <Input label="เบอร์โทร" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
          <Button disabled={pending} className="md:col-span-2">บันทึกการแก้ไข</Button>
        </form>
      </Modal>
    </>
  );
}
