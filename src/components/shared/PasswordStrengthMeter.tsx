"use client";

import clsx from "clsx";

type Strength = {
  score: number;
  label: string;
  tone: string;
  advice: string[];
};

function getPasswordStrength(password: string): Strength {
  const checks = [
    password.length >= 8,
    /[a-z]/.test(password),
    /[A-Z]/.test(password),
    /\d/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ];
  const score = checks.filter(Boolean).length;
  const advice = [
    password.length >= 8 ? "" : "ใช้รหัสผ่านอย่างน้อย 8 ตัวอักษร",
    /[a-z]/.test(password) && /[A-Z]/.test(password) ? "" : "ผสมตัวพิมพ์เล็กและตัวพิมพ์ใหญ่",
    /\d/.test(password) ? "" : "เพิ่มตัวเลข",
    /[^A-Za-z0-9]/.test(password) ? "" : "เพิ่มสัญลักษณ์ เช่น ! @ #",
  ].filter(Boolean);

  if (!password) {
    return { score: 0, label: "ยังไม่ได้กรอกรหัสผ่าน", tone: "bg-slate-200", advice: ["หลีกเลี่ยงรหัสผ่านที่เดาง่าย เช่น วันเกิดหรือชื่อผู้ใช้"] };
  }
  if (score <= 2) return { score, label: "อ่อน", tone: "bg-red-500", advice };
  if (score <= 4) return { score, label: "ปานกลาง", tone: "bg-amber-500", advice };
  return { score, label: "แข็งแรง", tone: "bg-emerald-500", advice: ["รหัสผ่านนี้ดูแข็งแรงแล้ว"] };
}

export function PasswordStrengthMeter({ password }: { password: string }) {
  const strength = getPasswordStrength(password);
  const percent = Math.max((strength.score / 5) * 100, password ? 20 : 0);

  return (
    <div className="grid gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
      <div className="flex items-center justify-between gap-3">
        <span className="font-semibold text-slate-700">ความปลอดภัยรหัสผ่าน</span>
        <span className="font-bold text-slate-900">{strength.label}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-200">
        <div className={clsx("h-full rounded-full transition-all", strength.tone)} style={{ width: `${percent}%` }} />
      </div>
      <ul className="grid gap-1 leading-5">
        {strength.advice.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
