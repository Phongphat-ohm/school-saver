"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { updateMyProfileAction } from "@/features/users/actions";
import { closeLoading, showError, showLoading, showSuccess } from "@/lib/swal";

export function MyProfileForm({ user }: { user: { fullName: string; username: string; email?: string | null } }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [fullName, setFullName] = useState(user.fullName);
  const [email, setEmail] = useState(user.email ?? "");

  return (
    <form
      className="grid gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        startTransition(async () => {
          showLoading("กำลังบันทึกโปรไฟล์");
          const result = await updateMyProfileAction({ fullName, email });
          closeLoading();
          if (result.success) {
            await showSuccess(result.message ?? "บันทึกแล้ว");
            router.refresh();
          } else await showError(result.message);
        });
      }}
    >
      <Input label="Username" value={user.username} disabled />
      <Input label="ชื่อที่แสดงในระบบ" value={fullName} onChange={(event) => setFullName(event.target.value)} />
      <Input label="อีเมล (ไม่บังคับ)" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
      <Button disabled={pending} className="gap-2">
        <Save size={18} />บันทึกโปรไฟล์
      </Button>
    </form>
  );
}
