"use client";

import { useEffect, useMemo, useState } from "react";
import { QrCode, Search, SlidersHorizontal } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { MemberPaymentQrScanner } from "@/features/payments/components/MemberPaymentQrScanner";
import { PaymentCard } from "@/features/payments/components/PaymentCard";
import { PaymentForm } from "@/features/payments/components/PaymentForm";
import type { MemberPaymentQrPayload } from "@/lib/member-qr";
import { showError } from "@/lib/swal";

const statusOptions = [
  { label: "ทุกสถานะ", value: "ALL" },
  { label: "ยังไม่จ่าย", value: "UNPAID" },
  { label: "จ่ายบางส่วน", value: "PARTIAL" },
  { label: "จ่ายครบ", value: "PAID" },
  { label: "เลยกำหนด", value: "OVERDUE" },
  { label: "ยกเว้น", value: "WAIVED" },
];

const payOptions = [
  { label: "ทั้งหมด", value: "ALL" },
  { label: "ยังมียอดค้าง", value: "OUTSTANDING" },
  { label: "จ่ายครบแล้ว", value: "CLEARED" },
];

function matchStatus(status: string, filter: string) {
  if (filter === "ALL") return true;
  if (filter === "PARTIAL") return status === "PARTIAL" || status === "PARTIAL_OVERDUE";
  if (filter === "PAID") return status === "PAID" || status === "LATE_PAID";
  if (filter === "OVERDUE") return status === "OVERDUE" || status === "PARTIAL_OVERDUE";
  return status === filter;
}

export function RoundMemberList({
  memberRounds,
  paymentMethods = [],
  round,
  initialKeyword = "",
}: {
  memberRounds: any[];
  paymentMethods?: Array<{ id: string; name: string }>;
  round?: any;
  initialKeyword?: string;
}) {
  const [keyword, setKeyword] = useState(initialKeyword);
  const [status, setStatus] = useState("ALL");
  const [payState, setPayState] = useState("ALL");
  const [scannedPaymentRow, setScannedPaymentRow] = useState<any | null>(null);
  const payableMemberRounds = useMemo(() => memberRounds.filter((row) => row.member?.status === "ACTIVE"), [memberRounds]);

  useEffect(() => {
    setKeyword(initialKeyword);
  }, [initialKeyword]);

  function applyScannedMember(payload: MemberPaymentQrPayload) {
    const memberCode = payload.memberCode;
    const normalizedMemberCode = memberCode.trim().toLowerCase();
    const matchedRows = payableMemberRounds.filter((row) => row.member?.memberCode?.trim().toLowerCase() === normalizedMemberCode);
    const activeRows = matchedRows.filter((row) => row.member?.status === "ACTIVE");
    const payableRow = activeRows.find((row) => {
      const rowRound = round ?? row.round;
      const outstandingAmount = row.current?.outstandingAmount ?? row.remainingAmount ?? 0;
      return (
        outstandingAmount > 0 &&
        paymentMethods.length > 0 &&
        (rowRound?.status === "OPEN" || (round && rowRound?.status === "CLOSED"))
      );
    });

    setKeyword(memberCode);
    setPayState("OUTSTANDING");

    if (!activeRows.length) {
      showError("ไม่พบสมาชิกจาก QR นี้ในรายการค้างชำระของ Workspace ปัจจุบัน");
      return;
    }

    if (!payableRow) {
      showError(paymentMethods.length ? "สมาชิกคนนี้ไม่มีรายการค้างชำระที่รับเงินได้" : "กรุณาเพิ่มวิธีชำระเงินก่อนรับเงิน");
      return;
    }

    const defaultPaymentMethodId = paymentMethods.some((method) => method.id === payload.paymentMethodId) ? payload.paymentMethodId : undefined;
    setScannedPaymentRow({ ...payableRow, round: round ?? payableRow.round, defaultPaymentMethodId });
  }

  const rows = useMemo(() => {
    const search = keyword.trim().toLowerCase();

    return payableMemberRounds.filter((row) => {
      const currentStatus = row.current?.currentStatus ?? row.status;
      const outstandingAmount = row.current?.outstandingAmount ?? row.remainingAmount ?? 0;
      const member = row.member ?? {};
      const haystack = [member.fullName, member.memberCode, member.studentNo, member.classroom, member.phone]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch = search ? haystack.includes(search) : true;
      const matchesStatus = matchStatus(currentStatus, status);
      const matchesPayState =
        payState === "ALL" ||
        (payState === "OUTSTANDING" && outstandingAmount > 0) ||
        (payState === "CLEARED" && outstandingAmount <= 0);

      return matchesSearch && matchesStatus && matchesPayState;
    });
  }, [keyword, payableMemberRounds, payState, status]);

  return (
    <section className="grid gap-3">
      <div className="rounded-2xl border border-blue-100 bg-[#eef3ff] p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-blue-600 text-white">
              <QrCode size={22} />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-slate-950">สแกน QR สมาชิกเพื่อชำระเงิน</h3>
              <p className="mt-1 text-sm text-slate-600">สแกนแล้วระบบจะกรองรายการค้างชำระของสมาชิกคนนั้นให้ทันที</p>
            </div>
          </div>
          <MemberPaymentQrScanner onScan={applyScannedMember} />
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
        <div className="grid gap-3 md:grid-cols-[1fr_180px_180px] md:items-end">
          <div className="relative">
            <Input
              label="ค้นหาสมาชิก"
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="ชื่อ, รหัส, เลขที่, ห้อง, เบอร์โทร"
              className="pl-10"
            />
            <Search className="pointer-events-none absolute bottom-3 left-3 text-slate-400" size={18} />
          </div>
          <Select label="สถานะ" value={status} onChange={(event) => setStatus(event.target.value)} options={statusOptions} />
          <Select label="ยอดชำระ" value={payState} onChange={(event) => setPayState(event.target.value)} options={payOptions} />
        </div>
        <div className="mt-3 flex items-center gap-2 text-xs font-medium text-slate-500">
          <SlidersHorizontal size={15} />
          แสดง {rows.length} จาก {payableMemberRounds.length} คน
        </div>
      </div>

      {rows.length ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((row) => {
            const rowRound = round ?? row.round;
            return (
              <PaymentCard
                key={row.id}
                row={{ ...row, round: rowRound }}
                paymentMethods={paymentMethods}
                canPay={(rowRound?.status === "OPEN" || (round && rowRound?.status === "CLOSED")) && paymentMethods.length > 0 && row.member?.status === "ACTIVE"}
                compact
              />
            );
          })}
        </div>
      ) : (
        <EmptyState title="ไม่พบสมาชิกตามเงื่อนไขที่เลือก" />
      )}

      <Modal
        title={`รับชำระเงิน${scannedPaymentRow?.member?.fullName ? ` - ${scannedPaymentRow.member.fullName}` : ""}`}
        open={!!scannedPaymentRow}
        onClose={() => setScannedPaymentRow(null)}
      >
        {scannedPaymentRow ? (
          <PaymentForm
            memberRoundId={scannedPaymentRow.id}
            outstandingAmount={scannedPaymentRow.current?.outstandingAmount ?? scannedPaymentRow.remainingAmount ?? 0}
            paymentMethods={paymentMethods}
            defaultPaymentMethodId={scannedPaymentRow.defaultPaymentMethodId}
            onSuccess={() => setScannedPaymentRow(null)}
          />
        ) : null}
      </Modal>
    </section>
  );
}
