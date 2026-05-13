import { AppLayout } from "@/components/layout/AppLayout";
import { RoleGate } from "@/components/layout/RoleGate";
import { Card } from "@/components/ui/Card";
import { UserForm } from "@/features/users/components/UserForm";
import { UserTable } from "@/features/users/components/UserTable";
import { getWorkspaceUsersAction } from "@/features/users/actions";
import { getCurrentWorkspaceAction } from "@/features/workspace/actions";

export default async function UsersPage() {
  const [result, workspaceResult] = await Promise.all([getWorkspaceUsersAction(), getCurrentWorkspaceAction()]);
  const users = result.success ? result.data : [];
  const actorRole = workspaceResult.success ? workspaceResult.data.role : null;
  return (
    <AppLayout>
      <RoleGate allowedRoles={["OWNER", "ADMIN"]}>
        <div className="grid gap-5">
        <Card>
          <h2 className="mb-4 text-lg font-bold">เพิ่มผู้ใช้ใน workspace</h2>
          <UserForm actorRole={actorRole} />
        </Card>
        <UserTable users={users} actorRole={actorRole} />
        </div>
      </RoleGate>
    </AppLayout>
  );
}
