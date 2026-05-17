"use client";

import { useRef } from "react";
import clsx from "clsx";

type OtpInputProps = {
  label?: string;
  value: string;
  length?: number;
  disabled?: boolean;
  onChange: (value: string) => void;
};

export function OtpInput({ label, value, length = 6, disabled, onChange }: OtpInputProps) {
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);
  const digits = value.padEnd(length, " ").slice(0, length).split("");

  function setDigit(index: number, digit: string) {
    const next = digits.map((item) => (item === " " ? "" : item));
    next[index] = digit;
    onChange(next.join("").slice(0, length));
    if (digit && index < length - 1) inputsRef.current[index + 1]?.focus();
  }

  return (
    <div className="grid gap-2">
      {label ? <p className="text-sm font-medium text-slate-700">{label}</p> : null}
      <div className="grid grid-cols-6 gap-2">
        {digits.map((digit, index) => (
          <input
            key={index}
            ref={(node) => {
              inputsRef.current[index] = node;
            }}
            aria-label={`OTP digit ${index + 1}`}
            type="text"
            inputMode="numeric"
            autoComplete={index === 0 ? "one-time-code" : "off"}
            disabled={disabled}
            value={digit === " " ? "" : digit}
            className={clsx(
              "aspect-square min-h-11 w-full rounded-2xl border border-slate-200 bg-white text-center text-lg font-black text-slate-950 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-60",
            )}
            onChange={(event) => {
              const next = event.target.value.replace(/\D/g, "");
              if (next.length > 1) {
                onChange(next.slice(0, length));
                inputsRef.current[Math.min(next.length, length) - 1]?.focus();
              } else {
                setDigit(index, next);
              }
            }}
            onKeyDown={(event) => {
              if (event.key === "Backspace" && !digits[index].trim() && index > 0) {
                inputsRef.current[index - 1]?.focus();
              }
            }}
            onPaste={(event) => {
              event.preventDefault();
              const pasted = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
              onChange(pasted);
              inputsRef.current[Math.min(pasted.length, length) - 1]?.focus();
            }}
          />
        ))}
      </div>
    </div>
  );
}
