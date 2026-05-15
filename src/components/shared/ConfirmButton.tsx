"use client";

import { Button } from "@/components/ui/Button";
import { useActionLock } from "@/hooks/useActionLock";
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
  const actionLock = useActionLock();

  return (
    <Button
      type="button"
      variant={variant}
      disabled={actionLock.locked}
      onClick={async () => {
        if (!actionLock.acquire()) return;
        try {
          if (!(await showConfirm(title, text))) return;
          showLoading();
          const result = await action();
          closeLoading();
          if (result.success) await showSuccess(result.message ?? "ดำเนินการสำเร็จ");
          else await showError(result.message);
        } finally {
          closeLoading();
          actionLock.release();
        }
      }}
    >
      {actionLock.locked ? "กำลังดำเนินการ..." : children}
    </Button>
  );
}
