"use client";
import { logoutAction } from "@/features/auth/actions";
import { useEffect } from "react";

export default function LogoutPage() {
    useEffect(() => {
        // เรียกใช้งานฟังก์ชันออกจากระบบเมื่อโหลดหน้านี้
        logoutAction();
    }, []);

    return (
        <div className="w-full min-h-screen flex flex-col items-center justify-center bg-slate-50 app-grid-bg px-4">
            <div className="bg-white p-8 md:p-10 rounded-3xl shadow-xl flex flex-col items-center text-center max-w-md w-full">

                {/* Logo (สามารถเปลี่ยนเป็นรูปภาพจริงของคุณได้) */}
                <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-3 text-4xl shadow-sm">
                    🐷
                </div>

                {/* Brand Name */}
                <h1 className="text-2xl font-black text-blue-600 tracking-wide mb-8">
                    SchoolSaver
                </h1>

                {/* Loading Spinner */}
                <div className="relative flex items-center justify-center w-20 h-20 mb-8">
                    {/* วงแหวนพื้นหลังสีอ่อน */}
                    <div className="absolute inset-0 border-4 border-blue-100 rounded-full"></div>
                    {/* วงแหวนสีเข้มที่กำลังหมุน */}
                    <div className="absolute inset-0 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
                </div>

                {/* Text Content */}
                <h2 className="text-xl md:text-2xl font-bold text-gray-800 mb-2 animate-pulse">
                    กำลังออกจากระบบ...
                </h2>
                <p className="text-sm md:text-base text-gray-500">
                    กรุณารอสักครู่ ระบบกำลังบันทึกข้อมูลและออกจากระบบ
                </p>

            </div>
        </div>
    );
}