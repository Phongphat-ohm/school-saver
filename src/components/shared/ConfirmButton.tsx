"use client";

import { Button } from "@/components/ui/Button";
import { showConfirm, showError, showLoading, showSuccess, closeLoading } from "@/lib/swal";
import type { ActionResult } from "@/types/action-result";

export function ConfirmButton({
  title,
  text,
  action,
  children,
  variant = "danger",
}: {
  title: string;
  text: string;
  action: () => Promise<ActionResult>;
  children: string;
  variant?: "primary" | "secondary" | "danger" | "ghost";
}) {
  return (
    <Button
      type="button"
      variant={variant}
      onClick={async () => {
        if (!(await showConfirm(title, text))) return;
        showLoading();
        const result = await action();
        closeLoading();
        if (result.success) await showSuccess(result.message ?? "ดำเนินการสำเร็จ");
        else await showError(result.message);
      }}
    >
      {children}
    </Button>
  );
}
