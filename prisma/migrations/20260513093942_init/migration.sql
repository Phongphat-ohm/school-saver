-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "WorkspaceRole" AS ENUM ('OWNER', 'ADMIN', 'COLLECTOR', 'VIEWER');

-- CreateEnum
CREATE TYPE "WorkspaceMemberStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "MemberStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "FineType" AS ENUM ('NONE', 'DAILY', 'WEEKLY', 'FIXED');

-- CreateEnum
CREATE TYPE "RoundStatus" AS ENUM ('DRAFT', 'OPEN', 'CLOSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "MemberRoundStatus" AS ENUM ('UNPAID', 'PARTIAL', 'PAID', 'LATE_PAID', 'OVERDUE', 'PARTIAL_OVERDUE', 'WAIVED');

-- CreateEnum
CREATE TYPE "PaymentMethodType" AS ENUM ('CASH', 'BANK_TRANSFER', 'PROMPTPAY', 'TRUE_MONEY', 'OTHER');

-- CreateEnum
CREATE TYPE "PaymentMethodStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Workspace" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "ownerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Workspace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkspaceMember" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "WorkspaceRole" NOT NULL,
    "status" "WorkspaceMemberStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkspaceMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Member" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "memberCode" TEXT NOT NULL,
    "studentNo" TEXT,
    "fullName" TEXT NOT NULL,
    "classroom" TEXT,
    "phone" TEXT,
    "status" "MemberStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Member_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CollectionRound" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "targetAmount" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "fineEnabled" BOOLEAN NOT NULL DEFAULT false,
    "fineType" "FineType" NOT NULL DEFAULT 'NONE',
    "fineAmount" INTEGER NOT NULL DEFAULT 0,
    "fineMaxAmount" INTEGER,
    "status" "RoundStatus" NOT NULL DEFAULT 'OPEN',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CollectionRound_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MemberRound" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "roundId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "targetAmount" INTEGER NOT NULL,
    "paidAmount" INTEGER NOT NULL DEFAULT 0,
    "remainingAmount" INTEGER NOT NULL,
    "fineAmount" INTEGER NOT NULL DEFAULT 0,
    "totalRequiredAmount" INTEGER NOT NULL,
    "status" "MemberRoundStatus" NOT NULL DEFAULT 'UNPAID',
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MemberRound_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentTransaction" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "memberRoundId" TEXT NOT NULL,
    "roundId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "paymentMethodId" TEXT NOT NULL,
    "paidAt" TIMESTAMP(3) NOT NULL,
    "collectedById" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentMethod" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "PaymentMethodType" NOT NULL,
    "accountName" TEXT,
    "accountNumber" TEXT,
    "bankName" TEXT,
    "qrImageUrl" TEXT,
    "status" "PaymentMethodStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentMethod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityLog" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "detail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE INDEX "WorkspaceMember_workspaceId_idx" ON "WorkspaceMember"("workspaceId");

-- CreateIndex
CREATE INDEX "WorkspaceMember_userId_idx" ON "WorkspaceMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceMember_workspaceId_userId_key" ON "WorkspaceMember"("workspaceId", "userId");

-- CreateIndex
CREATE INDEX "Member_workspaceId_studentNo_idx" ON "Member"("workspaceId", "studentNo");

-- CreateIndex
CREATE UNIQUE INDEX "Member_workspaceId_memberCode_key" ON "Member"("workspaceId", "memberCode");

-- CreateIndex
CREATE INDEX "CollectionRound_workspaceId_idx" ON "CollectionRound"("workspaceId");

-- CreateIndex
CREATE INDEX "CollectionRound_createdById_idx" ON "CollectionRound"("createdById");

-- CreateIndex
CREATE INDEX "MemberRound_workspaceId_idx" ON "MemberRound"("workspaceId");

-- CreateIndex
CREATE INDEX "MemberRound_roundId_idx" ON "MemberRound"("roundId");

-- CreateIndex
CREATE INDEX "MemberRound_memberId_idx" ON "MemberRound"("memberId");

-- CreateIndex
CREATE UNIQUE INDEX "MemberRound_roundId_memberId_key" ON "MemberRound"("roundId", "memberId");

-- CreateIndex
CREATE INDEX "PaymentTransaction_workspaceId_idx" ON "PaymentTransaction"("workspaceId");

-- CreateIndex
CREATE INDEX "PaymentTransaction_memberRoundId_idx" ON "PaymentTransaction"("memberRoundId");

-- CreateIndex
CREATE INDEX "PaymentTransaction_roundId_idx" ON "PaymentTransaction"("roundId");

-- CreateIndex
CREATE INDEX "PaymentTransaction_memberId_idx" ON "PaymentTransaction"("memberId");

-- CreateIndex
CREATE INDEX "PaymentTransaction_paymentMethodId_idx" ON "PaymentTransaction"("paymentMethodId");

-- CreateIndex
CREATE INDEX "PaymentTransaction_collectedById_idx" ON "PaymentTransaction"("collectedById");

-- CreateIndex
CREATE INDEX "PaymentMethod_workspaceId_idx" ON "PaymentMethod"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentMethod_workspaceId_name_key" ON "PaymentMethod"("workspaceId", "name");

-- CreateIndex
CREATE INDEX "ActivityLog_workspaceId_idx" ON "ActivityLog"("workspaceId");

-- CreateIndex
CREATE INDEX "ActivityLog_userId_idx" ON "ActivityLog"("userId");

-- AddForeignKey
ALTER TABLE "Workspace" ADD CONSTRAINT "Workspace_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceMember" ADD CONSTRAINT "WorkspaceMember_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceMember" ADD CONSTRAINT "WorkspaceMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Member" ADD CONSTRAINT "Member_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionRound" ADD CONSTRAINT "CollectionRound_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionRound" ADD CONSTRAINT "CollectionRound_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberRound" ADD CONSTRAINT "MemberRound_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberRound" ADD CONSTRAINT "MemberRound_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "CollectionRound"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberRound" ADD CONSTRAINT "MemberRound_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentTransaction" ADD CONSTRAINT "PaymentTransaction_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentTransaction" ADD CONSTRAINT "PaymentTransaction_memberRoundId_fkey" FOREIGN KEY ("memberRoundId") REFERENCES "MemberRound"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentTransaction" ADD CONSTRAINT "PaymentTransaction_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "CollectionRound"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentTransaction" ADD CONSTRAINT "PaymentTransaction_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentTransaction" ADD CONSTRAINT "PaymentTransaction_paymentMethodId_fkey" FOREIGN KEY ("paymentMethodId") REFERENCES "PaymentMethod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentTransaction" ADD CONSTRAINT "PaymentTransaction_collectedById_fkey" FOREIGN KEY ("collectedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentMethod" ADD CONSTRAINT "PaymentMethod_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
