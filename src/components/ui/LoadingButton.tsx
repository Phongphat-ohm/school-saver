"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/Button";

export function LoadingButton({ children = "บันทึก" }: { children?: string }) {
  const status = useFormStatus();
  return (
    <Button disabled={status.pending} type="submit">
      {status.pending ? "กำลังบันทึก..." : children}
    </Button>
  );
}
