import { LogOut, Settings, ShieldAlert, ShieldCheck, UserRound } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { roleLabels } from "@/constants/roles";
import { logoutAction } from "@/features/auth/actions";
import { ChangePasswordForm } from "@/features/settings/components/ChangePasswordForm";
import { AccountCancellationForm } from "@/features/settings/components/AccountCancellationForm";
import { MyProfileForm } from "@/features/settings/components/MyProfileForm";
import { WorkspaceSettingsForm } from "@/features/settings/components/WorkspaceSettingsForm";
import { getCurrentWorkspaceAction } from "@/features/workspace/actions";
import { requireUser } from "@/lib/auth";

export default async function SettingsPage() {
  const [user, workspace] = await Promise.all([requireUser(), getCurrentWorkspaceAction()]);

  return (
    <AppLayout>
      <div className="grid gap-5">
        <section className="rounded-[2rem] bg-white p-5 shadow-sm">
          <div className="rounded-[1.5rem] bg-[#eef3ff] p-6">
            <div className="mb-4 grid size-12 place-items-center rounded-2xl bg-blue-600 text-white">
              <Settings size={24} />
            </div>
            <h2 className="text-3xl font-black text-slate-950">ตั้งค่าระบบและผู้ใช้</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              จัดการข้อมูลส่วนตัว เปลี่ยนรหัสผ่าน และแก้ไขข้อมูล workspace ปัจจุบันได้จากหน้านี้
            </p>
          </div>
        </section>

        <div className="grid gap-5 xl:grid-cols-3">
          <Card>
            <div className="mb-4 flex items-center gap-2">
              <UserRound size={20} className="text-blue-600" />
              <h3 className="text-lg font-bold text-slate-950">ข้อมูลผู้ใช้ของฉัน</h3>
            </div>
            <MyProfileForm user={user} />
          </Card>

          <Card>
            <div className="mb-4 flex items-center gap-2">
              <ShieldCheck size={20} className="text-blue-600" />
              <h3 className="text-lg font-bold text-slate-950">เปลี่ยนรหัสผ่าน</h3>
            </div>
            <ChangePasswordForm />
          </Card>

          <Card>
            <h3 className="mb-4 text-lg font-bold text-slate-950">Workspace ปัจจุบัน</h3>
            {workspace.success ? (
              <div className="grid gap-4">
                <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                  <p><b className="text-slate-950">Role:</b> {roleLabels[workspace.data.role]}</p>
                  <p className="mt-1"><b className="text-slate-950">พื้นที่:</b> {workspace.data.name}</p>
                </div>
                <WorkspaceSettingsForm workspace={workspace.data} />
              </div>
            ) : (
              <p>{workspace.message}</p>
            )}
          </Card>
        </div>

        <Card>
          <div className="mb-4 flex items-center gap-2">
            <ShieldAlert size={20} className="text-rose-600" />
            <h3 className="text-lg font-bold text-slate-950">ยกเลิกบัญชีผู้ใช้</h3>
          </div>
          <AccountCancellationForm />
        </Card>

        <div className="rounded-[1.5rem] border border-white/70 bg-[#11152e] p-4 shadow-sm text-white">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold">ออกจากระบบ</h3>
              <p className="mt-1 text-sm text-slate-300">ออกจาก session ปัจจุบันและกลับไปหน้า login</p>
            </div>
            <form action={logoutAction}>
              <Button variant="danger" className="gap-2">
                <LogOut size={18} />ออกจากระบบ
              </Button>
            </form>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
