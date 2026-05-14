import Link from "next/link";
import { ArrowRight, BookOpenText, BriefcaseBusiness, QrCode, Settings2, UsersRound } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/Card";
import { WorkspaceCard } from "@/features/workspace/components/WorkspaceCard";
import { WorkspaceForm } from "@/features/workspace/components/WorkspaceForm";
import { WorkspaceInvitationList } from "@/features/workspace/components/WorkspaceInvitationList";
import { WorkspaceJoinRequestButton } from "@/features/workspace/components/WorkspaceJoinRequestButton";
import { WorkspaceQrScanner } from "@/features/workspace/components/WorkspaceQrScanner";
import {
  getCurrentWorkspaceAction,
  getMyWorkspacesAction,
  getPendingWorkspaceInvitationsAction,
  getWorkspaceByIdForJoinAction,
} from "@/features/workspace/actions";

export default async function WorkspacesPage({ searchParams }: { searchParams: Promise<{ join?: string }> }) {
  const { join } = await searchParams;
  const [workspacesResult, currentWorkspaceResult, pendingInvitationsResult, joinWorkspaceResult] = await Promise.all([
    getMyWorkspacesAction(),
    getCurrentWorkspaceAction(),
    getPendingWorkspaceInvitationsAction(),
    join ? getWorkspaceByIdForJoinAction(join) : Promise.resolve(null),
  ]);

  const workspaces = workspacesResult.success ? workspacesResult.data : [];
  const currentWorkspace = currentWorkspaceResult.success ? currentWorkspaceResult.data : null;
  const pendingInvitations = pendingInvitationsResult.success ? pendingInvitationsResult.data : [];
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
                เลือก workspace ที่ใช้งาน สแกน QR เพื่อขอเข้า workspace หรือสร้าง workspace ใหม่ผ่านปุ่มด้านล่าง
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <WorkspaceForm />
                {canManageWorkspace ? (
                  <Link
                    href="/workspaces/manage"
                    className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 sm:w-auto"
                  >
                    <Settings2 size={18} />
                    จัดการ workspace ปัจจุบัน
                    <ArrowRight size={16} />
                  </Link>
                ) : null}
              </div>
            </div>

            <Card className="border-0 bg-[#11152e] text-white">
              <div className="flex items-center gap-3">
                <div className="grid size-11 place-items-center rounded-2xl bg-white/10">
                  <UsersRound size={22} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm text-slate-400">Workspace ปัจจุบัน</p>
                  <p className="truncate text-xl font-black">{currentWorkspace?.name ?? "ยังไม่มี workspace"}</p>
                </div>
              </div>
              <p className="mt-5 text-sm leading-6 text-slate-300">
                {currentWorkspace
                  ? "ข้อมูลทุกหน้าในระบบจะผูกกับ workspace ปัจจุบันเท่านั้น"
                  : "สร้าง workspace ใหม่ หรือขอเข้า workspace จาก QR/ลิงก์ที่ผู้ดูแลส่งให้"}
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

        <div className="grid gap-5 xl:grid-cols-[1fr_420px]">
          <Card>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <BriefcaseBusiness size={20} className="text-blue-600" />
                <h2 className="text-lg font-bold">Workspace ของฉัน</h2>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">{workspaces.length} workspace</span>
            </div>

            {workspaces.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
                <p className="text-sm font-semibold text-slate-700">ยังไม่มี workspace</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">กดสร้าง workspace ใหม่ หรือขอเข้า workspace จาก QR/ลิงก์เชิญ</p>
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {workspaces.map((workspace) => (
                  <WorkspaceCard key={workspace.id} workspace={workspace} currentWorkspaceId={currentWorkspace?.id} />
                ))}
              </div>
            )}
          </Card>

          <div className="grid gap-5">
            <Card>
              <div className="mb-4 flex items-center gap-2">
                <QrCode size={20} className="text-blue-600" />
                <h2 className="text-lg font-bold">สแกน QR เข้า workspace</h2>
              </div>
              <p className="mb-4 text-sm leading-6 text-slate-500">
                ใช้กล้องสแกน QR ที่ OWNER/ADMIN สร้างไว้ ระบบจะพาไปหน้าส่งคำขอและรออนุมัติก่อนเข้าใช้งาน
              </p>
              <WorkspaceQrScanner />
            </Card>

            <Card>
              <div className="mb-4 flex items-center gap-2">
                <BookOpenText size={20} className="text-blue-600" />
                <h2 className="text-lg font-bold">คำเชิญเข้า workspace ของฉัน</h2>
              </div>
              <WorkspaceInvitationList invitations={pendingInvitations} />
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
