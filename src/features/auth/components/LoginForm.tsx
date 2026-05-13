"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { loginAction } from "@/features/auth/actions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { showError, showLoading, showSuccess, closeLoading } from "@/lib/swal";

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
            await showError(result.message);
            return;
          }
          await showSuccess("เข้าสู่ระบบสำเร็จ");
          router.push("/dashboard");
          router.refresh();
        });
      }}
    >
      <Input label="Username" value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" className="lowercase" />
      <Input label="Password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" />
      <Button disabled={pending} className="w-full">
        {pending ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
      </Button>
    </form>
  );
}
