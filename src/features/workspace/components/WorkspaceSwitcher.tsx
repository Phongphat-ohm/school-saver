"use client";

import { useState, useTransition } from "react";
import { BriefcaseBusiness, Check, ChevronDown, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { switchWorkspaceAction } from "@/features/workspace/actions";
import { closeLoading, showError, showLoading, showSuccess } from "@/lib/swal";

type WorkspaceSwitcherItem = {
  id: string;
  name: string;
};

export function WorkspaceSwitcher({
  currentWorkspaceId,
  workspaces,
}: {
  currentWorkspaceId?: string;
  workspaces: WorkspaceSwitcherItem[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const currentWorkspace = workspaces.find((workspace) => workspace.id === currentWorkspaceId);

  function switchWorkspace(workspaceId: string) {
    if (!workspaceId || workspaceId === currentWorkspaceId || pending) {
      setOpen(false);
      return;
    }

    startTransition(async () => {
      showLoading("กำลังสลับ workspace");
      const result = await switchWorkspaceAction(workspaceId);
      closeLoading();

      if (result.success) {
        setOpen(false);
        await showSuccess("สลับ workspace แล้ว");
        router.refresh();
      } else {
        await showError(result.message);
      }
    });
  }

  if (workspaces.length === 0) {
    return (
      <button
        type="button"
        disabled
        className="inline-flex min-h-11 max-w-[9.5rem] items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 text-left text-sm font-semibold text-slate-400 sm:max-w-44"
      >
        <BriefcaseBusiness size={16} className="shrink-0" />
        <span className="truncate">ไม่มี workspace</span>
      </button>
    );
  }

  return (
    <>
      <select
        className="hidden min-h-11 max-w-44 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 sm:block"
        value={currentWorkspaceId ?? ""}
        disabled={pending}
        onChange={(event) => switchWorkspace(event.target.value)}
      >
        {workspaces.map((workspace) => (
          <option key={workspace.id} value={workspace.id}>
            {workspace.name}
          </option>
        ))}
      </select>

      <button
        type="button"
        disabled={pending}
        onClick={() => setOpen(true)}
        className="inline-flex min-h-11 max-w-[9.5rem] items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 text-left text-sm font-semibold text-slate-700 shadow-sm sm:hidden"
      >
        <BriefcaseBusiness size={16} className="shrink-0 text-blue-600" />
        <span className="min-w-0 flex-1 truncate">{currentWorkspace?.name ?? "เลือก workspace"}</span>
        <ChevronDown size={16} className="shrink-0 text-slate-400" />
      </button>

      {open ? (
        <div className="fixed inset-0 z-[10000] bg-slate-950/55 p-3 backdrop-blur-sm sm:hidden h-screen">
          <div className="flex min-h-full items-end">
            <div className="w-full rounded-t-[1.75rem] bg-white p-4 shadow-2xl">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-black text-slate-950">เลือก workspace</h2>
                  <p className="mt-1 text-sm text-slate-500">ข้อมูลในระบบจะเปลี่ยนตาม workspace ที่เลือก</p>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="grid size-10 shrink-0 place-items-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                  aria-label="ปิด"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="grid max-h-[60dvh] gap-2 overflow-y-auto pb-2">
                {workspaces.map((workspace) => {
                  const active = workspace.id === currentWorkspaceId;

                  return (
                    <button
                      key={workspace.id}
                      type="button"
                      disabled={pending || active}
                      onClick={() => switchWorkspace(workspace.id)}
                      className={
                        active
                          ? "flex min-h-14 items-center gap-3 rounded-2xl bg-blue-600 px-4 text-left text-white shadow-sm"
                          : "flex min-h-14 items-center gap-3 rounded-2xl bg-slate-50 px-4 text-left text-slate-800 transition hover:bg-blue-50"
                      }
                    >
                      <div className={active ? "grid size-9 shrink-0 place-items-center rounded-xl bg-white/15" : "grid size-9 shrink-0 place-items-center rounded-xl bg-white text-blue-600"}>
                        <BriefcaseBusiness size={18} />
                      </div>
                      <span className="min-w-0 flex-1 truncate text-sm font-bold">{workspace.name}</span>
                      {active ? <Check size={19} className="shrink-0" /> : null}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
