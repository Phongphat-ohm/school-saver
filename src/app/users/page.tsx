import { AppLayout } from "@/components/layout/AppLayout";
import { RoleGate } from "@/components/layout/RoleGate";
import { Card } from "@/components/ui/Card";
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
            <h2 className="mb-2 text-lg font-bold">ผู้ใช้ใน workspace</h2>
            <p className="text-sm text-slate-500">
              ผู้ใช้ต้องสมัครสมาชิกเองก่อน จากนั้นให้ส่งคำเชิญหรือให้สแกน QR ในหน้า Workspace และรอผู้ดูแลอนุมัติ
            </p>
          </Card>
          <UserTable users={users} actorRole={actorRole} />
        </div>
      </RoleGate>
    </AppLayout>
  );
}
