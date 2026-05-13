import { BookOpenText, BriefcaseBusiness, UsersRound } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/Card";
import { WorkspaceCard } from "@/features/workspace/components/WorkspaceCard";
import { WorkspaceForm } from "@/features/workspace/components/WorkspaceForm";
import { WorkspaceInviteForm } from "@/features/workspace/components/WorkspaceInviteForm";
import { SentWorkspaceInvitationList, WorkspaceInvitationList } from "@/features/workspace/components/WorkspaceInvitationList";
import { WorkspaceJoinQr } from "@/features/workspace/components/WorkspaceJoinQr";
import { WorkspaceJoinRequestButton } from "@/features/workspace/components/WorkspaceJoinRequestButton";
import { WorkspaceJoinRequestList } from "@/features/workspace/components/WorkspaceJoinRequestList";
import { WorkspaceQrScanner } from "@/features/workspace/components/WorkspaceQrScanner";
import { WorkspaceMemberList } from "@/features/workspace/components/WorkspaceMemberList";
import { WorkspaceSettingsForm } from "@/features/settings/components/WorkspaceSettingsForm";
import {
  getCurrentWorkspaceAction,
  getMyWorkspacesAction,
  getPendingWorkspaceInvitationsAction,
  getSentWorkspaceInvitationsAction,
  getWorkspaceByIdForJoinAction,
  getWorkspaceJoinRequestsAction,
  getWorkspaceMembersAction,
} from "@/features/workspace/actions";

