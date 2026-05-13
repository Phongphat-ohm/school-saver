"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { requestJoinWorkspaceAction } from "@/features/workspace/actions";
import { closeLoading, showError, showLoading, showSuccess } from "@/lib/swal";

export function WorkspaceJoinRequestButton({ workspaceId }: { workspaceId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      disabled={pending}
      className="gap-2"
      onClick={() => {
        startTransition(async () => {
          showLoading("กำลังส่งคำขอเข้า workspace");
          const result = await requestJoinWorkspaceAction({ workspaceId });
          closeLoading();
          if (result.success) {
            await showSuccess(result.message ?? "ส่งคำขอแล้ว");
            router.replace("/workspaces");
            router.refresh();
          } else await showError(result.message);
        });
      }}
    >
      <Send size={18} />ขอเข้า workspace
    </Button>
  );
}
