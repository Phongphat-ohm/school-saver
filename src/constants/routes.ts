import type { WorkspaceRole } from "@/generated/prisma/client";

export const routes = {
  home: "/",
  login: "/login",
  dashboard: "/dashboard",
  workspaces: "/workspaces",
  rounds: "/rounds",
  payments: "/payments",
  overdue: "/overdue",
  members: "/members",
  paymentMethods: "/payment-methods",
  users: "/users",
  reports: "/reports",
  help: "/help",
  settings: "/settings",
} as const;

export const navigationGroups = ["ภาพรวม", "การเก็บเงิน", "จัดการข้อมูล", "รายงานและระบบ"] as const;

export const navigationItems = [
  { label: "Dashboard", href: routes.dashboard, icon: "LayoutDashboard", group: "ภาพรวม", allowedRoles: ["OWNER", "ADMIN", "COLLECTOR", "VIEWER"] },
  { label: "Workspace", href: routes.workspaces, icon: "BriefcaseBusiness", group: "ภาพรวม", allowedRoles: ["OWNER", "ADMIN", "COLLECTOR", "VIEWER"] },
  { label: "รอบเก็บเงิน", href: routes.rounds, icon: "CalendarClock", group: "การเก็บเงิน", allowedRoles: ["OWNER", "ADMIN", "COLLECTOR", "VIEWER"] },
  { label: "รับชำระเงิน", href: routes.payments, icon: "WalletCards", group: "การเก็บเงิน", allowedRoles: ["OWNER", "ADMIN", "COLLECTOR"] },
  { label: "คนค้างจ่าย", href: routes.overdue, icon: "CircleAlert", group: "การเก็บเงิน", allowedRoles: ["OWNER", "ADMIN", "COLLECTOR"] },
  { label: "สมาชิก", href: routes.members, icon: "UsersRound", group: "จัดการข้อมูล", allowedRoles: ["OWNER", "ADMIN", "COLLECTOR"] },
  { label: "วิธีชำระเงิน", href: routes.paymentMethods, icon: "CreditCard", group: "จัดการข้อมูล", allowedRoles: ["OWNER", "ADMIN"] },
  { label: "ผู้ใช้งาน", href: routes.users, icon: "UserCog", group: "จัดการข้อมูล", allowedRoles: ["OWNER", "ADMIN"] },
  { label: "รายงาน", href: routes.reports, icon: "ChartNoAxesCombined", group: "รายงานและระบบ", allowedRoles: ["OWNER", "ADMIN", "COLLECTOR", "VIEWER"] },
  { label: "วิธีใช้งาน", href: routes.help, icon: "BookOpenText", group: "รายงานและระบบ", allowedRoles: ["OWNER", "ADMIN", "COLLECTOR", "VIEWER"] },
  { label: "ตั้งค่า", href: routes.settings, icon: "Settings", group: "รายงานและระบบ", allowedRoles: ["OWNER", "ADMIN", "COLLECTOR", "VIEWER"] },
] satisfies Array<{
  label: string;
  href: string;
  icon: string;
  group: (typeof navigationGroups)[number];
  allowedRoles: WorkspaceRole[];
}>;

export function canShowNavigationItem(role: WorkspaceRole | null | undefined, item: (typeof navigationItems)[number]) {
  return !!role && (item.allowedRoles as WorkspaceRole[]).includes(role);
}

export function getNavigationItemsForRole(role: WorkspaceRole | null | undefined) {
  return navigationItems.filter((item) => canShowNavigationItem(role, item));
}

export function getAllowedRolesForPath(pathname: string): WorkspaceRole[] | null {
  const match = navigationItems.find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));
  return match?.allowedRoles ?? null;
}