export default async function WorkspacesPage({ searchParams }: { searchParams: Promise<{ join?: string }> }) {
  const { join } = await searchParams;
  const [
    workspacesResult,
    membersResult,
    currentWorkspaceResult,
    pendingInvitationsResult,
    sentInvitationsResult,
    joinRequestsResult,
    joinWorkspaceResult,
  ] = await Promise.all([
    getMyWorkspacesAction(),
    getWorkspaceMembersAction(),
    getCurrentWorkspaceAction(),
    getPendingWorkspaceInvitationsAction(),
    getSentWorkspaceInvitationsAction(),
    getWorkspaceJoinRequestsAction(),
    join ? getWorkspaceByIdForJoinAction(join) : Promise.resolve(null),
  ]);

  const workspaces = workspacesResult.success ? workspacesResult.data : [];
  const members = membersResult.success ? membersResult.data : [];
  const currentWorkspace = currentWorkspaceResult.success ? currentWorkspaceResult.data : null;
  const pendingInvitations = pendingInvitationsResult.success ? pendingInvitationsResult.data : [];
  const sentInvitations = sentInvitationsResult.success ? sentInvitationsResult.data : [];
  const joinRequests = joinRequestsResult.success ? joinRequestsResult.data : [];
  const joinWorkspace = joinWorkspaceResult?.success ? joinWorkspaceResult.data : null;
  const canManageWorkspace = currentWorkspace?.role === "OWNER" || currentWorkspace?.role === "ADMIN";

  return (
    <AppLayout>
      <div className="grid gap-5">
        <section className="rounded-[2rem] bg-white p-5 shadow-sm">
          <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
            <div className="rounded-[1.5rem] bg-[#eef3ff] p-6">
              <div className="mb-4 grid size-12 place-items-center rounded-2xl bg-blue-600 text-white">
                <BriefcaseBusiness size={24} />
              </div>
              <h2 className="text-3xl font-black text-slate-950">จัดการ Workspace</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                ผู้ใช้ต้องสมัครสมาชิกเองก่อน จากนั้นจึงขอเข้า workspace ผ่านคำเชิญหรือ QR และรอ OWNER/ADMIN อนุมัติ
              </p>
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl bg-white p-4">
                  <p className="text-xs text-slate-500">1. สมัครสมาชิก</p>
                  <p className="mt-1 font-bold text-slate-950">สร้างบัญชีผู้ใช้</p>
                </div>
                <div className="rounded-2xl bg-white p-4">
                  <p className="text-xs text-slate-500">2. ขอเข้า workspace</p>
                  <p className="mt-1 font-bold text-slate-950">สแกน QR หรือรับคำเชิญ</p>
                </div>
                <div className="rounded-2xl bg-white p-4">
                  <p className="text-xs text-slate-500">3. รออนุมัติ</p>
                  <p className="mt-1 font-bold text-slate-950">ผู้ดูแลกดอนุมัติ</p>
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
                  <p className="text-xl font-black">{currentWorkspace?.name ?? "ยังไม่มี workspace"}</p>
                </div>
              </div>
              <p className="mt-5 text-sm leading-6 text-slate-300">
                {currentWorkspace
                  ? "ข้อมูลทุกหน้าในระบบจะผูกกับ workspace ปัจจุบันเท่านั้น"
                  : "คุณสามารถสร้าง workspace ใหม่เอง หรือขอเข้า workspace จาก QR/ลิงก์ที่ผู้ดูแลส่งให้"}
              </p>
            </Card>
          </div>
        </section>

        {joinWorkspace ? (
          <Card className="border-blue-100 bg-blue-50">
            <h2 className="text-lg font-bold text-slate-950">ขอเข้า workspace: {joinWorkspace.name}</h2>
            <p className="mt-1 text-sm text-slate-600">{joinWorkspace.description ?? "ส่งคำขอเพื่อให้ผู้ดูแลอนุมัติเข้าใช้งาน"}</p>
            <div className="mt-4">
              <WorkspaceJoinRequestButton workspaceId={joinWorkspace.id} />
            </div>
          </Card>
        ) : null}

        {workspaces.length === 0 ? (
          <Card>
            <h2 className="text-lg font-bold text-slate-950">ยังไม่มี workspace</h2>
            <p className="mt-2 text-sm text-slate-500">
              เริ่มต้นโดยสร้าง workspace ของตัวเอง หรือขอเข้า workspace จาก QR/ลิงก์เชิญที่ผู้ดูแลส่งมา
            </p>
          </Card>
        ) : null}

        <Card>
          <h2 className="mb-2 text-lg font-bold">สแกน QR เข้า workspace</h2>
          <p className="mb-4 text-sm leading-6 text-slate-500">
            ใช้กล้องสแกน QR ที่ OWNER/ADMIN สร้างไว้ ระบบจะพาไปหน้าส่งคำขอและรออนุมัติก่อนเข้าใช้งาน
          </p>
          <WorkspaceQrScanner />
        </Card>

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
            {canManageWorkspace && currentWorkspace ? (
              <>
                <Card>
                  <h2 className="mb-2 text-lg font-bold">เชิญผู้ใช้เข้า Workspace</h2>
                  <p className="mb-4 text-sm text-slate-500">ผู้ใช้ต้องมีบัญชีแล้ว ระบบจะส่งคำเชิญให้ตอบรับก่อนเข้า workspace</p>
                  <WorkspaceInviteForm actorRole={currentWorkspace.role} />
                </Card>
                <Card>
                  <WorkspaceJoinQr workspaceId={currentWorkspace.id} />
                </Card>
                <Card>
                  <h2 className="mb-4 text-lg font-bold">คำขอเข้า workspace</h2>
                  <WorkspaceJoinRequestList requests={joinRequests} />
                </Card>
                <Card>
                  <h2 className="mb-4 text-lg font-bold">คำเชิญที่ส่งไปแล้ว</h2>
                  <SentWorkspaceInvitationList invitations={sentInvitations} />
                </Card>
              </>
            ) : null}
          </div>
        </div>

        <Card>
          <div className="mb-4 flex items-center gap-2">
            <BookOpenText size={20} className="text-blue-600" />
            <h2 className="text-lg font-bold">คำเชิญเข้า workspace ของฉัน</h2>
          </div>
          <WorkspaceInvitationList invitations={pendingInvitations} />
        </Card>

        {currentWorkspace ? (
          <Card>
            <div className="mb-4 flex items-center gap-2">
              <BookOpenText size={20} className="text-blue-600" />
              <h2 className="text-lg font-bold">ผู้ใช้ใน workspace นี้</h2>
            </div>
            <WorkspaceMemberList members={members as any} actorRole={currentWorkspace.role} />
          </Card>
        ) : null}
      </div>
    </AppLayout>
  );
}
