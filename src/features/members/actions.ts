"use server";

import { revalidatePath } from "next/cache";
import * as XLSX from "xlsx";
import { logActivity } from "@/lib/activity-log";
import { getWorkspaceMemberLimit } from "@/lib/platform-settings";
import { prisma } from "@/lib/prisma";
import { OWNER_ADMIN, requireWorkspaceRole } from "@/lib/permissions";
import { getCurrentWorkspaceOrThrow } from "@/lib/workspace";
import { errorResult, successResult } from "@/lib/result";
import { googleSheetImportSchema, importMembersSchema, memberSchema } from "@/features/members/schemas";

function toGoogleSheetCsvUrl(inputUrl: string) {
  const url = new URL(inputUrl);
  if (url.hostname !== "docs.google.com") throw new Error("รองรับเฉพาะลิงก์ Google Sheets จาก docs.google.com");
  const match = url.pathname.match(/\/spreadsheets\/d\/([^/]+)/);
  if (!match?.[1]) throw new Error("ไม่พบรหัส Google Sheet ในลิงก์");
  const gid = url.searchParams.get("gid") ?? "0";
  return `https://docs.google.com/spreadsheets/d/${match[1]}/export?format=csv&gid=${gid}`;
}

function normalizeImportText(value: unknown) {
  if (value === null || value === undefined) return "";
  const text = String(value).replace(/^\uFEFF/, "").trim();
  if (/^#{2,}$/.test(text)) return "";
  return text.startsWith("'") ? text.slice(1).trim() : text;
}

export async function getMembersAction() {
  try {
    const { workspaceId } = await getCurrentWorkspaceOrThrow();
    const members = await prisma.member.findMany({
      where: { workspaceId, status: { not: "HIDDEN" } },
      orderBy: [{ studentNo: "asc" }, { fullName: "asc" }],
    });
    return successResult(members);
  } catch {
    return errorResult("ไม่สามารถดึงรายชื่อสมาชิกได้");
  }
}

export async function createMemberAction(data: unknown) {
  try {
    const { workspaceId, userId } = await requireWorkspaceRole(OWNER_ADMIN);
    const parsed = memberSchema.safeParse(data);
    if (!parsed.success) return errorResult("ข้อมูลสมาชิกไม่ถูกต้อง", parsed.error.flatten().fieldErrors);
    const duplicated = await prisma.member.findFirst({
      where: { workspaceId, memberCode: parsed.data.memberCode, status: { not: "HIDDEN" } },
    });
    if (duplicated) return errorResult("รหัสสมาชิกนี้มีอยู่แล้วใน workspace นี้");
    const [memberCount, memberLimit] = await Promise.all([
      prisma.member.count({ where: { workspaceId, status: "ACTIVE" } }),
      getWorkspaceMemberLimit(workspaceId),
    ]);
    if (memberCount >= memberLimit) return errorResult(`workspace นี้มีสมาชิกครบตาม limit แล้ว (${memberLimit} คน)`);
    const member = await prisma.member.create({
      data: { workspaceId, ...parsed.data, status: "ACTIVE" },
    });
    await logActivity({ workspaceId, userId, action: "CREATE_MEMBER", detail: `เพิ่มสมาชิก ${member.fullName} (${member.memberCode})` });
    revalidatePath("/members");
    return successResult(member, "เพิ่มสมาชิกสำเร็จ");
  } catch {
    return errorResult("ไม่สามารถเพิ่มสมาชิกได้");
  }
}

export async function updateMemberAction(id: string, data: unknown) {
  try {
    const { workspaceId, userId } = await requireWorkspaceRole(OWNER_ADMIN);
    const parsed = memberSchema.safeParse(data);
    if (!parsed.success) return errorResult("ข้อมูลสมาชิกไม่ถูกต้อง", parsed.error.flatten().fieldErrors);
    const member = await prisma.member.findFirst({ where: { id, workspaceId } });
    if (!member) return errorResult("ไม่พบสมาชิกใน workspace นี้");
    const duplicated = await prisma.member.findFirst({
      where: { workspaceId, memberCode: parsed.data.memberCode, status: { not: "HIDDEN" }, NOT: { id } },
    });
    if (duplicated) return errorResult("รหัสสมาชิกนี้มีอยู่แล้วใน workspace นี้");
    const updated = await prisma.member.update({ where: { id }, data: parsed.data });
    await logActivity({ workspaceId, userId, action: "UPDATE_MEMBER", detail: `แก้ไขสมาชิก ${updated.fullName} (${updated.memberCode})` });
    revalidatePath("/members");
    return successResult(updated, "แก้ไขสมาชิกสำเร็จ");
  } catch {
    return errorResult("ไม่สามารถแก้ไขสมาชิกได้");
  }
}

export async function disableMemberAction(id: string) {
  try {
    const { workspaceId, userId } = await requireWorkspaceRole(OWNER_ADMIN);
    const member = await prisma.member.findFirst({ where: { id, workspaceId } });
    if (!member) return errorResult("ไม่พบสมาชิกใน workspace นี้");
    const updated = await prisma.member.update({ where: { id }, data: { status: "INACTIVE" } });
    await logActivity({ workspaceId, userId, action: "DISABLE_MEMBER", detail: `ปิดใช้งานสมาชิก ${member.fullName} (${member.memberCode})` });
    revalidatePath("/members");
    return successResult(updated, "ปิดใช้งานสมาชิกแล้ว");
  } catch {
    return errorResult("ไม่สามารถปิดใช้งานสมาชิกได้");
  }
}

export async function disableMembersAction(ids: string[]) {
  try {
    const { workspaceId, userId } = await requireWorkspaceRole(OWNER_ADMIN);
    const uniqueIds = Array.from(new Set(ids.filter(Boolean)));
    if (uniqueIds.length === 0) return errorResult("กรุณาเลือกสมาชิกที่ต้องการลบ");

    const result = await prisma.member.updateMany({
      where: { workspaceId, id: { in: uniqueIds }, status: "ACTIVE" },
      data: { status: "INACTIVE" },
    });
    await logActivity({ workspaceId, userId, action: "DISABLE_MEMBER", detail: `ปิดใช้งานสมาชิก ${result.count} รายการ` });

    revalidatePath("/members");
    return successResult({ count: result.count }, `ลบสมาชิกสำเร็จ ${result.count} รายการ`);
  } catch {
    return errorResult("ไม่สามารถลบสมาชิกที่เลือกได้");
  }
}

export async function enableMemberAction(id: string) {
  try {
    const { workspaceId, userId } = await requireWorkspaceRole(OWNER_ADMIN);
    const member = await prisma.member.findFirst({ where: { id, workspaceId, status: "INACTIVE" } });
    if (!member) return errorResult("ไม่พบสมาชิกที่ปิดใช้งานใน workspace นี้");

    const [activeCount, memberLimit] = await Promise.all([
      prisma.member.count({ where: { workspaceId, status: "ACTIVE" } }),
      getWorkspaceMemberLimit(workspaceId),
    ]);
    if (activeCount >= memberLimit) return errorResult(`เปิดใช้งานไม่ได้ เพราะสมาชิก ACTIVE ครบ limit แล้ว (${activeCount}/${memberLimit} คน)`);

    const updated = await prisma.member.update({ where: { id }, data: { status: "ACTIVE" } });
    await logActivity({ workspaceId, userId, action: "ENABLE_MEMBER", detail: `เปิดใช้งานสมาชิก ${member.fullName} (${member.memberCode})` });
    revalidatePath("/members");
    revalidatePath("/rounds");
    return successResult(updated, "เปิดใช้งานสมาชิกแล้ว");
  } catch {
    return errorResult("ไม่สามารถเปิดใช้งานสมาชิกได้");
  }
}

export async function enableMembersAction(ids: string[]) {
  try {
    const { workspaceId, userId } = await requireWorkspaceRole(OWNER_ADMIN);
    const uniqueIds = Array.from(new Set(ids.filter(Boolean)));
    if (uniqueIds.length === 0) return errorResult("กรุณาเลือกสมาชิกที่ต้องการเปิดใช้งาน");

    const [membersToEnable, activeCount, memberLimit] = await Promise.all([
      prisma.member.findMany({ where: { workspaceId, id: { in: uniqueIds }, status: "INACTIVE" }, select: { id: true } }),
      prisma.member.count({ where: { workspaceId, status: "ACTIVE" } }),
      getWorkspaceMemberLimit(workspaceId),
    ]);
    if (membersToEnable.length === 0) return errorResult("ไม่พบสมาชิกที่ปิดใช้งานในรายการที่เลือก");
    const availableSlots = Math.max(0, memberLimit - activeCount);
    if (membersToEnable.length > availableSlots) {
      return errorResult(`เปิดใช้งานไม่ได้ เพราะจะเกิน limit สมาชิก (${activeCount}/${memberLimit} คน เหลือ ${availableSlots} คน)`);
    }

    const result = await prisma.member.updateMany({
      where: { workspaceId, id: { in: membersToEnable.map((member) => member.id) }, status: "INACTIVE" },
      data: { status: "ACTIVE" },
    });
    await logActivity({ workspaceId, userId, action: "ENABLE_MEMBER", detail: `เปิดใช้งานสมาชิก ${result.count} รายการ` });

    revalidatePath("/members");
    revalidatePath("/rounds");
    return successResult({ count: result.count }, `เปิดใช้งานสมาชิกสำเร็จ ${result.count} รายการ`);
  } catch {
    return errorResult("ไม่สามารถเปิดใช้งานสมาชิกที่เลือกได้");
  }
}

export async function hideMemberAction(id: string) {
  try {
    const { workspaceId, userId } = await requireWorkspaceRole(OWNER_ADMIN);
    const member = await prisma.member.findFirst({ where: { id, workspaceId, status: { not: "HIDDEN" } } });
    if (!member) return errorResult("ไม่พบสมาชิกใน workspace นี้");
    const updated = await prisma.member.update({ where: { id }, data: { status: "HIDDEN" } });
    await logActivity({ workspaceId, userId, action: "HIDE_MEMBER", detail: `ซ่อนสมาชิก ${member.fullName} (${member.memberCode})` });
    revalidatePath("/members");
    return successResult(updated, "ลบแบบไม่เห็นแล้ว");
  } catch {
    return errorResult("ไม่สามารถลบแบบไม่เห็นได้");
  }
}

export async function hideMembersAction(ids: string[]) {
  try {
    const { workspaceId, userId } = await requireWorkspaceRole(OWNER_ADMIN);
    const uniqueIds = Array.from(new Set(ids.filter(Boolean)));
    if (uniqueIds.length === 0) return errorResult("กรุณาเลือกสมาชิกที่ต้องการลบแบบไม่เห็น");

    const result = await prisma.member.updateMany({
      where: { workspaceId, id: { in: uniqueIds }, status: { not: "HIDDEN" } },
      data: { status: "HIDDEN" },
    });
    await logActivity({ workspaceId, userId, action: "HIDE_MEMBER", detail: `ซ่อนสมาชิก ${result.count} รายการ` });

    revalidatePath("/members");
    return successResult({ count: result.count }, `ลบแบบไม่เห็นสำเร็จ ${result.count} รายการ`);
  } catch {
    return errorResult("ไม่สามารถลบแบบไม่เห็นสมาชิกที่เลือกได้");
  }
}

export async function importMembersAction(data: unknown) {
  try {
    const { workspaceId, userId } = await requireWorkspaceRole(OWNER_ADMIN);
    const parsed = importMembersSchema.safeParse(data);
    if (!parsed.success) return errorResult("ข้อมูล import ไม่ถูกต้อง", parsed.error.flatten().fieldErrors);

    const normalizedRows = parsed.data.rows.map((row) => ({
      memberCode: normalizeImportText(row.memberCode),
      studentNo: normalizeImportText(row.studentNo) || undefined,
      fullName: normalizeImportText(row.fullName),
      classroom: normalizeImportText(row.classroom) || undefined,
      phone: normalizeImportText(row.phone) || undefined,
    }));

    const duplicatedInFile = normalizedRows
      .map((row) => row.memberCode)
      .filter((code, index, list) => list.indexOf(code) !== index);
    if (duplicatedInFile.length > 0) {
      return errorResult(`พบรหัสสมาชิกซ้ำในไฟล์: ${Array.from(new Set(duplicatedInFile)).join(", ")}`);
    }

    const existing = await prisma.member.findMany({
      where: { workspaceId, memberCode: { in: normalizedRows.map((row) => row.memberCode) }, status: { not: "HIDDEN" } },
      select: { memberCode: true },
    });
    if (existing.length > 0) {
      return errorResult(`พบรหัสสมาชิกที่มีอยู่แล้วใน workspace: ${existing.map((row) => row.memberCode).join(", ")}`);
    }

    const [memberCount, memberLimit] = await Promise.all([
      prisma.member.count({ where: { workspaceId, status: "ACTIVE" } }),
      getWorkspaceMemberLimit(workspaceId),
    ]);
    const availableSlots = Math.max(0, memberLimit - memberCount);
    if (normalizedRows.length > availableSlots) {
      return errorResult(`นำเข้าไม่ได้ เพราะจะเกิน limit สมาชิกของ workspace (${memberCount}/${memberLimit} คน เหลือ ${availableSlots} คน)`);
    }

    const created = await prisma.member.createMany({
      data: normalizedRows.map((row) => ({
        workspaceId,
        ...row,
        status: "ACTIVE" as const,
      })),
    });
    await logActivity({ workspaceId, userId, action: "IMPORT_MEMBERS", detail: `นำเข้าสมาชิก ${created.count} รายการ` });

    revalidatePath("/members");
    return successResult({ count: created.count }, `import สมาชิกสำเร็จ ${created.count} รายการ`);
  } catch {
    return errorResult("ไม่สามารถ import สมาชิกได้");
  }
}

export async function fetchGoogleSheetRowsAction(data: unknown) {
  try {
    await requireWorkspaceRole(OWNER_ADMIN);
    const parsed = googleSheetImportSchema.safeParse(data);
    if (!parsed.success) return errorResult("ลิงก์ Google Sheet ไม่ถูกต้อง", parsed.error.flatten().fieldErrors);

    const csvUrl = toGoogleSheetCsvUrl(parsed.data.url);
    const response = await fetch(csvUrl, { cache: "no-store" });
    if (!response.ok) {
      return errorResult("ไม่สามารถอ่าน Google Sheet ได้ กรุณาตั้งค่าแชร์ให้เข้าถึงได้ หรือ Publish เป็น CSV");
    }

    const csv = await response.text();
    if (/<!doctype html|<html/i.test(csv)) {
      return errorResult("Google Sheet นี้ยังไม่เปิดให้เข้าถึงเป็น CSV กรุณาตั้งค่าแชร์หรือ Publish ก่อน");
    }

    const workbook = XLSX.read(csv, { type: "string", raw: false, cellText: true, cellDates: false });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "", raw: false }).map((row) =>
      Object.fromEntries(Object.entries(row).map(([key, value]) => [normalizeImportText(key), normalizeImportText(value)])),
    );

    if (rows.length === 0) return errorResult("ไม่พบข้อมูลใน Google Sheet");
    return successResult({ rows, headers: Object.keys(rows[0]) }, "ดึงข้อมูลจาก Google Sheet สำเร็จ");
  } catch (error) {
    return errorResult(error instanceof Error ? error.message : "ไม่สามารถดึงข้อมูลจาก Google Sheet ได้");
  }
}
