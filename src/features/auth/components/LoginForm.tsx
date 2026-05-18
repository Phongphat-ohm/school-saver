"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { loginAction } from "@/features/auth/actions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { showError, showLoading, showSuccess, closeLoading } from "@/lib/swal";
import Link from "next/link";

export function LoginForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  return (
    <form
      className="grid gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        startTransition(async () => {
          showLoading("กำลังเข้าสู่ระบบ");
          const result = await loginAction(username, password);
          closeLoading();
          if (!result.success) {
            if (result.redirectTo) {
              router.push(result.redirectTo);
              return;
            }
            await showError(result.message);
            return;
          }
          await showSuccess("เข้าสู่ระบบสำเร็จ");
          router.push("/dashboard");
          router.refresh();
        });
      }}
    >
      <Input label="ชื่อผู้ใช้" value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" autoCapitalize="none" autoCorrect="off" placeholder="กรอกชื่อผู้ใช้" />
      <Input label="รหัสผ่าน" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" placeholder="กรอกรหัสผ่าน" />
      <div className="flex justify-end text-sm">
        <Link href="/forgot-password" className="text-blue-700">ลืมรหัสผ่าน?</Link>
      </div>
      <Button disabled={pending} className="w-full">
        {pending ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
      </Button>
    </form>
  );
}
