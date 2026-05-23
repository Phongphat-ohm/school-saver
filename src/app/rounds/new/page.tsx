import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { RoleGate } from "@/components/layout/RoleGate";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { RoundForm } from "@/features/rounds/components/RoundForm";
import { getRoundMemberSelectionAction } from "@/features/rounds/actions";

export default async function NewRoundPage() {
  const memberResult = await getRoundMemberSelectionAction();
  const members = memberResult.success ? memberResult.data : [];

  return (
    <AppLayout>
      <RoleGate allowedRoles={["OWNER", "ADMIN"]}>
        <div className="grid gap-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <Link href="/rounds" className="mb-2 inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-blue-700">
                <ArrowLeft size={16} />
                กลับไปรอบเก็บเงิน
              </Link>
              <h2 className="text-2xl font-bold text-slate-950">สร้างรอบเก็บเงิน</h2>
              <p className="text-sm text-slate-500">กำหนดรายละเอียดรอบ แล้วเลือกสมาชิกแต่ละคนจากรายการทั้งหมด</p>
            </div>
          </div>

          {members.length === 0 ? (
            <EmptyState title="ยังไม่มีสมาชิกที่ใช้งานอยู่" description="เพิ่มสมาชิกก่อนสร้างรอบเก็บเงินใหม่" />
          ) : (
            <Card>
              <RoundForm members={members} />
            </Card>
          )}
        </div>
      </RoleGate>
    </AppLayout>
  );
}
