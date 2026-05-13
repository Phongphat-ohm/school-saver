import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { formatThaiDate } from "@/lib/date";
import { FolderOpen } from "lucide-react";

export function OpenRounds({ rounds }: { rounds: any[] }) {
  return (
    <Card className="rounded-[1.5rem] border-0">
      <h2 className="mb-3 text-lg font-bold text-slate-950">รอบที่เปิดอยู่</h2>
      <div className="grid gap-2">
        {rounds.map((round) => (
          <Link key={round.id} href={`/rounds/${round.id}`} className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3 text-sm font-medium text-blue-700">
            <FolderOpen size={17} className="text-amber-500" />
            <span>{round.title} <span className="font-normal text-slate-500">ครบกำหนด {formatThaiDate(round.dueDate)}</span></span>
          </Link>
        ))}
      </div>
    </Card>
  );
}
