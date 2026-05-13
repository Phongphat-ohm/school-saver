import type { Member } from "@/generated/prisma/client";

export type MemberFormValues = Pick<Member, "memberCode" | "studentNo" | "fullName" | "classroom" | "phone">;
