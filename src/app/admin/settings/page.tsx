import { EmptyState } from "@/components/ui/EmptyState";
import { getAdminPlatformSettingsAction } from "@/features/admin/actions";
import { PlatformSettingForm } from "@/features/admin/components/AdminClientControls";

export default async function AdminSettingsPage() {
  const result = await getAdminPlatformSettingsAction();
  if (!result.success) return <EmptyState title="ไม่สามารถดึง settings ได้" description={result.message} />;

  return (
    <div className="grid gap-5">
      <Header title="ตั้งค่าแพลตฟอร์ม" description="ตั้งค่าระดับระบบ เช่น ลิมิตสมาชิก ฟีเจอร์ OTP/security retention และ maintenance mode" />
      <div className="grid gap-3">
        {result.data.settings.map((setting) => <PlatformSettingForm key={setting.key} setting={setting} />)}
      </div>
    </div>
  );
}
function Header({ title, description }: { title: string; description: string }) {
  return <div><h1 className="text-2xl font-black text-slate-950">{title}</h1><p className="mt-1 text-sm text-slate-500">{description}</p></div>;
}
