"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Image from "next/image";
import { ReactQRCode } from "@lglab/react-qr-code";
import { CreditCard, History, IdCard, Search, WalletCards, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { searchPublicMemberCardAction } from "@/features/member-card/actions";
import { formatThaiDate, formatThaiDateTime } from "@/lib/date";
import { formatMoney } from "@/lib/money";
import { showError } from "@/lib/swal";

type PublicMemberCardProps = {
  token: string;
  workspace: { name: string; description: string | null };
};

export function PublicMemberCard({ token, workspace }: PublicMemberCardProps) {
  const [keyword, setKeyword] = useState("");
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<any | null>(null);
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState("");

  function search(value = keyword) {
    const nextKeyword = value.trim();
    setKeyword(nextKeyword);
    startTransition(async () => {
      const response = await searchPublicMemberCardAction(token, nextKeyword);
      if (!response.success) {
        setResult(null);
        setSelectedPaymentMethodId("");
        await showError(response.message);
        return;
      }
      setResult(response.data);
    });
  }

  useEffect(() => {
    if (!result) return;
    const defaultMethod = result.workspace.paymentMethods.find((method: any) => method.qrImageUrl) ?? result.workspace.paymentMethods[0];
    setSelectedPaymentMethodId((current) => {
      const currentStillExists = result.workspace.paymentMethods.some((method: any) => method.id === current);
      return currentStillExists ? current : (defaultMethod?.id ?? "");
    });
  }, [result]);

  const paymentMethods = result?.workspace.paymentMethods ?? [];
  const preferredMethod = paymentMethods.find((method: any) => method.id === selectedPaymentMethodId) ?? paymentMethods.find((method: any) => method.qrImageUrl) ?? paymentMethods[0];
  const qrValue = preferredMethod
    ? JSON.stringify({
        workspace: result.workspace.name,
        memberCode: result.member.memberCode,
        memberName: result.member.fullName,
        amount: result.totals.outstanding,
        method: preferredMethod.name,
        account: preferredMethod.accountNumber,
      })
    : "";
  const transactions = useMemo(
    () => result?.member.memberRounds.flatMap((round: any) => round.transactions.map((transaction: any) => ({ ...transaction, roundTitle: round.round.title }))) ?? [],
    [result],
  );

  return (
    <main className="min-h-dvh bg-[#f4f7fb] bg-[linear-gradient(to_right,rgba(15,23,42,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(15,23,42,0.08)_1px,transparent_1px)] bg-[size:28px_28px] px-4 py-5 text-slate-950">
      <div className="mx-auto grid w-full max-w-6xl gap-4">
        <section className="overflow-hidden rounded-2xl border border-white/80 bg-white/95 shadow-sm backdrop-blur">
          <div className="grid gap-5 p-5 lg:grid-cols-[1fr_420px] lg:items-center">
            <div className="flex min-w-0 items-center gap-3">
              <Image src="/images/school-saver-logo.webp" alt="SchoolSaver" width={56} height={56} className="size-14 rounded-2xl object-contain shadow-sm" priority />
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-wide text-blue-700">SchoolSaver Member Card</p>
                <h1 className="truncate text-2xl font-black text-slate-950 sm:text-3xl">{workspace.name}</h1>
                <p className="mt-1 line-clamp-2 text-sm text-slate-500">{workspace.description ?? "ตรวจสอบยอดค้าง ประวัติชำระเงิน และ QR Code สำหรับจ่ายเงิน"}</p>
              </div>
            </div>

            <form
              className="rounded-2xl border border-blue-100 bg-blue-50/80 p-3"
              onSubmit={(event) => {
                event.preventDefault();
                search();
              }}
            >
              <div className="grid gap-2">
                <label className="text-sm font-black text-blue-950" htmlFor="member-card-search">
                  ค้นหาบัตรสมาชิก
                </label>
                <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                  <div className="relative">
                    <Input
                      id="member-card-search"
                      label=""
                      value={keyword}
                      onChange={(event) => setKeyword(event.target.value)}
                      placeholder="รหัสสมาชิก, เลขที่, ชื่อ หรือเบอร์โทร"
                      className="min-h-12 rounded-xl bg-white pl-10 pr-10 text-base"
                      autoComplete="off"
                    />
                    <Search className="pointer-events-none absolute left-3 top-3.5 text-slate-400" size={18} />
                    {keyword ? (
                      <button
                        type="button"
                        className="absolute right-3 top-3.5 text-slate-400 transition hover:text-slate-700"
                        onClick={() => {
                          setKeyword("");
                          setResult(null);
                          setSelectedPaymentMethodId("");
                        }}
                        aria-label="ล้างคำค้นหา"
                      >
                        <X size={18} />
                      </button>
                    ) : null}
                  </div>
                  <Button disabled={pending} className="min-h-12 gap-2 px-5">
                    <Search size={18} />
                    {pending ? "กำลังค้นหา..." : "ค้นหา"}
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {["รหัสสมาชิก", "เลขที่", "ชื่อ-สกุล", "เบอร์โทร"].map((item) => (
                    <span key={item} className="rounded-full bg-white px-3 py-1 text-xs font-bold text-blue-700">
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            </form>
          </div>
        </section>

        {result ? (
          <div className="grid gap-4 lg:grid-cols-[400px_minmax(0,1fr)] lg:items-start">
            <PaymentQrPanel
              paymentMethods={paymentMethods}
              preferredMethod={preferredMethod}
              selectedPaymentMethodId={selectedPaymentMethodId}
              onPaymentMethodChange={setSelectedPaymentMethodId}
              qrValue={qrValue}
              result={result}
            />

            <section className="grid gap-4">
              <MemberIdentity result={result} />

              <div className="grid gap-3 sm:grid-cols-3">
                <AmountCard label="จ่ายแล้ว" value={formatMoney(result.totals.paid)} tone="emerald" />
                <AmountCard label="ยอดค้าง" value={formatMoney(result.totals.outstanding)} tone="rose" />
                <AmountCard label="ค่าปรับ" value={formatMoney(result.totals.fine)} tone="amber" />
              </div>

              <section className="rounded-2xl border border-white/80 bg-white/95 p-4 shadow-sm">
                <div className="mb-3 flex items-center gap-2">
                  <WalletCards size={18} className="text-blue-600" />
                  <h3 className="font-bold text-slate-950">ยอดตามรอบเก็บเงิน</h3>
                </div>
                <div className="grid gap-2">
                  {result.member.memberRounds.map((row: any) => (
                    <div key={row.id} className="rounded-xl border border-slate-200 bg-white p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="font-semibold text-slate-950">{row.round.title}</p>
                          <p className="text-xs text-slate-500">ครบกำหนด {formatThaiDate(row.round.dueDate)}</p>
                        </div>
                        <StatusBadge status={row.current.currentStatus} />
                      </div>
                      <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
                        <MiniMetric label="จ่ายแล้ว" value={formatMoney(row.paidAmount)} />
                        <MiniMetric label="ค่าปรับ" value={formatMoney(row.current.currentFine)} />
                        <MiniMetric label="ค้าง" value={formatMoney(row.current.outstandingAmount)} />
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-2xl border border-white/80 bg-white/95 p-4 shadow-sm">
                <div className="mb-3 flex items-center gap-2">
                  <History size={18} className="text-blue-600" />
                  <h3 className="font-bold text-slate-950">ประวัติการทำรายการ</h3>
                </div>
                <div className="grid gap-2">
                  {transactions.length ? (
                    transactions.map((transaction: any) => (
                      <div key={transaction.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 p-3 text-sm">
                        <div>
                          <p className="font-semibold text-slate-950">{transaction.roundTitle}</p>
                          <p className="text-xs text-slate-500">{formatThaiDateTime(transaction.paidAt)} • {transaction.paymentMethod.name}</p>
                        </div>
                        <p className="font-bold text-emerald-700">{formatMoney(transaction.amount)}</p>
                      </div>
                    ))
                  ) : (
                    <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-500">ยังไม่มีประวัติการชำระเงิน</p>
                  )}
                </div>
              </section>
            </section>
          </div>
        ) : (
          <section className="grid gap-4 rounded-2xl border border-dashed border-blue-200 bg-white/80 p-6 text-center shadow-sm backdrop-blur">
            <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-blue-600 text-white">
              <CreditCard size={28} />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-950">ค้นหาสมาชิกเพื่อแสดง QR Code</h2>
              <p className="mt-1 text-sm text-slate-500">กรอกรหัสสมาชิก เลขที่ ชื่อ หรือเบอร์โทร ระบบจะแสดง QR จ่ายเงินเป็นส่วนแรกทันที</p>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

function PaymentQrPanel({
  paymentMethods,
  preferredMethod,
  selectedPaymentMethodId,
  onPaymentMethodChange,
  qrValue,
  result,
}: {
  paymentMethods: any[];
  preferredMethod: any;
  selectedPaymentMethodId: string;
  onPaymentMethodChange: (value: string) => void;
  qrValue: string;
  result: any;
}) {
  return (
    <aside className="order-first rounded-2xl border border-white/80 bg-white/95 p-4 shadow-sm backdrop-blur lg:sticky lg:top-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="grid size-10 place-items-center rounded-xl bg-blue-600 text-white">
            <CreditCard size={20} />
          </div>
          <div>
            <p className="text-xs font-bold text-blue-700">QR Code</p>
            <h3 className="font-black text-slate-950">จ่ายเงิน</h3>
          </div>
        </div>
        <p className="rounded-full bg-rose-50 px-3 py-1 text-xs font-black text-rose-700">{formatMoney(result.totals.outstanding)}</p>
      </div>

      {preferredMethod ? (
        <div className="grid gap-3">
          {paymentMethods.length > 1 ? (
            <Select
              label="เลือกวิธีชำระเงิน"
              value={selectedPaymentMethodId}
              onChange={(event) => onPaymentMethodChange(event.target.value)}
              className="rounded-xl"
              options={paymentMethods.map((method) => ({
                label: method.bankName ? `${method.name} - ${method.bankName}` : method.name,
                value: method.id,
              }))}
            />
          ) : null}

          <div className="mx-auto grid aspect-square w-full max-w-72 place-items-center rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
            {preferredMethod.qrImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preferredMethod.qrImageUrl} alt="Payment QR" className="max-h-full max-w-full object-contain" />
            ) : (
              <ReactQRCode value={qrValue} size={244} level="H" marginSize={2} />
            )}
          </div>

          <div className="rounded-xl bg-slate-50 p-3 text-sm">
            <p className="font-black text-slate-950">{preferredMethod.name}</p>
            <p className="mt-1 text-slate-500">{preferredMethod.bankName ?? preferredMethod.type}</p>
            {preferredMethod.accountNumber ? <p className="mt-2 font-semibold text-slate-700">เลขบัญชี/พร้อมเพย์ {preferredMethod.accountNumber}</p> : null}
            {preferredMethod.accountName ? <p className="text-slate-700">ชื่อบัญชี {preferredMethod.accountName}</p> : null}
          </div>

          <div className="rounded-xl bg-blue-50 p-3">
            <p className="text-xs font-bold text-blue-700">สมาชิก</p>
            <p className="mt-1 font-black text-blue-950">{result.member.fullName}</p>
            <p className="text-sm text-blue-800">รหัส {result.member.memberCode}</p>
          </div>
        </div>
      ) : (
        <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-500">workspace นี้ยังไม่ได้เพิ่มวิธีชำระเงิน</p>
      )}
    </aside>
  );
}

function MemberIdentity({ result }: { result: any }) {
  return (
    <div className="rounded-2xl bg-slate-950 p-5 text-white shadow-sm">
      <div className="flex items-start gap-3">
        <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-white text-slate-950">
          <IdCard size={24} />
        </div>
        <div className="min-w-0">
          <p className="text-sm text-blue-100">Member Card</p>
          <h2 className="mt-1 break-words text-3xl font-black">{result.member.fullName}</h2>
        </div>
      </div>
      <div className="mt-4 grid gap-2 text-sm sm:grid-cols-3">
        <Info label="รหัสสมาชิก" value={result.member.memberCode} />
        <Info label="เลขที่" value={result.member.studentNo ?? "-"} />
        <Info label="ห้อง" value={result.member.classroom ?? "-"} />
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/10 p-3">
      <p className="text-xs text-blue-100">{label}</p>
      <p className="mt-1 font-bold">{value}</p>
    </div>
  );
}

function AmountCard({ label, value, tone }: { label: string; value: string; tone: "emerald" | "rose" | "amber" }) {
  const className = tone === "emerald" ? "bg-emerald-50 text-emerald-700" : tone === "rose" ? "bg-rose-50 text-rose-700" : "bg-amber-50 text-amber-700";
  return (
    <div className={`rounded-2xl border border-white/80 p-4 shadow-sm ${className}`}>
      <p className="text-sm font-bold">{label}</p>
      <p className="mt-2 text-2xl font-black">{value}</p>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 p-2">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="break-words font-bold text-slate-950">{value}</p>
    </div>
  );
}
