import Image from "next/image";
import { Search, UserRound } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { logoutAction } from "@/features/auth/actions";
import { NotificationButton } from "@/features/notifications/components/NotificationButton";
import { getCurrentWorkspaceAction, getMyWorkspacesAction, getPendingWorkspaceInvitationsAction } from "@/features/workspace/actions";
import { WorkspaceSwitcher } from "@/features/workspace/components/WorkspaceSwitcher";
import { getCurrentUser } from "@/lib/auth";

export async function Header() {
  const [user, workspaceResult, workspacesResult, invitationsResult] = await Promise.all([
    getCurrentUser(),
    getCurrentWorkspaceAction(),
    getMyWorkspacesAction(),
    getPendingWorkspaceInvitationsAction(),
  ]);
  const workspace = workspaceResult.success ? workspaceResult.data : null;
  const workspaces = workspacesResult.success ? workspacesResult.data : [];
  const invitations = invitationsResult.success ? invitationsResult.data : [];

  return (
    <header className="fixed inset-x-0 top-0 z-[80] px-3 py-3 backdrop-blur sm:px-4 sm:py-4 lg:left-64">
      <div className="flex items-center justify-between gap-2 sm:gap-3">
        <div className="flex min-w-0 items-center gap-2 rounded-[1.25rem] bg-white/85 px-2.5 py-2 shadow-sm lg:hidden">
          <div className="grid size-9 shrink-0 place-items-center rounded-2xl bg-blue-50">
            <Image
              src="/images/school-saver-logo.webp"
              alt="SchoolSaver"
              width={30}
              height={30}
              className="size-7 rounded-lg object-contain"
              priority
            />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-black leading-5 text-slate-950">{user?.fullName ?? "SchoolSaver"}</p>
            <p className="truncate text-[11px] font-medium leading-4 text-slate-500">{workspace?.name ?? "ยังไม่มี workspace"}</p>
          </div>
        </div>
        <div className="hidden min-w-0 flex-1 items-center gap-3 lg:flex">
          {/* <div className="flex h-11 w-full max-w-md items-center gap-2 rounded-2xl bg-white px-4 text-slate-400 shadow-sm">
            <Search size={17} />
            <span className="text-sm">Search</span>
          </div> */}
          <div className="min-w-0">
            <h1 className="truncate text-lg font-bold text-slate-950">{workspace?.name ?? "Workspace"}</h1>
            <p className="truncate text-xs text-slate-500">ระบบเก็บเงินห้องอัจฉริยะ</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1 rounded-[1.25rem] bg-white/85 p-1 shadow-sm sm:gap-2 sm:rounded-[1.5rem] sm:p-1.5 sm:pl-2">
          <div className="hidden sm:block">
            <WorkspaceSwitcher currentWorkspaceId={workspace?.id} workspaces={workspaces} />
          </div>
          <NotificationButton invitations={invitations} />
          <div className="hidden items-center gap-2 rounded-2xl bg-slate-50 px-3 py-2 sm:flex">
            <div className="grid size-8 place-items-center rounded-full bg-blue-100 text-blue-700">
              <UserRound size={17} />
            </div>
            <span className="max-w-28 truncate text-sm font-semibold text-slate-700">{user?.fullName ?? ""}</span>
          </div>
          <form action={logoutAction}>
            <Button variant="secondary" className="hidden sm:inline-flex">
              ออกจากระบบ
            </Button>
          </form>
        </div>
      </div>
    </header>
  );
}
