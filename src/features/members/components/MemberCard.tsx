"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Edit3, UserX } from "lucide-react";
import type { Member } from "@/generated/prisma/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { disableMemberAction, updateMemberAction } from "@/features/members/actions";
import { closeLoading, showConfirm, showError, showLoading, showSuccess } from "@/lib/swal";

export function MemberCard({ member }: { member: Member }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    memberCode: member.memberCode,
    studentNo: member.studentNo ?? "",
    fullName: member.fullName,
    classroom: member.classroom ?? "",
    phone: member.phone ?? "",
  });

  return (
    <>
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:hidden">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-semibold text-slate-950">{member.fullName}</p>
            <p className="text-sm text-slate-500">รหัส {member.memberCode} • เลขที่ {member.studentNo ?? "-"}</p>
          </div>
          <StatusBadge status={member.status} />
        </div>
        <p className="mt-2 text-sm text-slate-500">{member.classroom ?? "-"} {member.phone ? `• ${member.phone}` : ""}</p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button type="button" variant="secondary" className="gap-2" onClick={() => setOpen(true)}>
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
      </div>

      <Modal title="แก้ไขสมาชิก" open={open} onClose={() => setOpen(false)}>
        <form
          className="grid gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            startTransition(async () => {
              showLoading("กำลังแก้ไขสมาชิก");
              const result = await updateMemberAction(member.id, form);
              closeLoading();
              if (result.success) {
                await showSuccess(result.message ?? "แก้ไขสำเร็จ");
                setOpen(false);
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
          <Button disabled={pending}>บันทึกการแก้ไข</Button>
        </form>
      </Modal>
    </>
  );
}
