import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { hashPassword } from "../src/lib/password";

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/school_saver?schema=public",
  }),
});

async function main() {
  const admin = await prisma.user.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      username: "admin",
      passwordHash: await hashPassword("admin123"),
      fullName: "ผู้ดูแลระบบ",
      status: "ACTIVE",
    },
  });

  const workspace =
    (await prisma.workspace.findFirst({
      where: { ownerId: admin.id, name: "ห้องของฉัน" },
    })) ??
    (await prisma.workspace.create({
      data: {
        name: "ห้องของฉัน",
        description: "Workspace เริ่มต้นของระบบ",
        ownerId: admin.id,
      },
    }));

  await prisma.workspaceMember.upsert({
    where: { workspaceId_userId: { workspaceId: workspace.id, userId: admin.id } },
    update: { role: "OWNER", status: "ACTIVE" },
    create: {
      workspaceId: workspace.id,
      userId: admin.id,
      role: "OWNER",
      status: "ACTIVE",
    },
  });

  const methods = [
    { name: "เงินสด", type: "CASH" as const },
    { name: "โอนธนาคาร", type: "BANK_TRANSFER" as const },
    { name: "พร้อมเพย์", type: "PROMPTPAY" as const },
  ];

  for (const method of methods) {
    await prisma.paymentMethod.upsert({
      where: { workspaceId_name: { workspaceId: workspace.id, name: method.name } },
      update: {},
      create: {
        workspaceId: workspace.id,
        name: method.name,
        type: method.type,
        status: "ACTIVE",
      },
    });
  }
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
