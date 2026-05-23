import { AppLayout } from "@/components/layout/AppLayout";
import { EmptyState } from "@/components/ui/EmptyState";
import { RoundMemberList } from "@/features/rounds/components/RoundMemberList";
import { RoundMemberManager } from "@/features/rounds/components/RoundMemberManager";
import { RoundSummary } from "@/features/rounds/components/RoundSummary";
import { RoundDepositExportButton } from "@/features/rounds/components/RoundDepositExportButton";
import { getRoundDetailAction, getRoundMemberManagementAction } from "@/features/rounds/actions";
import { getPaymentMethodsAction } from "@/features/payment-methods/actions";
import { formatThaiDate } from "@/lib/date";
import { canManageRounds, getCurrentWorkspaceRole } from "@/lib/permissions";

export default async function RoundDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [result, paymentMethodsResult, role, managementResult] = await Promise.all([
    getRoundDetailAction(id),
    getPaymentMethodsAction(),
    getCurrentWorkspaceRole(),
    getRoundMemberManagementAction(id),
  ]);
  const paymentMethods = paymentMethodsResult.success ? paymentMethodsResult.data : [];
  const canManageRoundMembers = canManageRounds(role);
  return (
    <AppLayout>
      {!result.success ? (
        <EmptyState title={result.message} />
      ) : (
        <div className="grid gap-5">
          <div>
            <h2 className="text-2xl font-bold text-slate-950">{result.data.round.title}</h2>
            <p className="text-sm text-slate-500">ครบกำหนด {formatThaiDate(result.data.round.dueDate)}</p>
          </div>
          <div className="flex justify-end">
            <RoundDepositExportButton round={result.data.round} dayList={result.data.dayList} memberRounds={result.data.memberRounds} />
          </div>
          <RoundSummary summary={result.data.summary} />
          {canManageRoundMembers && managementResult.success ? (
            <RoundMemberManager
              roundId={result.data.round.id}
              roundStatus={managementResult.data.roundStatus}
              members={managementResult.data.members}
            />
          ) : null}
          <div className="flex gap-2 overflow-x-auto pb-1">
            {result.data.dayList.map((day: Date) => (
              <span key={day.toISOString()} className="shrink-0 rounded-2xl bg-white px-3 py-2 text-xs font-semibold text-slate-600 shadow-sm">
                {formatThaiDate(day)}
              </span>
            ))}
          </div>
          <RoundMemberList memberRounds={result.data.memberRounds} paymentMethods={paymentMethods} round={result.data.round} />
        </div>
      )}
    </AppLayout>
  );
}
