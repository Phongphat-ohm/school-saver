import { BookOpenText, BriefcaseBusiness, UsersRound } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/Card";
import { WorkspaceCard } from "@/features/workspace/components/WorkspaceCard";
import { WorkspaceForm } from "@/features/workspace/components/WorkspaceForm";
import { WorkspaceInviteForm } from "@/features/workspace/components/WorkspaceInviteForm";
import { SentWorkspaceInvitationList, WorkspaceInvitationList } from "@/features/workspace/components/WorkspaceInvitationList";
import { WorkspaceMemberList } from "@/features/workspace/components/WorkspaceMemberList";
import { WorkspaceSettingsForm } from "@/features/settings/components/WorkspaceSettingsForm";
import {
  getCurrentWorkspaceAction,
  getMyWorkspacesAction,
  getPendingWorkspaceInvitationsAction,
  getSentWorkspaceInvitationsAction,
  getWorkspaceMembersAction,
} from "@/features/workspace/actions";

export default async function WorkspacesPage() {
  const [workspacesResult, membersResult, currentWorkspaceResult, pendingInvitationsResult, sentInvitationsResult] = await Promise.all([
    getMyWorkspacesAction(),
    getWorkspaceMembersAction(),
    getCurrentWorkspaceAction(),
    getPendingWorkspaceInvitationsAction(),
    getSentWorkspaceInvitationsAction(),
  ]);
  const workspaces = workspacesResult.success ? workspacesResult.data : [];
  const members = membersResult.success ? membersResult.data : [];
  const currentWorkspace = currentWorkspaceResult.success ? currentWorkspaceResult.data : null;
  const pendingInvitations = pendingInvitationsResult.success ? pendingInvitationsResult.data : [];
  const sentInvitations = sentInvitationsResult.success ? sentInvitationsResult.data : [];

  return (
    <AppLayout>
      <div className="grid gap-5">
        <section className="rounded-[2rem] bg-white p-5 shadow-sm">
          <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
            <div className="rounded-[1.5rem] bg-[#eef3ff] p-6">
              <div className="mb-4 grid size-12 place-items-center rounded-2xl bg-blue-600 text-white">
                <BriefcaseBusiness size={24} />
              </div>
              <h2 className="text-3xl font-black text-slate-950">จัดการ Workspace แบบง่าย</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                Workspace คือห้องหรือกลุ่มเก็บเงินของคุณ เลือกห้องที่ต้องการใช้งาน สร้างห้องใหม่ หรือเพิ่มผู้ช่วยด้วย username ได้จากหน้านี้
              </p>
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl bg-white p-4">
                  <p className="text-xs text-slate-500">1. เลือกห้อง</p>
                  <p className="mt-1 font-bold text-slate-950">กดสลับมาใช้</p>
                </div>
                <div className="rounded-2xl bg-white p-4">
                  <p className="text-xs text-slate-500">2. เพิ่มผู้ช่วย</p>
                  <p className="mt-1 font-bold text-slate-950">ใส่ username + role</p>
                </div>
                <div className="rounded-2xl bg-white p-4">
                  <p className="text-xs text-slate-500">3. เริ่มทำงาน</p>
                  <p className="mt-1 font-bold text-slate-950">เพิ่มสมาชิกและสร้างรอบ</p>
                </div>
              </div>
            </div>
            <Card className="border-0 bg-[#11152e] text-white">
              <div className="flex items-center gap-3">
                <div className="grid size-11 place-items-center rounded-2xl bg-white/10">
                  <UsersRound size={22} />
                </div>
                <div>
                  <p className="text-sm text-slate-400">Workspace ปัจจุบัน</p>
                  <p className="text-xl font-black">{currentWorkspace?.name ?? "-"}</p>
                </div>
              </div>
              <p className="mt-5 text-sm leading-6 text-slate-300">ทุกหน้าในระบบจะอ่านและบันทึกข้อมูลเฉพาะ workspace นี้เท่านั้น</p>
            </Card>
          </div>
        </section>

        <div className="grid gap-5 xl:grid-cols-[1fr_420px]">
          <Card>
            <div className="mb-4 flex items-center gap-2">
              <BriefcaseBusiness size={20} className="text-blue-600" />
              <h2 className="text-lg font-bold">Workspace ของฉัน</h2>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {workspaces.map((workspace) => (
                <WorkspaceCard key={workspace.id} workspace={workspace} currentWorkspaceId={currentWorkspace?.id} />
              ))}
            </div>
          </Card>
          <div className="grid gap-5">
            <Card>
              <h2 className="mb-4 text-lg font-bold">สร้าง workspace ใหม่</h2>
              <WorkspaceForm />
            </Card>
            {currentWorkspace ? (
              <Card>
                <h2 className="mb-2 text-lg font-bold">ตั้งค่า Workspace ปัจจุบัน</h2>
                <p className="mb-4 text-sm text-slate-500">แก้ไขชื่อและรายละเอียดของพื้นที่ทำงานนี้</p>
                <WorkspaceSettingsForm workspace={currentWorkspace} />
              </Card>
            ) : null}
            <Card>
              <h2 className="mb-2 text-lg font-bold">เพิ่มผู้ใช้เข้า Workspace</h2>
              <p className="mb-4 text-sm text-slate-500">ค้นหาผู้ใช้แล้วส่งคำเชิญให้ตอบรับก่อนเข้าห้อง</p>
              <WorkspaceInviteForm actorRole={currentWorkspace?.role} />
            </Card>
            <Card>
              <h2 className="mb-4 text-lg font-bold">คำเชิญที่ส่งไปแล้ว</h2>
              <SentWorkspaceInvitationList invitations={sentInvitations} />
            </Card>
          </div>
        </div>

        <Card>
          <div className="mb-4 flex items-center gap-2">
            <BookOpenText size={20} className="text-blue-600" />
            <h2 className="text-lg font-bold">คำเชิญเข้า workspace ของฉัน</h2>
          </div>
          <WorkspaceInvitationList invitations={pendingInvitations} />
        </Card>

        <Card>
          <div className="mb-4 flex items-center gap-2">
            <BookOpenText size={20} className="text-blue-600" />
            <h2 className="text-lg font-bold">ใครอยู่ใน workspace นี้บ้าง</h2>
          </div>
          <WorkspaceMemberList members={members as any} actorRole={currentWorkspace?.role} />
        </Card>
      </div>
    </AppLayout>
  );
}
