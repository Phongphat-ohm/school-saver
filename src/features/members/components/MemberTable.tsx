"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Edit3, UserX } from "lucide-react";
import type { Member } from "@/generated/prisma/client";
import { Button } from "@/components/ui/Button";
import { DataTable } from "@/components/ui/DataTable";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { disableMemberAction, updateMemberAction } from "@/features/members/actions";
import { closeLoading, showConfirm, showError, showLoading, showSuccess } from "@/lib/swal";

export function MemberTable({ members }: { members: Member[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState<Member | null>(null);
  const [form, setForm] = useState({ memberCode: "", studentNo: "", fullName: "", classroom: "", phone: "" });

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

  return (
    <>
      <DataTable>
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
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
            {members.map((member) => (
              <tr key={member.id} className="border-t border-slate-100">
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
                    <Button
                      type="button"
                      variant="danger"
                      className="gap-2"
                      disabled={member.status === "INACTIVE"}
                      onClick={() => {
                        startTransition(async () => {
                          if (!(await showConfirm("ปิดใช้งานสมาชิก", `ต้องการปิดใช้งาน ${member.fullName} หรือไม่?`))) return;
                          showLoading();
                          const result = await disableMemberAction(member.id);
                          closeLoading();
                          if (result.success) {
                            await showSuccess(result.message ?? "ปิดใช้งานแล้ว");
                            router.refresh();
                          } else await showError(result.message);
                        });
                      }}
                    >
                      <UserX size={16} />ปิดใช้งาน
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </DataTable>

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
