import { memberRoundStatusLabels, roundStatusLabels, statusTone } from "@/constants/statuses";
import { Badge } from "@/components/ui/Badge";

export function StatusBadge({ status }: { status: string }) {
  const label =
    memberRoundStatusLabels[status as keyof typeof memberRoundStatusLabels] ??
    roundStatusLabels[status as keyof typeof roundStatusLabels] ??
    (status === "ACTIVE" ? "ใช้งาน" : status === "INACTIVE" ? "ปิดใช้งาน" : status === "HIDDEN" ? "ถูกลบ" : status);
  return <Badge tone={statusTone[status] ?? "default"}>{label}</Badge>;
}
