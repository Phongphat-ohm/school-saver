import { AppLayout } from "@/components/layout/AppLayout";
import { RoleGate } from "@/components/layout/RoleGate";
import { EmptyState } from "@/components/ui/EmptyState";
import { RoundCard } from "@/features/rounds/components/RoundCard";
import { RoundTable } from "@/features/rounds/components/RoundTable";
import { getCollectionRoundsAction } from "@/features/rounds/actions";
import { canManageRounds, getCurrentWorkspaceRole } from "@/lib/permissions";
import { CalendarPlus } from "lucide-react";
import Link from "next/link";

export default async function RoundsPage() {
  const [result, role] = await Promise.all([getCollectionRoundsAction(), getCurrentWorkspaceRole()]);
  const rounds = result.success ? result.data : [];
  const canCreateRound = canManageRounds(role);
  return (
    <AppLayout>
      <RoleGate allowedRoles={["OWNER", "ADMIN", "COLLECTOR", "VIEWER"]}>
        <div className="grid gap-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-bold text-slate-950">รอบเก็บเงิน</h2>
              <p className="text-sm text-slate-500">ดูสถานะและจัดการรอบเก็บเงินทั้งหมดของ workspace นี้</p>
            </div>
            {canCreateRound ? (
              <Link
                href="/rounds/new"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
              >
                <CalendarPlus size={18} />
                สร้างรอบใหม่
              </Link>
            ) : null}
          </div>
          {rounds.length === 0 ? <EmptyState title="ยังไม่มีรอบเก็บเงิน" /> : <RoundTable rounds={rounds} />}
          <div className="grid gap-3">
            {rounds.map((round) => <RoundCard key={round.id} round={round} />)}
          </div>
        </div>
      </RoleGate>
    </AppLayout>
  );
}
