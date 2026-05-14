import Link from "next/link";
import { ArrowLeft, BookOpenText, BriefcaseBusiness, MailPlus, QrCode, Settings2, UserRoundPlus, UsersRound } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { RoleGate } from "@/components/layout/RoleGate";
import { Card } from "@/components/ui/Card";
import { SentWorkspaceInvitationList } from "@/features/workspace/components/WorkspaceInvitationList";
import { WorkspaceInviteForm } from "@/features/workspace/components/WorkspaceInviteForm";
import { WorkspaceJoinQr } from "@/features/workspace/components/WorkspaceJoinQr";
import { WorkspaceJoinRequestList } from "@/features/workspace/components/WorkspaceJoinRequestList";
import { WorkspaceMemberList } from "@/features/workspace/components/WorkspaceMemberList";
import { WorkspaceSettingsForm } from "@/features/settings/components/WorkspaceSettingsForm";
import {
  getCurrentWorkspaceAction,
  getSentWorkspaceInvitationsAction,
  getWorkspaceJoinRequestsAction,
  getWorkspaceMembersAction,
} from "@/features/workspace/actions";

export default async function WorkspaceManagePage() {
  const [currentWorkspaceResult, membersResult, sentInvitationsResult, joinRequestsResult] = await Promise.all([
    getCurrentWorkspaceAction(),
    getWorkspaceMembersAction(),
    getSentWorkspaceInvitationsAction(),
    getWorkspaceJoinRequestsAction(),
  ]);

  const currentWorkspace = currentWorkspaceResult.success ? currentWorkspaceResult.data : null;
  const members = membersResult.success ? membersResult.data : [];
  const sentInvitations = sentInvitationsResult.success ? sentInvitationsResult.data : [];
  const joinRequests = joinRequestsResult.success ? joinRequestsResult.data : [];

  return (
    <AppLayout>
      <RoleGate allowedRoles={["OWNER", "ADMIN"]}>
        <div className="grid gap-5">
          <section className="rounded-[2rem] bg-white p-5 shadow-sm">
            <div className="rounded-[1.5rem] bg-[#eef3ff] p-6">
              <Link href="/workspaces" className="mb-4 inline-flex min-h-10 items-center gap-2 rounded-2xl bg-white px-3 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-blue-50 hover:text-blue-700">
                <ArrowLeft size={16} />
                กลับไปหน้า workspace
              </Link>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="mb-4 grid size-12 place-items-center rounded-2xl bg-blue-600 text-white">
                    <Settings2 size={24} />
                  </div>
                  <h2 className="text-3xl font-black text-slate-950">จัดการ workspace ปัจจุบัน</h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                    รวมเครื่องมือสำหรับดูแลสมาชิก คำเชิญ คำขอเข้า workspace QR และการตั้งค่าของพื้นที่ทำงานนี้
                  </p>
                </div>
                <div className="rounded-2xl bg-white p-4 shadow-sm">
                  <p className="text-xs font-bold text-slate-500">Workspace</p>
                  <p className="mt-1 max-w-56 truncate text-lg font-black text-slate-950">{currentWorkspace?.name ?? "ยังไม่มี workspace"}</p>
                </div>
              </div>
            </div>
          </section>

          {currentWorkspace ? (
            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
              <div className="grid gap-5">
                <Card>
                  <div className="mb-4 flex items-center gap-2">
                    <MailPlus size={20} className="text-blue-600" />
                    <h2 className="text-lg font-bold">ส่งคำเชิญเข้า workspace</h2>
                  </div>
                  <WorkspaceInviteForm actorRole={currentWorkspace.role} />
                </Card>

                <Card>
                  <div className="mb-4 flex items-center gap-2">
                    <UserRoundPlus size={20} className="text-blue-600" />
                    <h2 className="text-lg font-bold">คำขอเข้า workspace</h2>
                  </div>
                  <WorkspaceJoinRequestList requests={joinRequests} />
                </Card>

                <Card>
                  <div className="mb-4 flex items-center gap-2">
                    <UsersRound size={20} className="text-blue-600" />
                    <h2 className="text-lg font-bold">ผู้ใช้ใน workspace นี้</h2>
                  </div>
                  <WorkspaceMemberList members={members as any} actorRole={currentWorkspace.role} />
                </Card>
              </div>

              <div className="grid content-start gap-5">
                <Card>
                  <div className="mb-4 flex items-center gap-2">
                    <QrCode size={20} className="text-blue-600" />
                    <h2 className="text-lg font-bold">QR ขอเข้า workspace</h2>
                  </div>
                  <WorkspaceJoinQr workspaceId={currentWorkspace.id} />
                </Card>

                <Card>
                  <div className="mb-4 flex items-center gap-2">
                    <BookOpenText size={20} className="text-blue-600" />
                    <h2 className="text-lg font-bold">คำเชิญที่ส่งแล้ว</h2>
                  </div>
                  <SentWorkspaceInvitationList invitations={sentInvitations} />
                </Card>

                <Card>
                  <div className="mb-4 flex items-center gap-2">
                    <BriefcaseBusiness size={20} className="text-blue-600" />
                    <h2 className="text-lg font-bold">ตั้งค่า workspace</h2>
                  </div>
                  <WorkspaceSettingsForm workspace={currentWorkspace} />
                </Card>
              </div>
            </div>
          ) : (
            <Card>
              <p className="text-sm text-slate-500">ยังไม่มี workspace ที่ใช้งานอยู่</p>
            </Card>
          )}
        </div>
      </RoleGate>
    </AppLayout>
  );
}
