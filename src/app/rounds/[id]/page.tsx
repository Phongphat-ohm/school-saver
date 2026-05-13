import { AppLayout } from "@/components/layout/AppLayout";
import { EmptyState } from "@/components/ui/EmptyState";
import { RoundMemberList } from "@/features/rounds/components/RoundMemberList";
import { RoundSummary } from "@/features/rounds/components/RoundSummary";
import { getRoundDetailAction } from "@/features/rounds/actions";
import { formatThaiDate } from "@/lib/date";

export default async function RoundDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await getRoundDetailAction(id);
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
          <RoundSummary summary={result.data.summary} />
          <div className="flex gap-2 overflow-x-auto pb-1">
            {result.data.dayList.map((day: Date) => (
              <span key={day.toISOString()} className="shrink-0 rounded-2xl bg-white px-3 py-2 text-xs font-semibold text-slate-600 shadow-sm">
                {formatThaiDate(day)}
              </span>
            ))}
          </div>
          <RoundMemberList memberRounds={result.data.memberRounds} />
        </div>
      )}
    </AppLayout>
  );
}
