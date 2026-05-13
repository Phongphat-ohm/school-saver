import { AppLayout } from "@/components/layout/AppLayout";
import { RoleGate } from "@/components/layout/RoleGate";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { RoundCard } from "@/features/rounds/components/RoundCard";
import { RoundForm } from "@/features/rounds/components/RoundForm";
import { RoundTable } from "@/features/rounds/components/RoundTable";
import { getCollectionRoundsAction } from "@/features/rounds/actions";

export default async function RoundsPage() {
  const result = await getCollectionRoundsAction();
  const rounds = result.success ? result.data : [];
  return (
    <AppLayout>
      <RoleGate allowedRoles={["OWNER", "ADMIN", "COLLECTOR", "VIEWER"]}>
        <div className="grid gap-5">
        <Card>
          <h2 className="mb-4 text-lg font-bold">สร้างรอบเก็บเงิน</h2>
          <RoundForm />
        </Card>
        {rounds.length === 0 ? <EmptyState title="ยังไม่มีรอบเก็บเงิน" /> : <RoundTable rounds={rounds} />}
        <div className="grid gap-3">
          {rounds.map((round) => <RoundCard key={round.id} round={round} />)}
        </div>
        </div>
      </RoleGate>
    </AppLayout>
  );
}
