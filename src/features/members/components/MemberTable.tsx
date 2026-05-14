"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpDown, Edit3, Search, Trash2, UserX } from "lucide-react";
import type { Member } from "@/generated/prisma/client";
import { Button } from "@/components/ui/Button";
import { DataTable } from "@/components/ui/DataTable";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { disableMemberAction, disableMembersAction, updateMemberAction } from "@/features/members/actions";
import { closeLoading, showConfirm, showError, showLoading, showSuccess } from "@/lib/swal";

type SortKey = "memberCode" | "studentNo" | "fullName" | "classroom" | "status";

const sortOptions = [
  { label: "รหัสสมาชิก", value: "memberCode" },
  { label: "เลขที่", value: "studentNo" },
  { label: "ชื่อ-สกุล", value: "fullName" },
  { label: "ห้อง", value: "classroom" },
  { label: "สถานะ", value: "status" },
];

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

  const activeSelectedIds = selectedIds.filter((id) => members.some((member) => member.id === id && member.status === "ACTIVE"));
  const allVisibleActiveIds = rows.filter((member) => member.status === "ACTIVE").map((member) => member.id);
  const allVisibleSelected = allVisibleActiveIds.length > 0 && allVisibleActiveIds.every((id) => selectedIds.includes(id));

  function toggleSelected(id: string) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  }

  function toggleAllVisible() {
    setSelectedIds((prev) => {
      if (allVisibleSelected) return prev.filter((id) => !allVisibleActiveIds.includes(id));
      return Array.from(new Set([...prev, ...allVisibleActiveIds]));
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
      if (!(await showConfirm("ลบสมาชิก", `ต้องการลบ ${member.fullName} หรือไม่?`))) return;
      showLoading();
      const result = await disableMemberAction(member.id);
      closeLoading();
      if (result.success) {
        await showSuccess(result.message ?? "ลบสมาชิกแล้ว");
        setSelectedIds((prev) => prev.filter((id) => id !== member.id));
        router.refresh();
      } else await showError(result.message);
    });
  }

  function disableSelected() {
    startTransition(async () => {
      if (!(await showConfirm("ลบสมาชิกที่เลือก", `ต้องการลบสมาชิก ${activeSelectedIds.length} รายการหรือไม่?`))) return;
      showLoading();
      const result = await disableMembersAction(activeSelectedIds);
      closeLoading();
      if (result.success) {
        await showSuccess(result.message ?? "ลบสมาชิกที่เลือกแล้ว");
        setSelectedIds([]);
        router.refresh();
      } else await showError(result.message);
    });
  }

  return (
    <>
      <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm md:grid-cols-[1fr_180px_140px_auto] md:items-end">
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
        <Button type="button" variant="secondary" className="gap-2" onClick={() => setSortDirection((value) => (value === "asc" ? "desc" : "asc"))}>
          <ArrowUpDown size={16} />{sortDirection === "asc" ? "น้อยไปมาก" : "มากไปน้อย"}
        </Button>
        <Button type="button" variant="danger" className="gap-2" disabled={pending || activeSelectedIds.length === 0} onClick={disableSelected}>
          <Trash2 size={16} />ลบที่เลือก ({activeSelectedIds.length})
        </Button>
      </div>

      <DataTable>
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="w-10 p-3">
                <input type="checkbox" checked={allVisibleSelected} onChange={toggleAllVisible} aria-label="เลือกสมาชิกทั้งหมดที่แสดง" />
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
            {rows.map((member) => (
              <tr key={member.id} className="border-t border-slate-100">
                <td className="p-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(member.id)}
                    disabled={member.status === "INACTIVE"}
                    onChange={() => toggleSelected(member.id)}
                    aria-label={`เลือก ${member.fullName}`}
                  />
                </td>
                <td className="p-3">{member.memberCode}</td>
                <td className="p-3">{member.studentNo ?? "-"}</td>
                <td className="p-3 font-medium text-slate-950">{member.fullName}</td>
                <td className="p-3">{member.classroom ?? "-"}</td>
                <td className="p-3">{member.phone ?? "-"}</td>
                <td className="p-3"><StatusBadge status={member.status} /></td>
                <td className="p-3">
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="secondary" className="gap-2" onClick={() => openEdit(member)}>
                      <Edit3 size={16} />แก้ไข
                    </Button>
                    <Button type="button" variant="danger" className="gap-2" disabled={pending || member.status === "INACTIVE"} onClick={() => disableOne(member)}>
                      <UserX size={16} />ลบ
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </DataTable>

      <div className="grid gap-3 md:hidden">
        {rows.map((member) => (
          <div key={member.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <label className="flex items-start gap-3">
                <input
                  className="mt-1"
                  type="checkbox"
                  checked={selectedIds.includes(member.id)}
                  disabled={member.status === "INACTIVE"}
                  onChange={() => toggleSelected(member.id)}
                  aria-label={`เลือก ${member.fullName}`}
                />
                <span>
                  <span className="block font-semibold text-slate-950">{member.fullName}</span>
                  <span className="block text-sm text-slate-500">รหัส {member.memberCode} • เลขที่ {member.studentNo ?? "-"}</span>
                </span>
              </label>
              <StatusBadge status={member.status} />
            </div>
            <p className="mt-2 text-sm text-slate-500">{member.classroom ?? "-"} {member.phone ? `• ${member.phone}` : ""}</p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Button type="button" variant="secondary" className="gap-2" onClick={() => openEdit(member)}>
                <Edit3 size={16} />แก้ไข
              </Button>
              <Button type="button" variant="danger" className="gap-2" disabled={pending || member.status === "INACTIVE"} onClick={() => disableOne(member)}>
                <UserX size={16} />ลบ
              </Button>
            </div>
          </div>
        ))}
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
