"use client";

import { useEffect, useState, useTransition } from "react";
import { Copy, Maximize2, QrCode, RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { generateWorkspaceJoinQrAction } from "@/features/workspace/actions";
import { showError, showSuccess } from "@/lib/swal";

type WorkspaceQrData = {
  joinUrl: string;
  logoUrl: string;
  qrSvg: string;
};

function QrSvgPreview({ svg, sizeClass }: { svg: string; sizeClass: string }) {
  return (
    <div
      className={`${sizeClass} overflow-hidden rounded-[1.25rem] bg-white [&_svg]:h-full [&_svg]:w-full`}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

async function copyText(text: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "true");
  textarea.style.position = "fixed";
  textarea.style.top = "-9999px";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();
  textarea.setSelectionRange(0, textarea.value.length);

  const copied = document.execCommand("copy");
  document.body.removeChild(textarea);

  if (!copied) throw new Error("copy failed");
}

export function WorkspaceJoinQr({ workspaceId }: { workspaceId: string }) {
  const [qrData, setQrData] = useState<WorkspaceQrData | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [pending, startTransition] = useTransition();

  function loadQr() {
    startTransition(async () => {
      const result = await generateWorkspaceJoinQrAction(workspaceId);

      if (result.success) {
        setQrData(result.data);
      } else {
        await showError(result.message);
      }
    });
  }

  useEffect(() => {
    loadQr();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId]);

  return (
    <>
      <div className="grid gap-3 rounded-2xl bg-slate-50 p-4">
        <div className="flex items-center gap-2 font-bold text-slate-950">
          <QrCode size={18} className="text-blue-600" />
          QR ขอเข้า workspace
        </div>

        {qrData ? (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="mx-auto rounded-[1.25rem] bg-white p-3 shadow-sm transition hover:scale-[1.01] hover:shadow-md"
            aria-label="ขยาย QR"
          >
            <QrSvgPreview svg={qrData.qrSvg} sizeClass="size-44" />
          </button>
        ) : (
          <div className="mx-auto grid size-44 place-items-center rounded-[1.25rem] bg-white p-3 text-center text-xs text-slate-400 shadow-sm">
            {pending ? "กำลังสร้าง QR" : "ยังไม่มี QR"}
          </div>
        )}

        <p className="break-all rounded-xl bg-white p-3 text-xs text-slate-500">{qrData?.joinUrl ?? "กำลังสร้างลิงก์เชิญ"}</p>

        <div className="grid gap-2 sm:grid-cols-2">
          <Button
            type="button"
            variant="secondary"
            className="gap-2"
            disabled={!qrData}
            onClick={async () => {
              if (!qrData) return;
              try {
                await copyText(qrData.joinUrl);
                await showSuccess("คัดลอกลิงก์แล้ว");
              } catch {
                await showError("ไม่สามารถคัดลอกลิงก์อัตโนมัติได้ กรุณากดค้างที่ลิงก์แล้วคัดลอกเอง");
              }
            }}
          >
            <Copy size={16} />
            คัดลอกลิงก์
          </Button>
          <Button type="button" className="gap-2" disabled={!qrData} onClick={() => setExpanded(true)}>
            <Maximize2 size={16} />
            ขยาย QR
          </Button>
        </div>

        <Button type="button" variant="ghost" className="gap-2" disabled={pending} onClick={loadQr}>
          <RefreshCw size={16} className={pending ? "animate-spin" : ""} />
          สร้าง QR ใหม่
        </Button>
{/* 
        <p className="text-xs leading-5 text-slate-500">
          QR นี้สร้างด้วย Node.js library และฝังโลโก้จาก /images/school-saver-logo.webp ตรงกลาง ผู้ใช้ที่สแกนจะส่งคำขอเข้าร่วมและต้องรอ OWNER/ADMIN อนุมัติ
        </p> */}
      </div>

      {expanded && qrData ? (
        <div className="fixed inset-0 z-[10000] overflow-y-auto bg-slate-950/75 p-4 backdrop-blur-sm">
          <div className="mx-auto flex min-h-full max-w-xl items-center justify-center py-8">
            <div className="w-full rounded-[1.75rem] bg-white p-5 shadow-2xl">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-black text-slate-950">QR ขอเข้า workspace</h2>
                  <p className="mt-1 text-sm text-slate-500">เปิดหน้าจอนี้ให้ผู้ใช้สแกนเพื่อส่งคำขอเข้า workspace</p>
                </div>
                <button
                  type="button"
                  onClick={() => setExpanded(false)}
                  className="grid size-10 shrink-0 place-items-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                  aria-label="ปิด QR"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="grid place-items-center rounded-[1.5rem] bg-slate-50 p-4">
                <QrSvgPreview svg={qrData.qrSvg} sizeClass="w-full max-w-[420px]" />
              </div>

              <p className="mt-4 break-all rounded-2xl bg-slate-50 p-3 text-xs text-slate-500">{qrData.joinUrl}</p>
              <Button type="button" className="mt-4 w-full gap-2" onClick={() => setExpanded(false)}>
                ปิด
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
