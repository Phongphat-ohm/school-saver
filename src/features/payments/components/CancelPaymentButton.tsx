"use client";

import { useRouter } from "next/navigation";
import Swal from "sweetalert2";
import { XCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cancelPaymentTransactionAction } from "@/features/payments/actions";
import { useActionLock } from "@/hooks/useActionLock";

type CancelPaymentButtonProps = {
  transactionId: string;
  compact?: boolean;
};

export function CancelPaymentButton({ transactionId, compact = false }: CancelPaymentButtonProps) {
  const router = useRouter();
  const { locked, acquire, release } = useActionLock();

  async function handleCancel() {
    if (!acquire()) return;

    try {
      const confirmation = await Swal.fire({
        title: "ยกเลิกการรับเงิน?",
        text: "รายการรับเงินนี้จะถูกลบออก และระบบจะคำนวณยอดจ่าย/ยอดค้างของสมาชิกใหม่ทันที",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "ยืนยันยกเลิก",
        cancelButtonText: "กลับไปก่อน",
        confirmButtonColor: "#dc2626",
      });

      if (!confirmation.isConfirmed) return;

      const result = await cancelPaymentTransactionAction(transactionId);
      if (!result.success) {
        await Swal.fire("ไม่สำเร็จ", result.message, "error");
        return;
      }

      await Swal.fire("สำเร็จ", result.message, "success");
      router.refresh();
    } finally {
      release();
    }
  }

  return (
    <Button type="button" variant="danger" className={compact ? "min-h-9 gap-1 rounded-xl px-3 text-xs" : "gap-2"} onClick={handleCancel} disabled={locked}>
      <XCircle size={compact ? 14 : 18} />
      {locked ? "กำลังยกเลิก..." : "ยกเลิก"}
    </Button>
  );
}
