import { RegisterForm } from "@/features/auth/components/RegisterForm";

export default function RegisterPage() {
  return (
    <main className="grid min-h-dvh place-items-center bg-[#dfe7ff] px-4 py-8 [background-image:linear-gradient(rgba(30,64,175,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(30,64,175,0.08)_1px,transparent_1px)] [background-size:28px_28px]">
      <section className="w-full max-w-xl rounded-[2rem] bg-white p-6 shadow-xl shadow-blue-950/10">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 grid size-14 place-items-center rounded-3xl bg-[#11152e] text-xl font-black text-white">S</div>
          <h1 className="text-3xl font-black text-blue-700">สมัครสมาชิก</h1>
          <p className="mt-2 text-lg font-semibold text-slate-800">สร้างบัญชี SchoolSaver</p>
          <p className="mt-1 text-sm text-slate-500">ตั้ง workspace แรก ระบบจะให้สิทธิ์ OWNER อัตโนมัติ</p>
        </div>
        <RegisterForm />
      </section>
    </main>
  );
}
