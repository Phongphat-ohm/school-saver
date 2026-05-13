import Link from "next/link";
import { FolderOpen } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { formatThaiDate } from "@/lib/date";

export function OpenRounds({ rounds }: { rounds: any[] }) {
  return (
    <Card className="rounded-lg border-0">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-base font-bold text-slate-950">รอบที่เปิดอยู่</h2>
        <Link href="/rounds" className="text-xs font-bold text-blue-700">ดูทั้งหมด</Link>
      </div>
      <div className="grid gap-2">
        {rounds.length ? (
          rounds.map((round) => (
            <Link key={round.id} href={`/rounds/${round.id}`} className="flex items-center gap-3 rounded-lg bg-slate-50 p-3 text-sm font-medium text-blue-700">
              <FolderOpen size={17} className="shrink-0 text-amber-500" />
              <span className="min-w-0 truncate">
                {round.title} <span className="font-normal text-slate-500">ครบกำหนด {formatThaiDate(round.dueDate)}</span>
              </span>
            </Link>
          ))
        ) : (
          <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-500">ยังไม่มีรอบที่เปิดอยู่</p>
        )}
      </div>
    </Card>
  );
}
