import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Clock3, LockKeyhole, QrCode, ShieldCheck, UsersRound } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { WorkspaceJoinRequestButton } from "@/features/workspace/components/WorkspaceJoinRequestButton";
import { getMyWorkspacesAction, getWorkspaceByIdForJoinAction } from "@/features/workspace/actions";
import { requireUser } from "@/lib/auth";

export default async function JoinWorkspacePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const [workspaceResult, myWorkspacesResult] = await Promise.all([getWorkspaceByIdForJoinAction(id), getMyWorkspacesAction()]);
  const workspace = workspaceResult.success ? workspaceResult.data : null;
  const myWorkspaces = myWorkspacesResult.success ? myWorkspacesResult.data : [];
  const alreadyJoined = myWorkspaces.some((item) => item.id === id);

  return (
    <main className="app-grid-bg min-h-dvh px-4 py-5 text-slate-900">
      <div className="mx-auto grid min-h-[calc(100dvh-2.5rem)] w-full max-w-5xl content-center gap-5">
        <div className="flex items-center justify-between gap-3">
          <Link href="/workspaces" className="inline-flex min-h-11 items-center gap-2 rounded-2xl bg-white px-4 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-blue-50 hover:text-blue-700">
            <ArrowLeft size={18} />
            กลับไป Workspace
          </Link>
          <div className="flex items-center gap-2 rounded-2xl bg-white px-3 py-2 shadow-sm">
            <Image src="/images/school-saver-logo.webp" alt="SchoolSaver" width={32} height={32} className="size-8 rounded-xl object-contain" priority />
            <span className="hidden text-sm font-black text-blue-700 sm:inline">SchoolSaver</span>
          </div>
        </div>

        <section className="grid gap-5 lg:grid-cols-[1fr_360px]">
          <div className="rounded-[2rem] bg-white p-5 shadow-sm sm:p-7">
            <div className="mb-5 inline-flex size-14 items-center justify-center rounded-2xl bg-blue-600 text-white">
              <QrCode size={28} />
            </div>

            {workspace ? (
              <>
                <p className="text-sm font-bold text-blue-700">คำเชิญเข้า workspace</p>
                <h1 className="mt-2 text-3xl font-black leading-tight text-slate-950 sm:text-4xl">{workspace.name}</h1>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-500">
                  {workspace.description ?? "ส่งคำขอเข้า workspace นี้เพื่อให้ OWNER หรือ ADMIN อนุมัติก่อนเริ่มใช้งาน"}
                </p>

                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <UsersRound size={20} className="mb-3 text-blue-600" />
                    <p className="text-sm font-bold text-slate-950">1. ยืนยัน workspace</p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">ตรวจสอบชื่อพื้นที่ก่อนส่งคำขอ</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <Clock3 size={20} className="mb-3 text-amber-600" />
                    <p className="text-sm font-bold text-slate-950">2. รออนุมัติ</p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">ผู้ดูแลจะเห็นคำขอในหน้า Workspace</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <ShieldCheck size={20} className="mb-3 text-green-600" />
                    <p className="text-sm font-bold text-slate-950">3. เริ่มใช้งาน</p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">หลังอนุมัติจึงเห็นข้อมูลของ workspace</p>
                  </div>
                </div>

                <div className="mt-7 rounded-[1.5rem] bg-blue-50 p-4">
                  <p className="text-sm font-bold text-slate-950">กำลังใช้งานในชื่อ</p>
                  <p className="mt-1 text-sm text-slate-600">{user.fullName}</p>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm font-bold text-red-700">ไม่พบ workspace</p>
                <h1 className="mt-2 text-3xl font-black text-slate-950">ลิงก์คำเชิญไม่ถูกต้อง</h1>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-500">QR หรือลิงก์นี้อาจถูกสร้างจาก workspace ที่ไม่มีอยู่แล้ว กรุณาขอ QR ใหม่จากผู้ดูแล</p>
              </>
            )}
          </div>

          <div className="rounded-3xl border-white/70 bg-[#11152e] shadow-sm grid content-start gap-4 border-0 p-5 text-white">
            <div className="grid size-12 place-items-center rounded-2xl bg-white/10">
              <LockKeyhole size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black">{workspace ? "ส่งคำขอเข้าใช้งาน" : "ไม่สามารถส่งคำขอได้"}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                {alreadyJoined
                  ? "คุณอยู่ใน workspace นี้แล้ว สามารถกลับไปเลือก workspace เพื่อใช้งานได้ทันที"
                  : "ระบบจะไม่เพิ่มคุณเข้า workspace อัตโนมัติ ต้องรอ OWNER หรือ ADMIN อนุมัติเพื่อความปลอดภัยของข้อมูล"}
              </p>
            </div>

            {workspace ? (
              alreadyJoined ? (
                <Link
                  href="/workspaces"
                  className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
                >
                  <CheckCircle2 size={18} />
                  ไปหน้า Workspace
                </Link>
              ) : (
                <WorkspaceJoinRequestButton workspaceId={workspace.id} />
              )
            ) : (
              <Link
                href="/workspaces"
                className="inline-flex min-h-11 w-full items-center justify-center rounded-2xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-slate-200"
              >
                กลับไป Workspace
              </Link>
            )}

            <div className="rounded-2xl bg-white/10 p-4 text-sm leading-6 text-slate-300">
              ข้อมูลสมาชิก รอบเก็บเงิน และรายงานของแต่ละ workspace แยกกันทั้งหมด ผู้ใช้จะเห็นข้อมูลได้หลังได้รับสิทธิ์เท่านั้น
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
