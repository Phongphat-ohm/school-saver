import { AppLayout } from "@/components/layout/AppLayout";
import { RoleGate } from "@/components/layout/RoleGate";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { MemberForm } from "@/features/members/components/MemberForm";
import { MemberImportModal } from "@/features/members/components/MemberImportModal";
import { MemberTable } from "@/features/members/components/MemberTable";
import { getMembersAction } from "@/features/members/actions";

export default async function MembersPage() {
  const result = await getMembersAction();
  const members = result.success ? result.data : [];

  return (
    <AppLayout>
      <RoleGate allowedRoles={["OWNER", "ADMIN", "COLLECTOR"]}>
        <div className="grid gap-5">
          <Card>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-bold">เพิ่มสมาชิก</h2>
              <MemberImportModal />
            </div>
            <MemberForm />
          </Card>
          {members.length ? <MemberTable members={members} /> : <EmptyState title="ยังไม่มีสมาชิก" />}
        </div>
      </RoleGate>
    </AppLayout>
  );
}
