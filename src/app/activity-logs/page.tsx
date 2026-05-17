import { AppLayout } from "@/components/layout/AppLayout";
import { RoleGate } from "@/components/layout/RoleGate";
import { EmptyState } from "@/components/ui/EmptyState";
import { getActivityLogsAction } from "@/features/activity-logs/actions";
import { ActivityLogList } from "@/features/activity-logs/components/ActivityLogList";

export default async function ActivityLogsPage() {
  const result = await getActivityLogsAction();

  return (
    <AppLayout>
      <RoleGate allowedRoles={["OWNER", "ADMIN"]}>
        {result.success ? <ActivityLogList logs={result.data} /> : <EmptyState title={result.message} />}
      </RoleGate>
    </AppLayout>
  );
}
