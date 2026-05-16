"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { acceptLegalAction } from "@/features/auth/actions";
import { closeLoading, showError, showLoading, showSuccess } from "@/lib/swal";

export function LegalConsentForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptPrivacy, setAcceptPrivacy] = useState(false);
  const canSubmit = acceptTerms && acceptPrivacy && !pending;

  return (
    <form
      className="grid gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (!canSubmit) {
          void showError("กรุณายอมรับเงื่อนไขและนโยบายความเป็นส่วนตัวก่อนใช้งาน");
          return;
        }
        startTransition(async () => {
          showLoading("กำลังบันทึกการยอมรับ");
          const result = await acceptLegalAction();
          closeLoading();
          if (!result.success) {
            await showError(result.message);
            return;
          }
          await showSuccess(result.message ?? "บันทึกเรียบร้อย");
          router.push("/dashboard");
          router.refresh();
        });
      }}
    >
      <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-600">
        <input
          type="checkbox"
          checked={acceptTerms}
          onChange={(event) => setAcceptTerms(event.target.checked)}
          className="mt-1 size-4 accent-blue-600"
        />
        <span>
          ฉันได้อ่านและยอมรับ{" "}
          <Link href="/terms" target="_blank" className="font-bold text-blue-700 hover:underline">
            เงื่อนไขการให้บริการ
          </Link>
        </span>
      </label>
      <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-600">
        <input
          type="checkbox"
          checked={acceptPrivacy}
          onChange={(event) => setAcceptPrivacy(event.target.checked)}
          className="mt-1 size-4 accent-blue-600"
        />
        <span>
          ฉันรับทราบและยินยอมให้เก็บรวบรวม ใช้ และเปิดเผยข้อมูลส่วนบุคคลตาม{" "}
          <Link href="/privacy" target="_blank" className="font-bold text-blue-700 hover:underline">
            นโยบายคุ้มครองข้อมูลส่วนบุคคล
          </Link>
        </span>
      </label>
      <Button disabled={!canSubmit} className="w-full gap-2">
        <ShieldCheck size={18} />
        ยอมรับและเข้าใช้งาน
      </Button>
    </form>
  );
}

