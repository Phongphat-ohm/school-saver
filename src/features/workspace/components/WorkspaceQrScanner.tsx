"use client";

import { useMemo, useState } from "react";
import { Camera, QrCode, X } from "lucide-react";
import { Scanner } from "@yudiel/react-qr-scanner";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

function extractWorkspaceId(rawValue: string) {
  const value = rawValue.trim();

  if (!value) return null;

  try {
    const url = new URL(value);
    const joinId = url.searchParams.get("join");
    return joinId?.trim() || null;
  } catch {
    const queryMatch = value.match(/[?&]join=([^&]+)/);
    if (queryMatch?.[1]) return decodeURIComponent(queryMatch[1]).trim();

    if (/^[a-zA-Z0-9_-]{8,}$/.test(value)) return value;
  }

  return null;
}

export function WorkspaceQrScanner() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [locked, setLocked] = useState(false);
  const [error, setError] = useState("");

  const scannerKey = useMemo(() => (open ? "workspace-scanner-open" : "workspace-scanner-closed"), [open]);

  function closeScanner() {
    setOpen(false);
    setLocked(false);
    setError("");
  }

  return (
    <>
      <Button type="button" className="w-full gap-2" onClick={() => setOpen(true)}>
        <QrCode size={18} />
        สแกน QR เข้า workspace
      </Button>

      {open ? (
        <div className="fixed inset-0 z-[10000] overflow-y-auto bg-slate-950/70 p-4 backdrop-blur-sm">
          <div className="mx-auto flex min-h-full max-w-lg items-center justify-center py-8">
            <div className="w-full rounded-[1.5rem] bg-white p-4 shadow-2xl">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <div className="mb-2 inline-flex size-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                    <Camera size={22} />
                  </div>
                  <h2 className="text-xl font-black text-slate-950">สแกน QR เข้า workspace</h2>
                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    วาง QR ที่ผู้ดูแลสร้างไว้ให้อยู่ในกรอบ ระบบจะพาไปหน้าส่งคำขอเข้า workspace อัตโนมัติ
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeScanner}
                  className="grid size-10 shrink-0 place-items-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                  aria-label="ปิดตัวสแกน"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="overflow-hidden rounded-2xl border border-slate-100 bg-slate-950">
                <Scanner
                  key={scannerKey}
                  onScan={(detectedCodes) => {
                    if (locked) return;

                    const rawValue = detectedCodes[0]?.rawValue;
                    const workspaceId = rawValue ? extractWorkspaceId(rawValue) : null;

                    if (!workspaceId) {
                      setError("QR นี้ไม่ใช่ QR สำหรับเข้า workspace ของ SchoolSaver");
                      return;
                    }

                    setLocked(true);
                    setError("");
                    setOpen(false);
                    router.push(`/workspaces?join=${encodeURIComponent(workspaceId)}`);
                    router.refresh();
                  }}
                  onError={() => {
                    setError("ไม่สามารถเปิดกล้องได้ กรุณาอนุญาตการใช้กล้อง หรือใช้เบราว์เซอร์ที่รองรับ");
                  }}
                  formats={["qr_code"]}
                  constraints={{ facingMode: "environment" }}
                  allowMultiple={false}
                  scanDelay={700}
                  paused={!open || locked}
                  components={{ finder: true, torch: true, zoom: true }}
                  styles={{
                    container: { width: "100%" },
                    video: { width: "100%", aspectRatio: "1 / 1", objectFit: "cover" },
                  }}
                />
              </div>

              {error ? <p className="mt-3 rounded-2xl bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}

              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <Button type="button" variant="secondary" onClick={() => setError("")}>
                  ล้างข้อความแจ้งเตือน
                </Button>
                <Button type="button" variant="ghost" onClick={closeScanner}>
                  ปิด
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
