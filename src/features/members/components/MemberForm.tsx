"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createMemberAction } from "@/features/members/actions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { showError, showLoading, showSuccess, closeLoading } from "@/lib/swal";
import { UserPlus } from "lucide-react";

export function MemberForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({ memberCode: "", studentNo: "", fullName: "", classroom: "", phone: "" });
  const set = (key: keyof typeof form, value: string) => setForm((prev) => ({ ...prev, [key]: value }));
  return (
    <form
      className="grid gap-3 md:grid-cols-2"
      onSubmit={(event) => {
        event.preventDefault();
        startTransition(async () => {
          showLoading();
          const result = await createMemberAction(form);
          closeLoading();
          if (result.success) {
            await showSuccess(result.message ?? "สำเร็จ");
            setForm({ memberCode: "", studentNo: "", fullName: "", classroom: "", phone: "" });
            router.refresh();
          } else await showError(result.message);
        });
      }}
    >
      <Input label="รหัสสมาชิก" value={form.memberCode} onChange={(event) => set("memberCode", event.target.value)} />
      <Input label="เลขที่" value={form.studentNo} onChange={(event) => set("studentNo", event.target.value)} />
      <Input label="ชื่อ-สกุล" value={form.fullName} onChange={(event) => set("fullName", event.target.value)} />
      <Input label="ห้อง" value={form.classroom} onChange={(event) => set("classroom", event.target.value)} />
      <Input label="เบอร์โทร" value={form.phone} onChange={(event) => set("phone", event.target.value)} />
      <div className="flex items-end">
        <Button disabled={pending} className="w-full gap-2"><UserPlus size={18} />เพิ่มสมาชิก</Button>
      </div>
    </form>
  );
}
