import { AppLayout } from "@/components/layout/AppLayout";
import { RoleGate } from "@/components/layout/RoleGate";
import { EmptyState } from "@/components/ui/EmptyState";
import { getActivityLogsAction } from "@/features/activity-logs/actions";
import { ActivityLogList } from "@/features/activity-logs/components/ActivityLogList";

type ActivityLogsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ActivityLogsPage({ searchParams }: ActivityLogsPageProps) {
  const params = await searchParams;
  const result = await getActivityLogsAction({
    q: getParam(params, "q"),
    action: getParam(params, "action"),
    outcome: getParam(params, "outcome"),
    ipAddress: getParam(params, "ipAddress"),
    page: getParam(params, "page"),
    pageSize: getParam(params, "pageSize"),
    maxCount: getParam(params, "maxCount"),
  });

  return (
    <AppLayout>
      <RoleGate allowedRoles={["OWNER", "ADMIN"]}>
        {result.success ? <ActivityLogList data={result.data} /> : <EmptyState title={result.message} />}
      </RoleGate>
    </AppLayout>
  );
}

function getParam(params: Record<string, string | string[] | undefined> | undefined, key: string) {
  const value = params?.[key];
  return Array.isArray(value) ? value[0] : value;
}
