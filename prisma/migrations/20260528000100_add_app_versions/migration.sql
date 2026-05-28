-- CreateTable
CREATE TABLE "AppVersion" (
    "id" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "features" TEXT NOT NULL,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppVersion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AppVersion_version_key" ON "AppVersion"("version");

-- CreateIndex
CREATE INDEX "AppVersion_isPublished_createdAt_idx" ON "AppVersion"("isPublished", "createdAt");

-- CreateIndex
CREATE INDEX "AppVersion_createdById_createdAt_idx" ON "AppVersion"("createdById", "createdAt");

-- AddForeignKey
ALTER TABLE "AppVersion" ADD CONSTRAINT "AppVersion_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
