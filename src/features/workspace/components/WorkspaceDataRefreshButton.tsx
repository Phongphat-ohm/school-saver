"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function WorkspaceDataRefreshButton({ label = "โหลดข้อมูล" }: { label?: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="secondary"
      className="min-h-9 gap-2 rounded-xl px-3 py-1.5 text-xs shadow-none"
      disabled={pending}
      onClick={() => {
        startTransition(() => {
          router.refresh();
        });
      }}
    >
      <RefreshCw size={14} className={pending ? "animate-spin" : undefined} />
      {pending ? "กำลังโหลด" : label}
    </Button>
  );
}
