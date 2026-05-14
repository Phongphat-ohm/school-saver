"use client";

import { useEffect, useState } from "react";
import { ReactQRCode } from "@lglab/react-qr-code";
import { Copy, QrCode, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { createMemberPaymentQrValue } from "@/lib/member-qr";
import { showError, showSuccess } from "@/lib/swal";

type MemberQrButtonProps = {
  memberCode: string;
  fullName: string;
};

function QrPreview({ value, size }: { value: string; size: number }) {
  return (
    <div className="overflow-hidden rounded-2xl bg-white [&_svg]:h-full [&_svg]:w-full">
      <ReactQRCode
        value={value}
        size={size}
        level="H"
        marginSize={2}
        background="#ffffff"
        dataModulesSettings={{ color: "#0f172a", style: "square" }}
        finderPatternOuterSettings={{ color: "#0f172a", style: "rounded" }}
        finderPatternInnerSettings={{ color: "#0f172a", style: "rounded" }}
        imageSettings={{
          src: "/images/school-saver-logo.webp",
          width: size * 0.18,
          height: size * 0.18,
          excavate: true,
        }}
        svgProps={{ role: "img", "aria-label": "QR code for member payment" }}
      />
    </div>
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

export function MemberQrButton({ memberCode, fullName }: MemberQrButtonProps) {
  const [open, setOpen] = useState(false);
  const [qrValue, setQrValue] = useState("");

  useEffect(() => {
    setQrValue(createMemberPaymentQrValue(memberCode, window.location.origin));
  }, [memberCode]);

  return (
    <>
      <Button type="button" variant="secondary" className="gap-2" onClick={() => setOpen(true)}>
        <QrCode size={16} />
        QR
      </Button>

      <Modal title="QR ชำระเงินสมาชิก" open={open} onClose={() => setOpen(false)}>
        <div className="grid gap-4">
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-sm font-bold text-slate-950">{fullName}</p>
            <p className="mt-1 text-xs text-slate-500">รหัสสมาชิก {memberCode}</p>
          </div>

          <div className="mx-auto rounded-2xl bg-white p-3 shadow-sm">
            {qrValue ? <QrPreview value={qrValue} size={260} /> : <div className="grid size-64 place-items-center text-sm text-slate-400">กำลังสร้าง QR</div>}
          </div>

          <p className="break-all rounded-xl bg-slate-50 p-3 text-xs text-slate-500">{qrValue || "กำลังสร้างลิงก์ชำระเงิน"}</p>

          <div className="grid gap-2 sm:grid-cols-2">
            <Button
              type="button"
              variant="secondary"
              className="gap-2"
              disabled={!qrValue}
              onClick={async () => {
                if (!qrValue) return;
                try {
                  await copyText(qrValue);
                  await showSuccess("คัดลอกลิงก์ QR แล้ว");
                } catch {
                  await showError("ไม่สามารถคัดลอกลิงก์ได้");
                }
              }}
            >
              <Copy size={16} />
              คัดลอกลิงก์
            </Button>
            <Button type="button" className="gap-2" onClick={() => setOpen(false)}>
              <X size={16} />
              ปิด
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
