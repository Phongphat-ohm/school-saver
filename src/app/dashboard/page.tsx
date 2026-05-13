import { AppLayout } from "@/components/layout/AppLayout";
import { DashboardCards } from "@/features/dashboard/components/DashboardCards";
import { OpenRounds } from "@/features/dashboard/components/OpenRounds";
import { RecentTransactions } from "@/features/dashboard/components/RecentTransactions";
import { getDashboardSummaryAction } from "@/features/dashboard/actions";
import { EmptyState } from "@/components/ui/EmptyState";

export default async function DashboardPage() {
  const result = await getDashboardSummaryAction();
  return (
    <AppLayout>
      {!result.success ? (
        <EmptyState title={result.message} />
      ) : (
        <div className="grid gap-5">
          <DashboardCards summary={result.data} />
          <div className="grid gap-5 xl:grid-cols-2">
            <RecentTransactions transactions={result.data.recentTransactions} />
            <OpenRounds rounds={result.data.openRounds} />
          </div>
        </div>
      )}
    </AppLayout>
  );
}
