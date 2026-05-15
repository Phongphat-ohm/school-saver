"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UserPlus } from "lucide-react";
import { createMemberAction } from "@/features/members/actions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useActionLock } from "@/hooks/useActionLock";
import { showError, showLoading, showSuccess, closeLoading } from "@/lib/swal";

export function MemberForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const actionLock = useActionLock();
  const isSubmitting = pending || actionLock.locked;
  const [form, setForm] = useState({ memberCode: "", studentNo: "", fullName: "", classroom: "", phone: "" });
  const set = (key: keyof typeof form, value: string) => setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <form
      className="grid gap-3 md:grid-cols-2"
      onSubmit={(event) => {
        event.preventDefault();
        if (!actionLock.acquire()) return;
        startTransition(async () => {
          try {
            showLoading("กำลังเพิ่มสมาชิก");
            const result = await createMemberAction(form);
            closeLoading();
            if (result.success) {
              await showSuccess(result.message ?? "สำเร็จ");
              setForm({ memberCode: "", studentNo: "", fullName: "", classroom: "", phone: "" });
              router.refresh();
            } else await showError(result.message);
          } finally {
            closeLoading();
            actionLock.release();
          }
        });
      }}
    >
      <Input label="รหัสสมาชิก" value={form.memberCode} disabled={isSubmitting} onChange={(event) => set("memberCode", event.target.value)} />
      <Input label="เลขที่" value={form.studentNo} disabled={isSubmitting} onChange={(event) => set("studentNo", event.target.value)} />
      <Input label="ชื่อ-สกุล" value={form.fullName} disabled={isSubmitting} onChange={(event) => set("fullName", event.target.value)} />
      <Input label="ห้อง" value={form.classroom} disabled={isSubmitting} onChange={(event) => set("classroom", event.target.value)} />
      <Input label="เบอร์โทร" value={form.phone} disabled={isSubmitting} onChange={(event) => set("phone", event.target.value)} />
      <div className="flex items-end">
        <Button disabled={isSubmitting} className="w-full gap-2">
          <UserPlus size={18} />
          {isSubmitting ? "กำลังเพิ่ม..." : "เพิ่มสมาชิก"}
        </Button>
      </div>
    </form>
  );
}
