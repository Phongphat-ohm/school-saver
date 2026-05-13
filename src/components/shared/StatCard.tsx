import { Card } from "@/components/ui/Card";

export function StatCard({ label, value, helper }: { label: string; value: string | number; helper?: string }) {
  return (
    <Card className="rounded-[1.5rem] border-0">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-slate-950">{value}</p>
      {helper ? <p className="mt-1 text-xs text-slate-400">{helper}</p> : null}
    </Card>
  );
}
