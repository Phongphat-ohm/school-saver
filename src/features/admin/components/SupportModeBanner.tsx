import { ShieldAlert } from "lucide-react";
import { ExitSupportSessionButton } from "@/features/admin/components/AdminClientControls";
import { formatThaiDateTime } from "@/lib/date";
import { getActiveSupportSession } from "@/lib/support-access";

export async function SupportModeBanner() {
  const session = await getActiveSupportSession();
  if (!session) return null;

  return (
    <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-950 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 gap-3">
          <div className="grid size-10 shrink-0 place-items-center rounded-2xl bg-amber-100 text-amber-700">
            <ShieldAlert size={20} />
          </div>
          <div className="min-w-0">
            <p className="font-black">กำลังอยู่ในโหมดช่วยเหลือ: {session.workspace.name}</p>
            <p className="mt-1 text-sm font-medium text-amber-800">
              โหมด {session.mode} · หมดอายุ {formatThaiDateTime(session.expiresAt)} · {session.reason}
            </p>
          </div>
        </div>
        <ExitSupportSessionButton />
      </div>
    </div>
  );
}
