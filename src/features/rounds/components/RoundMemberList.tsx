"use client";

import { useMemo, useState } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { PaymentCard } from "@/features/payments/components/PaymentCard";

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
}: {
  memberRounds: any[];
  paymentMethods?: Array<{ id: string; name: string }>;
  round?: any;
}) {
  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState("ALL");
  const [payState, setPayState] = useState("ALL");

  const rows = useMemo(() => {
    const search = keyword.trim().toLowerCase();

    return memberRounds.filter((row) => {
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
  }, [keyword, memberRounds, payState, status]);

  return (
    <section className="grid gap-3">
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
          แสดง {rows.length} จาก {memberRounds.length} คน
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
                canPay={(rowRound?.status === "OPEN" || (round && rowRound?.status === "CLOSED")) && paymentMethods.length > 0}
                compact
              />
            );
          })}
        </div>
      ) : (
        <EmptyState title="ไม่พบสมาชิกตามเงื่อนไขที่เลือก" />
      )}
    </section>
  );
}
