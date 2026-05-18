"use client";

import { useRouter } from "next/navigation";
import { Select } from "@/components/ui/Select";

export function PaymentRoundFilter({ rounds, value }: { rounds: Array<{ id: string; title: string }>; value?: string }) {
  const router = useRouter();

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
      <Select
        label="รอบเก็บเงิน"
        value={value ?? ""}
        onChange={(event) => {
          const roundId = event.target.value;
          router.push(roundId ? `/payments?roundId=${roundId}` : "/payments");
        }}
        options={[{ label: "ทุกรอบ", value: "" }, ...rounds.map((round) => ({ label: round.title, value: round.id }))]}
      />
    </div>
  );
}
