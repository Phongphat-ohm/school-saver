"use client";

import { useEffect, useState } from "react";
import { Copy, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { showError, showSuccess } from "@/lib/swal";

export function WorkspaceMemberCardLink({ token }: { token: string }) {
  const [url, setUrl] = useState("");

  useEffect(() => {
    setUrl(`${window.location.origin}/member-card/${token}`);
  }, [token]);

  async function copyUrl() {
    try {
      await navigator.clipboard.writeText(url);
      await showSuccess("คัดลอก URL บัตรสมาชิกแล้ว");
    } catch {
      await showError("ไม่สามารถคัดลอก URL ได้");
    }
  }

  return (
    <div className="grid gap-3">
      <p className="break-all rounded-lg bg-slate-50 p-3 text-xs text-slate-600">{url || "กำลังสร้าง URL"}</p>
      <div className="grid gap-2 sm:grid-cols-2">
        <Button type="button" variant="secondary" className="gap-2" disabled={!url} onClick={copyUrl}>
          <Copy size={16} />
          คัดลอก URL
        </Button>
        <Button type="button" className="gap-2" disabled={!url} onClick={() => window.open(url, "_blank", "noopener,noreferrer")}>
          <ExternalLink size={16} />
          เปิดหน้า
        </Button>
      </div>
    </div>
  );
}
