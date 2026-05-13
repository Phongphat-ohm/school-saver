"use client";

import type { ReactNode } from "react";
import { X } from "lucide-react";

export function Modal({
  title,
  open,
  onClose,
  children
}: {
  title: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode
}) {
  if (!open) return null;

  return (
    // 1. Container หลัก: กำหนดให้ครอบเต็มจอ และใส่ overflow-y-auto เพื่อให้มี Scrollbar ที่ระดับนี้
    <div className="fixed inset-0 isolate z-[9999] overflow-y-auto bg-slate-950/50 backdrop-blur-sm h-screen">
      
      {/* 2. Wrapper: ทำหน้าที่จัดให้ Modal อยู่กึ่งกลาง และกำหนด Padding (py-10) ไม่ให้กล่องติดขอบบน-ล่างเกินไปเวลาเนื้อหายาว */}
      <div className="flex min-h-full items-center justify-center p-4 py-10">
        
        {/* 3. ตัว Modal: ปล่อยความสูงให้ยืดตามเนื้อหา (ลบ max-h และ overflow ออก) */}
        <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">

          {/* Header Section */}
          <div className="mb-5 flex items-center justify-between gap-3">
            <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
            <button
              className="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
              onClick={onClose}
              type="button"
              aria-label="Close"
            >
              <X className="h-5 w-5" strokeWidth={2.5} />
            </button>
          </div>

          {/* Content Section */}
          <div className="text-slate-600">
            {children}
          </div>

        </div>
      </div>
    </div>
  );
}