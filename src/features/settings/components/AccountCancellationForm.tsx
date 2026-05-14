"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { cancelMyAccountAction } from "@/features/users/actions";
import { closeLoading, showConfirm, showError, showLoading, showSuccess } from "@/lib/swal";

export function AccountCancellationForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [password, setPassword] = useState("");
  const [confirmText, setConfirmText] = useState("");

  return (
    <form
      className="grid gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        startTransition(async () => {
          const confirmed = await showConfirm(
            "ยกเลิกบัญชี",
            "บัญชีของคุณจะถูกปิดใช้งาน ออกจากทุก workspace และต้องสมัครใหม่หากต้องการกลับมาใช้งาน",
          );
          if (!confirmed) return;
          showLoading("กำลังยกเลิกบัญชี");
          const result = await cancelMyAccountAction({ password, confirmText });
          closeLoading();
          if (result.success) {
            await showSuccess(result.message ?? "ยกเลิกบัญชีสำเร็จ");
            router.push("/login");
            router.refresh();
          } else await showError(result.message);
        });
      }}
    >
      <p className="text-sm leading-6 text-rose-700">
        การยกเลิกบัญชีจะปิดบัญชีของคุณและนำคุณออกจากทุก workspace หากคุณเป็น OWNER คนเดียวของ workspace ใด ระบบจะไม่อนุญาตให้ยกเลิกจนกว่าจะมอบสิทธิ์ OWNER ให้คนอื่นก่อน
      </p>
      <Input label="รหัสผ่านปัจจุบัน" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" />
      <Input label='พิมพ์ "ยกเลิกบัญชี" เพื่อยืนยัน' value={confirmText} onChange={(event) => setConfirmText(event.target.value)} />
      <Button type="submit" variant="danger" className="gap-2" disabled={pending}>
        <Trash2 size={18} />ยกเลิกบัญชีของฉัน
      </Button>
    </form>
  );
}
